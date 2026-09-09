// Imports relativos con extensión, no el alias `~/`: este módulo lo carga
// también el CLI del cron con `node` puro, fuera de Next, y Node no resuelve
// el alias. Node 22 hace type-stripping nativo pero exige la extensión.
import { bucketEvents, type BucketEvent, type BucketMetric } from "../../lib/panel/bucket.ts";
import {
  addDays,
  fromDbDate,
  logicalDate,
  logicalRangeBounds,
  parseLogicalDate,
  rangeOfDays,
  toDbDate,
  todayLogical,
  type LogicalDate,
} from "../../lib/panel/logical-date.ts";
import type { PrismaClient } from "../../../generated/prisma";

/**
 * Tier 1: materializa el agregado diario desde el log de eventos.
 *
 * Dos propiedades que el rollup tiene que cumplir y que son fáciles de perder:
 *
 * **Idempotencia real.** Un rollup que solo hace upsert es idempotente
 * respecto a AGREGAR pero no respecto a QUITAR: si borrás un evento cargado
 * por error y volvés a correrlo, la fila vieja sobrevive con el valor viejo
 * para siempre. Por eso acá se BORRA la ventana y se reescribe desde el log.
 * El log es la fuente de verdad; esta tabla es caché.
 *
 * **Escritura en lote.** Desde el VPS cada query a Supabase tarda ~1 s, así
 * que un upsert por fila serían minutos con una transacción de escritura
 * abierta contra la base que comparte la plataforma de la agencia.
 */

export interface RollupResult {
  from: LogicalDate;
  to: LogicalDate;
  days: number;
  rowsWritten: number;
  eventsRead: number;
}

/** Un mes por transacción: un rebuild largo tiene que poder cortarse y seguir. */
const CHUNK_DAYS = 31;

export async function runRollup(
  db: PrismaClient,
  from: LogicalDate,
  to: LogicalDate,
): Promise<RollupResult> {
  const allDays = rangeOfDays(from, to);

  const [metrics, excluded, systemStart] = await Promise.all([
    db.panelMetric.findMany({
      select: { key: true, scored: true, targetValue: true, createdAt: true, archivedAt: true },
    }),
    db.panelExcludedDay.findMany({
      where: { logicalDate: { gte: toDbDate(from), lte: toDbDate(to) } },
      select: { logicalDate: true },
    }),
    systemStartDay(db),
  ]);
  const openDay = todayLogical();

  const bucketMetrics: BucketMetric[] = metrics.map((m) => ({
    key: m.key,
    scored: m.scored,
    targetValue: m.targetValue,
    // Una métrica creada ayer no puede generar fallas de hace un mes.
    activeFrom: logicalDate(m.createdAt),
    activeTo: m.archivedAt ? logicalDate(m.archivedAt) : null,
  }));
  const excludedDays = new Set(excluded.map((e) => fromDbDate(e.logicalDate) as string));

  let rowsWritten = 0;
  let eventsRead = 0;

  for (let i = 0; i < allDays.length; i += CHUNK_DAYS) {
    const chunk = allDays.slice(i, i + CHUNK_DAYS);
    const chunkFrom = chunk[0]!;
    const chunkTo = chunk[chunk.length - 1]!;
    // La ventana de lectura se ensancha un día a cada lado porque la
    // atribución no siempre coincide con `occurredAt`: el sueño de hoy
    // empieza anoche (23:00 cae en el día lógico anterior) pero pertenece a
    // hoy vía `meta.logicalDate`. Sin este margen, el rollup de un solo día
    // no encuentra su propio sueño. `bucketEvents` descarta después lo que
    // caiga fuera del rango pedido.
    const { startUtc, endUtc } = logicalRangeBounds(addDays(chunkFrom, -1), addDays(chunkTo, 1));

    const events = await db.panelEvent.findMany({
      where: {
        occurredAt: { gte: startUtc, lt: endUtc },
        subjectId: { not: null },
      },
      select: {
        subjectId: true,
        type: true,
        externalId: true,
        occurredAt: true,
        value: true,
        meta: true,
      },
    });
    eventsRead += events.length;

    const bucketed: BucketEvent[] = events.map(dayOfEvent);

    const rows = bucketEvents(bucketed, bucketMetrics, chunk, {
      excludedDays,
      openDay,
      systemStart,
    });

    // Borrar y reescribir: así una fila cuyo evento ya no existe desaparece.
    await db.$transaction([
      db.panelDailyRollup.deleteMany({
        where: { logicalDate: { gte: toDbDate(chunkFrom), lte: toDbDate(chunkTo) } },
      }),
      db.panelDailyRollup.createMany({
        data: rows.map((r) => ({
          subjectId: r.subjectId,
          logicalDate: toDbDate(r.logicalDate),
          count: r.count,
          total: r.total,
          target: r.target,
          hit: r.hit,
        })),
      }),
    ]);
    rowsWritten += rows.length;
  }

  return { from, to, days: allDays.length, rowsWritten, eventsRead };
}

/**
 * Corre el rollup dejando registro en `JobRun`.
 *
 * Sin esta bitácora no hay forma de distinguir "el cron dejó de andar" de
 * "esa semana no registré nada": las dos cosas se ven como una tabla sin
 * filas nuevas.
 */
export async function runRollupJob(
  db: PrismaClient,
  from: LogicalDate,
  to: LogicalDate,
): Promise<RollupResult> {
  const run = await db.panelJobRun.create({
    data: { job: "rollup", windowFrom: from, windowTo: to },
    select: { id: true },
  });
  try {
    const result = await runRollup(db, from, to);
    await db.panelJobRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), ok: true, rowsWritten: result.rowsWritten },
    });
    return result;
  } catch (err) {
    await db.panelJobRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        ok: false,
        error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
      },
    });
    throw err;
  }
}

/**
 * Hasta qué día ya hay rollup. Se lee de `DailyRollup`, NO de `JobRun`: el
 * estado del scheduler no es fuente de verdad sobre qué datos existen, y un
 * backfill manual de un mes viejo dejaría el último run en hoy y anularía el
 * ensanchamiento automático de la ventana.
 */
export async function lastRolledDay(db: PrismaClient): Promise<LogicalDate | null> {
  const last = await db.panelDailyRollup.findFirst({
    orderBy: { logicalDate: "desc" },
    select: { logicalDate: true },
  });
  return last ? fromDbDate(last.logicalDate) : null;
}

/**
 * A qué día lógico pertenece un evento.
 *
 * Por defecto lo decide `occurredAt`, que es lo correcto para casi todo. La
 * excepción es el sueño: su `occurredAt` es el instante en que te dormiste
 * (dato crudo que la spec §5.1 pide conservar), pero la ventana de sueño va
 * de las 18:00 del día anterior a las 14:00 del día del check-in, así que
 * cruza el corte de las 5 AM. Acostarse a las 23:00 cae en el día anterior y
 * acostarse a las 6:00 cae en el mismo día: la atribución dependería de a qué
 * hora te acostaste, y dos noches podrían caer en el mismo día y sumarse en
 * una noche de 15 horas.
 *
 * Por eso los eventos cuya ventana no coincide con el día lógico llevan
 * `meta.logicalDate` con el día del check-in, y acá se prefiere ese.
 */
export function dayOfEvent(e: {
  subjectId: string | null;
  type: string;
  externalId?: string | null;
  occurredAt: Date;
  value: number | null;
  meta?: unknown;
}): BucketEvent {
  return {
    subjectId: e.subjectId!,
    type: e.type,
    logicalDate: logicalDayOf(e),
    value: e.value,
  };
}

/**
 * El día lógico de un evento, en orden de confianza decreciente.
 *
 * El día lógico se decide acá y en un solo lugar. Nunca con `AT TIME ZONE` en
 * SQL: sería una segunda implementación del corte.
 *
 * 1. `meta.logicalDate`, cuando el evento declara a qué día pertenece.
 * 2. El día que lleva el `externalId` de la cabecera del check-in. Esa fila
 *    tiene `occurredAt = now`, así que guardar el día de ayer a las 10 de la
 *    mañana la fecharía hoy.
 * 3. `occurredAt`, que es lo correcto para todo lo demás.
 */
export function logicalDayOf(e: {
  externalId?: string | null;
  occurredAt: Date;
  meta?: unknown;
}): LogicalDate {
  const meta = e.meta as { logicalDate?: unknown } | null;
  if (typeof meta?.logicalDate === "string") return parseLogicalDate(meta.logicalDate);
  const header = /^checkin:(\d{4}-\d{2}-\d{2})$/.exec(e.externalId ?? "");
  if (header) return parseLogicalDate(header[1]!);
  return logicalDate(e.occurredAt);
}

/**
 * Primer día en que el sistema estuvo realmente en uso, leído de los datos.
 *
 * Se usa el primer evento y no el `createdAt` de las métricas porque eso
 * último es cuándo se sembraron las definiciones: sembrar hoy y prender el
 * panel dentro de tres semanas haría que `rollup --all` fabricara tres
 * semanas de días fallados sobre un panel que devolvía 404.
 *
 * El día se resuelve con `logicalDayOf` y NO con `occurredAt` crudo. El evento
 * más viejo es casi siempre el sueño, cuyo `occurredAt` es el instante en que
 * te dormiste: la noche ANTERIOR al día que alimenta. Fechar el arranque ahí
 * inventa un día previo a que el sistema existiera, y ese día no tiene forma
 * de dejar de estar fallado: cuenta para siempre como check-in perdido y
 * `rollup --all` le materializa una fila `hit:false` por hábito.
 */
export async function systemStartDay(db: PrismaClient): Promise<LogicalDate | null> {
  const first = await db.panelEvent.findFirst({
    orderBy: { occurredAt: "asc" },
    select: { externalId: true, occurredAt: true, meta: true },
  });
  return first ? logicalDayOf(first) : null;
}
