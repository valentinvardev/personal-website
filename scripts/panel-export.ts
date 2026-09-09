/**
 * Backup del panel a un archivo JSON. Corre con `node`, fuera de Next.
 *
 *   node --env-file=.env scripts/panel-export.ts
 *   node --env-file=.env scripts/panel-export.ts --out /ruta/backups
 *
 * Éste es el backup de verdad, no el endpoint HTTP: un backup que depende de
 * que la web esté levantada no es un backup. Se puede poner en el mismo
 * crontab que el rollup.
 *
 * Escribe primero a un archivo temporal y después renombra: si el proceso se
 * corta a mitad, no queda un JSON truncado con nombre de backup bueno.
 */

import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "../generated/prisma/index.js";
import { buildExport } from "../src/server/panel/export.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("panel-export: falta DIRECT_URL. Corré con: node --env-file=.env");
  process.exit(1);
}

const outDir = arg("out") ?? fileURLToPath(new URL("../backups/", import.meta.url));
mkdirSync(outDir, { recursive: true });

const withLimit = url.includes("?") ? `${url}&connection_limit=2` : `${url}?connection_limit=2`;
const db = new PrismaClient({ datasources: { db: { url: withLimit } }, log: ["error"] });

try {
  const data = await buildExport(db);
  const stamp = data.meta.exportedAt.replace(/[:.]/g, "-");
  const final = join(outDir, `panel-${stamp}.json`);
  const tmp = `${final}.part`;

  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, final);

  const counts = Object.entries(data.meta.counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.log(`panel-export: ${final}`);
  console.log(`  ${counts}`);
} catch (err) {
  console.error("panel-export: FALLÓ");
  console.error(err instanceof Error ? err.stack : err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
