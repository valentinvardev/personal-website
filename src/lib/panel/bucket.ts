/**
 * Tier 1: convierte el log crudo de eventos en filas diarias.
 *
 * Función PURA a propósito: acá viven todas las reglas de qué cuenta y qué
 * no, y se testean sin base de datos ni fechas reales. El caller ya resolvió
 * a qué día lógico pertenece cada evento con `logicalDate()`; acá no se
 * vuelve a decidir eso.
 *
 * Las cuatro reglas que definen el sistema:
 *
 * 1. **Una métrica puntuada que estaba activa y no tiene evento genera fila
 *    con `hit: false`.** La definición existía y el día pasó: la ausencia SÍ
 *    informa. Sin esta fila, la adherencia sería siempre 100% (solo contaría
 *    los días que cumpliste).
 *
 * 2. **Un sujeto no puntuado sin evento NO genera fila.** Que no hayas
 *    registrado el ánimo no dice nada sobre tu ánimo. Ausencia distinta de
 *    cero (spec §5.3).
 *
 * 3. **Un día excluido (enfermedad, viaje) no genera ninguna fila.** Sale del
 *    DENOMINADOR, no del numerador: dos semanas de vacaciones no pueden
 *    destruir la adherencia.
 *
 * 4. **El acumulador distingue por `type`.** Si un mismo sujeto recibe
 *    eventos de tipos distintos en un día, el total no se suma: sumar
 *    "commits" con "minutos" en el mismo Float produce un número sin
 *    significado que además queda materializado en el histórico.
 */

import type { LogicalDate } from "./logical-date.ts";

export interface BucketEvent {
  subjectId: string;
  type: string;
  /** Día lógico ya resuelto por el caller. */
  logicalDate: LogicalDate;
  value: number | null;
}

export interface BucketMetric {
  key: string;
  scored: boolean;
  targetValue: number | null;
  /** Primer día en que la definición existía. Antes de eso no se evalúa. */
  activeFrom: LogicalDate;
  /** Día en que se archivó, si se archivó. */
  activeTo: LogicalDate | null;
}

export interface RollupRow {
  subjectId: string;
  logicalDate: LogicalDate;
  count: number;
  total: number | null;
  target: number | null;
  hit: boolean | null;
}

export interface BucketOptions {
  excludedDays?: ReadonlySet<string>;
  /**
   * El día en curso. NO recibe filas de ausencia: todavía no terminó, así que
   * "no lo hiciste" es falso, es "todavía no". Sin esto, a las 05:01 el
   * dashboard te muestra 0% en rojo por hábitos que pensabas hacer a la
   * tarde, y el heatmap pinta hoy como "nada cumplido" en vez de "sin datos".
   */
  openDay?: LogicalDate | null;
  /**
   * Primer día en que el sistema estuvo realmente en uso. Antes de eso no se
   * evalúa nada, aunque las definiciones ya existieran.
   *
   * Hace falta porque `createdAt` de la métrica es cuándo se sembró la
   * definición, no cuándo empezaste a usar el panel: sembrar hoy y prender el
   * panel dentro de tres semanas generaría, con `rollup --all`, tres semanas
   * de días fallados sobre un panel que devolvía 404. Y esas filas son
   * pegajosas: un rebuild posterior con la ventana correcta no las toca.
   */
  systemStart?: LogicalDate | null;
}

export function bucketEvents(
  events: readonly BucketEvent[],
  metrics: readonly BucketMetric[],
  days: readonly LogicalDate[],
  opts: BucketOptions = {},
): RollupRow[] {
  const excludedDays = opts.excludedDays ?? new Set<string>();
  const activeDays = days.filter((d) => !excludedDays.has(d));
  const dayIndex = new Set<string>(activeDays);

  /** (subjectId | day) -> acumulador, con los tipos vistos. */
  const acc = new Map<
    string,
    { count: number; sum: number; withValue: number; types: Set<string> }
  >();

  for (const e of events) {
    if (!dayIndex.has(e.logicalDate)) continue; // fuera de rango o día excluido
    const key = `${e.subjectId}|${e.logicalDate}`;
    let a = acc.get(key);
    if (!a) {
      a = { count: 0, sum: 0, withValue: 0, types: new Set() };
      acc.set(key, a);
    }
    a.count += 1;
    a.types.add(e.type);
    if (e.value !== null && Number.isFinite(e.value)) {
      a.sum += e.value;
      a.withValue += 1;
    }
  }

  const rows: RollupRow[] = [];

  // --- Filas a partir de eventos ------------------------------------------
  for (const [key, a] of acc) {
    const sep = key.lastIndexOf("|");
    const subjectId = key.slice(0, sep);
    const logicalDate = key.slice(sep + 1) as LogicalDate;
    const metric = metricFor(metrics, subjectId);

    // Regla 4: tipos mezclados en el mismo sujeto y día -> el total no es
    // sumable. Se registra el conteo y se deja el total en null en vez de
    // inventar un número.
    //
    // Y lo mismo con más de un evento de un sujeto de check-in: dos noches de
    // sueño en el mismo día no son una noche de 15 horas. Los hábitos SÍ se
    // suman (tres sesiones de lectura de 20 minutos son una hora).
    const ambiguo = a.types.size > 1 || (metric?.scored === false && a.count > 1);
    const total = ambiguo ? null : a.withValue > 0 ? a.sum : null;

    const scored = metric?.scored ?? false;
    const target = scored ? (metric?.targetValue ?? null) : null;
    let hit: boolean | null = null;
    if (scored) {
      // Con cantidad conocida se compara contra el target; sin cantidad, el
      // evento existe, así que se cumplió (lo marcaste).
      hit = total !== null && target !== null ? total >= target : true;
    }

    rows.push({ subjectId, logicalDate, count: a.count, total, target, hit });
  }

  // --- Filas de ausencia, solo para métricas puntuadas ---------------------
  for (const m of metrics) {
    if (!m.scored) continue; // regla 2
    const subjectId = `metric:${m.key}`;
    for (const day of activeDays) {
      if (day === opts.openDay) continue; // el día no terminó: no se juzga
      if (opts.systemStart && day < opts.systemStart) continue; // panel apagado
      if (day < m.activeFrom) continue; // la definición todavía no existía
      if (m.activeTo !== null && day > m.activeTo) continue; // ya archivada
      if (acc.has(`${subjectId}|${day}`)) continue; // ya tiene fila
      rows.push({
        subjectId,
        logicalDate: day,
        count: 0,
        total: 0,
        target: m.targetValue,
        hit: false, // regla 1
      });
    }
  }

  rows.sort((a, b) =>
    a.logicalDate === b.logicalDate
      ? a.subjectId.localeCompare(b.subjectId)
      : a.logicalDate.localeCompare(b.logicalDate),
  );
  return rows;
}

function metricFor(
  metrics: readonly BucketMetric[],
  subjectId: string,
): BucketMetric | undefined {
  if (!subjectId.startsWith("metric:")) return undefined;
  const key = subjectId.slice("metric:".length);
  return metrics.find((m) => m.key === key);
}
