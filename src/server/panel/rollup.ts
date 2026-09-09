// Imports relativos con extensión, no el alias `~/`: este módulo lo carga
// también el CLI del cron con `node` puro, fuera de Next, y Node no resuelve
// el alias. Node 22 hace type-stripping nativo pero exige la extensión.
import { bucketEvents, type BucketEvent, type BucketMetric } from "../../lib/panel/bucket.ts";
import {
  fromDbDate,
  logicalDate,
  logicalRangeBounds,
  rangeOfDays,
  toDbDate,
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

  const [metrics, excluded] = await Promise.all([
    db.panelMetric.findMany({
      select: { key: true, scored: true, targetValue: true, createdAt: true, archivedAt: true },
    }),
    db.panelExcludedDay.findMany({
      where: { logicalDate: { gte: toDbDate(from), lte: toDbDate(to) } },
      select: { logicalDate: true },
    }),
  ]);

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
    const { startUtc, endUtc } = logicalRangeBounds(chunkFrom, chunkTo);

    const events = await db.panelEvent.findMany({
      where: {
        occurredAt: { gte: startUtc, lt: endUtc },
        subjectId: { not: null },
      },
      select: { subjectId: true, type: true, occurredAt: true, value: true },
    });
    eventsRead += events.length;

    const bucketed: BucketEvent[] = events.map((e) => ({
      subjectId: e.subjectId!,
      type: e.type,
      // El día lógico se decide acá y en un solo lugar. Nunca con
      // `AT TIME ZONE` en SQL: sería una segunda implementación del corte.
      logicalDate: logicalDate(e.occurredAt),
      value: e.value,
    }));

    const rows = bucketEvents(bucketed, bucketMetrics, chunk, excludedDays);

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
