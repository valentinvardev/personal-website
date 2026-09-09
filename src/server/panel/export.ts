import { fromDbDate } from "../../lib/panel/logical-date.ts";
import type { PrismaClient } from "../../../generated/prisma";

/**
 * Exportación completa del panel a JSON.
 *
 * El valor de este sistema no está en ningún número suelto: está en la SERIE
 * HISTÓRICA, que no se puede reconstruir. Por eso el export existe desde el
 * v1 y no "más adelante".
 *
 * El JSON separa lo capturado de lo derivado a propósito: quien restaure
 * tiene que saber que `dailyRollup` se tira y se recomputa con
 * `panel-job rollup --all`, y que lo único irremplazable es `event`.
 */

/** Por encima de esto el export por HTTP se niega y manda al CLI. */
export const HTTP_ROW_LIMIT = 50_000;

export interface PanelExport {
  meta: {
    exportedAt: string;
    formatVersion: number;
    timezone: string;
    cutoffHour: number;
    counts: Record<string, number>;
    note: string;
  };
  /** Capturado. Irremplazable. */
  source: {
    metric: unknown[];
    event: unknown[];
    excludedDay: unknown[];
  };
  /** Derivado. Se puede tirar y recomputar desde `source`. */
  derived: {
    dailyRollup: unknown[];
    jobRun: unknown[];
  };
}

export async function countExportRows(db: PrismaClient): Promise<number> {
  const [metric, event, excluded, rollup] = await Promise.all([
    db.panelMetric.count(),
    db.panelEvent.count(),
    db.panelExcludedDay.count(),
    db.panelDailyRollup.count(),
  ]);
  return metric + event + excluded + rollup;
}

export async function buildExport(db: PrismaClient): Promise<PanelExport> {
  const [metrics, events, excluded, rollups, jobs] = await Promise.all([
    db.panelMetric.findMany({ orderBy: { key: "asc" } }),
    db.panelEvent.findMany({ orderBy: { occurredAt: "asc" } }),
    db.panelExcludedDay.findMany({ orderBy: { logicalDate: "asc" } }),
    db.panelDailyRollup.findMany({ orderBy: [{ logicalDate: "asc" }, { subjectId: "asc" }] }),
    db.panelJobRun.findMany({ orderBy: { startedAt: "desc" }, take: 200 }),
  ]);

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      formatVersion: 1,
      timezone: "America/Argentina/Buenos_Aires",
      cutoffHour: 5,
      counts: {
        metric: metrics.length,
        event: events.length,
        excludedDay: excluded.length,
        dailyRollup: rollups.length,
        jobRun: jobs.length,
      },
      note:
        "source es lo capturado y es irremplazable. derived se puede borrar y " +
        "recomputar con: node --env-file=.env scripts/panel-job.ts rollup --all",
    },
    source: {
      metric: metrics,
      // Las fechas se serializan solas a ISO en JSON.stringify; los días
      // lógicos se pasan a texto para que el archivo se lea sin ambigüedad.
      event: events,
      excludedDay: excluded.map((e) => ({ ...e, logicalDate: fromDbDate(e.logicalDate) })),
    },
    derived: {
      dailyRollup: rollups.map((r) => ({ ...r, logicalDate: fromDbDate(r.logicalDate) })),
      jobRun: jobs,
    },
  };
}
