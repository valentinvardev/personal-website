import { bucketEvents, type BucketEvent, type BucketMetric } from "../../lib/panel/bucket.ts";
import {
  addDays,
  diffDays,
  fromDbDate,
  logicalDate,
  logicalDayBounds,
  logicalRangeBounds,
  rangeOfDays,
  toDbDate,
  todayLogical,
  type LogicalDate,
} from "../../lib/panel/logical-date.ts";
import { adherence, completeness, type MetricResult } from "../../lib/panel/metrics.ts";
import { dayOfEvent, lastRolledDay, systemStartDay } from "./rollup.ts";
import type { PrismaClient } from "../../../generated/prisma";

/**
 * Los datos del dashboard (tier 2). Se computan on demand: son ventanas de
 * 28 a 365 filas, no hace falta persistir nada.
 *
 * Dos decisiones que sostienen la honestidad de los números:
 *
 * 1. **El día de HOY no se lee del rollup, se calcula al vuelo** desde los
 *    eventos. Si dependiera del cron, marcar un hábito a las 10:00 no se
 *    vería hasta las 05:30 del día siguiente, y el bucle de marcar y ver es
 *    el producto entero.
 *
 * 2. **Toda métrica viaja con su `n`.** Un porcentaje sin tamaño de muestra
 *    no se puede auditar, y con `n` chico la vista imprime un guion en vez
 *    de un número convincente y falso.
 */

export const WINDOW_DAYS = 28;
export const HEATMAP_DAYS = 365;

export interface HabitCard {
  key: string;
  name: string;
  unit: string;
  target: number | null;
  adherence: MetricResult;
  /** 28 días: 1 cumplido, 0 no cumplido, null no evaluable. */
  series: (number | null)[];
}

export interface CheckinCard {
  key: string;
  name: string;
  unit: string;
  series: (number | null)[];
  /** Dominio FIJO: sin esto, una serie que oscila entre 3 y 4 se dibuja
   *  igual que una que va de 1 a 5. */
  domain: [number, number];
}

export interface HeatDay {
  date: LogicalDate;
  /** Adherencia del día, o null si no había nada evaluable. */
  value: number | null;
  evaluable: number;
}

export interface Freshness {
  lastRunAt: Date | null;
  ok: boolean | null;
  staleDays: number | null;
  /**
   * Días cerrados que el rollup todavía no consolidó.
   *
   * Es la única señal que no depende de que el job haya llegado a arrancar. El
   * 2026-09-09 el cron del VPS moría en `ERR_UNKNOWN_FILE_EXTENSION` porque la
   * máquina tenía Node 20 y los CLI son TypeScript: el proceso se caía ANTES de
   * crear la fila en `JobRun`, así que la bitácora que existe justo para
   * detectar "el cron dejó de andar" no veía nada, y `lastRunAt` en null se
   * leía igual que un panel recién estrenado.
   */
  pendingDays: number;
}

export interface Overview {
  today: LogicalDate;
  freshness: Freshness;
  adherence28: MetricResult;
  completeness28: MetricResult;
  habits: HabitCard[];
  checkins: CheckinCard[];
  heatmap: HeatDay[];
}

/**
 * Cuántos días cerrados le faltan al rollup.
 *
 * Cerrado quiere decir "hasta ayer": el día en curso se calcula en vivo y no
 * es tarea del cron. Los días excluidos no cuentan, porque para ellos la
 * ausencia de filas es el resultado correcto.
 *
 * Se compara contra `DailyRollup` y no contra `JobRun` por la misma razón que
 * `lastRolledDay`: el estado del scheduler no es fuente de verdad sobre qué
 * datos existen. Un job que arrancó, falló y dejó su fila diría "corrió"; uno
 * que nunca llegó a ejecutarse no diría nada. Los datos que faltan se ven en
 * los dos casos.
 */
export function pendingRollupDays(
  today: LogicalDate,
  systemStart: LogicalDate | null,
  lastRolled: LogicalDate | null,
  excludedDays: ReadonlySet<string>,
): number {
  if (!systemStart) return 0; // sin un solo evento no hay nada que consolidar
  const yesterday = addDays(today, -1);
  if (systemStart > yesterday) return 0; // el sistema arrancó hoy
  const from = lastRolled && lastRolled >= systemStart ? addDays(lastRolled, 1) : systemStart;
  if (from > yesterday) return 0;
  return rangeOfDays(from, yesterday).filter((d) => !excludedDays.has(d)).length;
}

const DOMAINS: Record<string, [number, number]> = {
  energy: [1, 4],
  mood: [1, 5],
  "sleep.duration": [240, 600], // 4 a 10 horas, en minutos
};

export async function buildOverview(db: PrismaClient): Promise<Overview> {
  const today = todayLogical();
  const windowFrom = addDays(today, -(WINDOW_DAYS - 1));
  const heatFrom = addDays(today, -(HEATMAP_DAYS - 1));

  // Un día a cada lado: el sueño de hoy empieza anoche (su occurredAt cae en
  // el día lógico anterior) pero pertenece a hoy vía meta.logicalDate.
  // bucketEvents descarta después lo que no sea de hoy.
  const todayBounds = logicalRangeBounds(addDays(today, -1), addDays(today, 1));
  const checkinBounds = logicalRangeBounds(windowFrom, today);

  const [metrics, rollups, todayEvents, checkinHeaders, lastRun, excluded, systemStart, lastRolled] = await Promise.all([
    db.panelMetric.findMany({
      where: { archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      select: {
        key: true,
        name: true,
        kind: true,
        unit: true,
        scored: true,
        targetValue: true,
        createdAt: true,
        archivedAt: true,
      },
    }),
    db.panelDailyRollup.findMany({
      where: { logicalDate: { gte: toDbDate(heatFrom), lte: toDbDate(today) } },
      select: { subjectId: true, logicalDate: true, total: true, hit: true },
    }),
    // Hoy se calcula al vuelo: nunca depende de que el cron haya corrido.
    db.panelEvent.findMany({
      where: {
        occurredAt: { gte: todayBounds.startUtc, lt: todayBounds.endUtc },
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
    }),
    db.panelEvent.findMany({
      where: {
        type: "checkin.submitted",
        occurredAt: { gte: checkinBounds.startUtc, lt: checkinBounds.endUtc },
      },
      select: { externalId: true },
    }),
    db.panelJobRun.findFirst({
      where: { job: "rollup", finishedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      select: { finishedAt: true, ok: true },
    }),
    db.panelExcludedDay.findMany({
      where: { logicalDate: { gte: toDbDate(heatFrom), lte: toDbDate(today) } },
      select: { logicalDate: true },
    }),
    systemStartDay(db),
    lastRolledDay(db),
  ]);

  const excludedDays = new Set(excluded.map((e) => fromDbDate(e.logicalDate) as string));

  /** (subjectId | día) -> { total, hit } */
  const cell = new Map<string, { total: number | null; hit: boolean | null }>();
  for (const r of rollups) {
    cell.set(`${r.subjectId}|${fromDbDate(r.logicalDate)}`, { total: r.total, hit: r.hit });
  }

  // Hoy se recalcula y pisa lo que hubiera dejado el cron.
  const bucketMetrics: BucketMetric[] = metrics.map((m) => ({
    key: m.key,
    scored: m.scored,
    targetValue: m.targetValue,
    activeFrom: logicalDate(m.createdAt),
    activeTo: m.archivedAt ? logicalDate(m.archivedAt) : null,
  }));
  const bucketed: BucketEvent[] = todayEvents.map(dayOfEvent);
  // `openDay: today` para que el día en curso no se materialice como fallado:
  // a las 05:01 no "fallaste" los hábitos que pensabas hacer a la tarde.
  for (const row of bucketEvents(bucketed, bucketMetrics, [today], {
    excludedDays,
    openDay: today,
  })) {
    cell.set(`${row.subjectId}|${row.logicalDate}`, { total: row.total, hit: row.hit });
  }

  const windowDays = rangeOfDays(windowFrom, today);
  const heatDays = rangeOfDays(heatFrom, today);
  const scored = metrics.filter((m) => m.scored);

  // --- Nivel 1 -------------------------------------------------------------
  const allHits: (boolean | null)[] = [];
  for (const day of windowDays) {
    if (excludedDays.has(day)) continue;
    for (const m of scored) {
      allHits.push(cell.get(`metric:${m.key}|${day}`)?.hit ?? null);
    }
  }

  // El día del check-in sale del externalId ("checkin:<día>"), no de cuándo
  // se apretó Guardar. Con occurredAt, un check-in guardado a las 05:03 desde
  // una pestaña abierta desde antes contaría para el día equivocado, y esta
  // es justo la métrica que la spec §4 usa como umbral de confianza.
  const submittedDays = new Set(
    checkinHeaders
      .map((e) => e.externalId.slice("checkin:".length))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
  );
  // La completitud se mide desde que el sistema existe y sin contar el día en
  // curso. Con la ventana fija de 28 días, el primer check-in imprimiría
  // "4% · n 28" al lado de una adherencia con n 3: la misma pantalla
  // demostrando que una métrica conoce la fecha de nacimiento del sistema y
  // la otra no, y corrompiendo el `n` que es el mecanismo de auditoría.
  const completenessDays = windowDays
    .filter((d) => d !== today && !excludedDays.has(d))
    .filter((d) => !systemStart || d >= systemStart)
    .map((d) => submittedDays.has(d));

  // --- Nivel 2 -------------------------------------------------------------
  const habits: HabitCard[] = scored.map((m) => {
    const hits = windowDays.map((d) =>
      excludedDays.has(d) ? null : (cell.get(`metric:${m.key}|${d}`)?.hit ?? null),
    );
    return {
      key: m.key,
      name: m.name,
      unit: m.unit,
      target: m.targetValue,
      adherence: adherence(hits),
      series: hits.map((h) => (h === null ? null : h ? 1 : 0)),
    };
  });

  const checkins: CheckinCard[] = metrics
    .filter((m) => !m.scored)
    .map((m) => ({
      key: m.key,
      name: m.name,
      unit: m.unit,
      series: windowDays.map((d) => cell.get(`metric:${m.key}|${d}`)?.total ?? null),
      domain: DOMAINS[m.key] ?? [0, 1],
    }));

  // --- Heatmap -------------------------------------------------------------
  const heatmap: HeatDay[] = heatDays.map((date) => {
    if (excludedDays.has(date)) return { date, value: null, evaluable: 0 };
    let hit = 0;
    let evaluable = 0;
    for (const m of scored) {
      const h = cell.get(`metric:${m.key}|${date}`)?.hit;
      if (h === undefined || h === null) continue;
      evaluable += 1;
      if (h) hit += 1;
    }
    return { date, value: evaluable === 0 ? null : hit / evaluable, evaluable };
  });

  return {
    today,
    freshness: {
      lastRunAt: lastRun?.finishedAt ?? null,
      ok: lastRun?.ok ?? null,
      // Cuántos días hace que no corre. "Rollup: ok" sin fecha sigue diciendo
      // ok el viernes aunque el cron haya muerto el martes.
      staleDays: lastRun?.finishedAt ? diffDays(logicalDate(lastRun.finishedAt), today) : null,
      pendingDays: pendingRollupDays(today, systemStart, lastRolled, excludedDays),
    },
    adherence28: adherence(allHits),
    completeness28: completeness(completenessDays),
    habits,
    checkins,
    heatmap,
  };
}
