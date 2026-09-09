/**
 * Restaura un backup del panel. Corre con `node`, fuera de Next.
 *
 *   node --env-file=.env scripts/panel-restore.ts backups/panel-....json --dry-run
 *   node --env-file=.env scripts/panel-restore.ts backups/panel-....json --confirm
 *
 * Existe en el mismo commit que el export a propósito: **un backup nunca
 * restaurado es un archivo, no un backup**. La única forma de saber que el
 * formato sirve es probar el camino de vuelta.
 *
 * Solo restaura `source`, que es lo irremplazable. Los rollups se recomputan
 * después con `panel-job rollup --all`: son caché y volver a calcularlos es
 * más seguro que restaurar un derivado que puede venir de otra versión de la
 * fórmula.
 *
 * Sin `--confirm` no escribe nada.
 */

import { readFileSync } from "node:fs";

import { PrismaClient } from "../generated/prisma/index.js";
import { parseLogicalDate, toDbDate } from "../src/lib/panel/logical-date.ts";

const file = process.argv[2];
const dryRun = !process.argv.includes("--confirm");

if (!file || file.startsWith("--")) {
  console.error("uso: panel-restore.ts <archivo.json> [--confirm]");
  process.exit(1);
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("panel-restore: falta DIRECT_URL. Corré con: node --env-file=.env");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(file, "utf8"));
if (raw?.meta?.formatVersion !== 1) {
  console.error(`panel-restore: formatVersion desconocido: ${raw?.meta?.formatVersion}`);
  process.exit(1);
}

const metrics = raw.source?.metric ?? [];
const events = raw.source?.event ?? [];
const excluded = raw.source?.excludedDay ?? [];

console.log(`panel-restore: ${file}`);
console.log(`  exportado el ${raw.meta.exportedAt}`);
console.log(`  a restaurar: ${metrics.length} métricas, ${events.length} eventos, ${excluded.length} días excluidos`);
console.log(`  los rollups NO se restauran: se recomputan con panel-job rollup --all`);

if (dryRun) {
  console.log("\n  DRY RUN: no se escribió nada. Agregá --confirm para aplicar.");
  process.exit(0);
}

const withLimit = url.includes("?") ? `${url}&connection_limit=2` : `${url}?connection_limit=2`;
const db = new PrismaClient({ datasources: { db: { url: withLimit } }, log: ["error"] });

try {
  const before = {
    metric: await db.panelMetric.count(),
    event: await db.panelEvent.count(),
  };
  console.log(`\n  la base tiene ahora: ${before.metric} métricas, ${before.event} eventos`);

  // skipDuplicates: restaurar sobre una base con datos no pisa lo que ya está.
  const m = await db.panelMetric.createMany({
    data: metrics.map((x: Record<string, unknown>) => ({
      ...x,
      createdAt: new Date(x.createdAt as string),
      archivedAt: x.archivedAt ? new Date(x.archivedAt as string) : null,
    })),
    skipDuplicates: true,
  });
  const e = await db.panelEvent.createMany({
    data: events.map((x: Record<string, unknown>) => ({
      ...x,
      occurredAt: new Date(x.occurredAt as string),
      recordedAt: new Date(x.recordedAt as string),
    })),
    skipDuplicates: true,
  });
  const x = await db.panelExcludedDay.createMany({
    data: excluded.map((d: Record<string, unknown>) => ({
      logicalDate: toDbDate(parseLogicalDate(d.logicalDate as string)),
      reason: d.reason as string,
      createdAt: new Date(d.createdAt as string),
    })),
    skipDuplicates: true,
  });

  console.log(`  insertados: ${m.count} métricas, ${e.count} eventos, ${x.count} días excluidos`);
  console.log(`\n  Ahora recomputá los agregados:`);
  // process.execPath: ver la nota en panel-reset.ts. Un "node" pelado acá es un
  // comando que falla en la misma máquina que lo imprime.
  console.log(`    "${process.execPath}" --env-file=.env scripts/panel-job.ts rollup --all`);
} catch (err) {
  console.error("panel-restore: FALLÓ");
  console.error(err instanceof Error ? err.stack : err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
