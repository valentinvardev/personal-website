/**
 * Jobs del panel de medición. Se corre con `node`, fuera de Next.
 *
 *   node --env-file=.env scripts/panel-job.ts rollup --last 3
 *   node --env-file=.env scripts/panel-job.ts rollup --from 2026-08-01 --to 2026-08-31
 *   node --env-file=.env scripts/panel-job.ts rollup --all
 *   node --env-file=.env scripts/panel-job.ts rollup --catchup     (lo que usa el cron)
 *
 * Por qué un CLI y no un endpoint HTTP de cron:
 *
 *  - No hay Vercel Cron (el deploy es un VPS con pm2) y `pg_cron` no está
 *    instalado, y habilitarlo sería tocar una base compartida con la
 *    plataforma de la agencia.
 *  - Un endpoint HTTP para esto es superficie de ataque nueva y un secreto
 *    más que rotar, a cambio de nada.
 *  - Y lo más importante: corre en OTRO PROCESO. El proceso de pm2 que sirve
 *    el sitio público tiene `max_memory_restart: 512M`; un rebuild grande
 *    ahí adentro reiniciaría valentinvarela.cloud. Acá tiene su propio pool
 *    de 2 conexiones y si explota, explota solo.
 *
 * El mismo comando es el del cron y el del rebuild manual: una sola ruta de
 * código que se ejercita todos los días.
 */

import { PrismaClient } from "../generated/prisma/index.js";
import {
  addDays,
  diffDays,
  parseLogicalDate,
  todayLogical,
  type LogicalDate,
} from "../src/lib/panel/logical-date.ts";
import { lastRolledDay, runRollupJob } from "../src/server/panel/rollup.ts";

/** Más de esto por el camino automático no se hace: se avisa y se para. */
const MAX_AUTO_CATCHUP_DAYS = 14;
/** El primer día con datos posibles. Antes de esto no existía el sistema. */
const EPOCH: LogicalDate = parseLogicalDate("2026-09-01");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

function fail(msg: string): never {
  console.error(`panel-job: ${msg}`);
  process.exit(1);
}

const command = process.argv[2];
if (command !== "rollup") {
  fail(`comando desconocido: ${command ?? "(ninguno)"}. Uso: panel-job rollup [--last N|--from A --to B|--all|--catchup]`);
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) fail("falta DIRECT_URL. Corré con: node --env-file=.env");

// Pool chico y conexión directa: los jobs no compiten por el pool del sitio
// público, que es el recurso que ya causó una caída (ver README).
const withLimit = url.includes("?") ? `${url}&connection_limit=2` : `${url}?connection_limit=2`;
const db = new PrismaClient({ datasources: { db: { url: withLimit } }, log: ["error"] });

async function resolveWindow(): Promise<{ from: LogicalDate; to: LogicalDate }> {
  // `to` incluye HOY, no ayer. Con `to = ayer`, marcás un hábito a las 10:00
  // y el dashboard no lo muestra hasta las 04:30 del día siguiente: el bucle
  // de marcar y ver, que es el producto entero, queda roto 24 horas.
  const today = todayLogical();

  if (has("all")) return { from: EPOCH, to: today };

  const from = arg("from");
  const to = arg("to");
  if (from ?? to) {
    if (!from || !to) fail("--from y --to van juntos");
    return { from: parseLogicalDate(from), to: parseLogicalDate(to) };
  }

  const last = arg("last");
  if (last) {
    const n = Number(last);
    if (!Number.isInteger(n) || n < 1) fail(`--last espera un entero positivo, no "${last}"`);
    return { from: addDays(today, -(n - 1)), to: today };
  }

  if (has("catchup")) {
    // La ventana arranca donde terminó el último rollup, leído de los DATOS
    // y no del estado del scheduler. Se recomputan también los últimos días
    // ya hechos: Wakatime consolida con lag y siempre puede haber carga
    // retrospectiva.
    const done = await lastRolledDay(db);
    if (!done) return { from: addDays(today, -2), to: today };
    const gap = diffDays(done, today);
    if (gap > MAX_AUTO_CATCHUP_DAYS) {
      await db.panelJobRun.create({
        data: {
          job: "rollup",
          finishedAt: new Date(),
          ok: false,
          windowFrom: done,
          windowTo: today,
          error: `needs_manual_rebuild: ${gap} días sin rollup`,
        },
      });
      fail(
        `hay ${gap} días sin rollup (más de ${MAX_AUTO_CATCHUP_DAYS}). ` +
          `Corré a mano: panel-job rollup --from ${addDays(done, -2)} --to ${today}`,
      );
    }
    return { from: addDays(done, -2), to: today };
  }

  // Default del cron: los últimos 3 días, no solo ayer.
  return { from: addDays(today, -2), to: today };
}

try {
  const { from, to } = await resolveWindow();
  const started = Date.now();
  const result = await runRollupJob(db, from, to);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `panel-job rollup ${result.from} a ${result.to}: ` +
      `${result.days} días, ${result.eventsRead} eventos leídos, ` +
      `${result.rowsWritten} filas escritas, ${secs}s`,
  );
} catch (err) {
  console.error("panel-job: FALLÓ");
  console.error(err instanceof Error ? err.stack : err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
