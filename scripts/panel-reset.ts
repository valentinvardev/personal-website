/**
 * Vacía los datos del panel. Corre con `node`, fuera de Next.
 *
 *   node --env-file=.env scripts/panel-reset.ts              # dry run
 *   node --env-file=.env scripts/panel-reset.ts --confirm    # borra
 *   node --env-file=.env scripts/panel-reset.ts --confirm --metrics
 *
 * Para qué existe. `panel-restore.ts` inserta con `skipDuplicates`, así que
 * restaurar sobre una base con datos NO deja la base igual al backup: deja la
 * unión de las dos. La forma de volver de verdad a un backup es vaciar y
 * después restaurar, y sin este script ese "vaciar" terminaba siendo un DELETE
 * a mano contra la base que comparte la plataforma de la agencia.
 *
 * El otro uso, el de una sola vez: sacar los datos de prueba antes de empezar
 * a medir en serio. En un sistema de medición eso no es cosmético. La primera
 * semana es la que fija la línea de base contra la que se van a leer todos los
 * meses siguientes, y una noche inventada de 8 h la corre.
 *
 * Por defecto NO toca `Metric`: las definiciones son la semilla, no los datos.
 * Borrarlas y recrearlas les cambia el `createdAt`, y de ese campo cuelga desde
 * cuándo se evalúa cada hábito. `--metrics` las incluye, para el reset total.
 *
 * NUNCA toca otro schema. Este script solo conoce los modelos `Panel*`, que
 * Prisma mapea al schema `panel`; `personal_site` y `public` (la facturación de
 * la agencia) están fuera de su alcance por construcción, no por cuidado.
 */

import { PrismaClient } from "../generated/prisma/index.js";

const confirm = process.argv.includes("--confirm");
const alsoMetrics = process.argv.includes("--metrics");

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("panel-reset: falta DIRECT_URL. Corré con: node --env-file=.env");
  process.exit(1);
}

const withLimit = url.includes("?") ? `${url}&connection_limit=2` : `${url}?connection_limit=2`;
const db = new PrismaClient({ datasources: { db: { url: withLimit } }, log: ["error"] });

try {
  const before = {
    metric: await db.panelMetric.count(),
    event: await db.panelEvent.count(),
    rollup: await db.panelDailyRollup.count(),
    excluded: await db.panelExcludedDay.count(),
    job: await db.panelJobRun.count(),
    inbox: await db.panelInbox.count(),
  };

  console.log("panel-reset: la base tiene ahora");
  console.log(`  eventos          ${before.event}`);
  console.log(`  rollups          ${before.rollup}`);
  console.log(`  días excluidos   ${before.excluded}`);
  console.log(`  corridas del job ${before.job}`);
  console.log(`  inbox            ${before.inbox}`);
  console.log(`  métricas         ${before.metric}${alsoMetrics ? " (se borran)" : " (se conservan)"}`);

  if (!confirm) {
    console.log("\n  DRY RUN: no se borró nada. Agregá --confirm para aplicar.");
    console.log("  Si querés poder volver atrás, exportá primero:");
    // process.execPath y no un "node" pelado: en el VPS el `node` del PATH es
    // uno viejo que no puede ni parsear este archivo, así que sugerir "node"
    // sería dar un comando que falla en la misma máquina que lo imprime.
    // Entrecomillado porque en Windows la ruta trae espacios.
    console.log(`    "${process.execPath}" --env-file=.env scripts/panel-export.ts`);
    process.exit(0);
  }

  // Orden: primero lo derivado, después el log. Así una interrupción a la
  // mitad deja la base sin agregados en vez de con agregados huérfanos.
  const rollup = await db.panelDailyRollup.deleteMany({});
  const job = await db.panelJobRun.deleteMany({});
  const inbox = await db.panelInbox.deleteMany({});
  const event = await db.panelEvent.deleteMany({});
  const excluded = await db.panelExcludedDay.deleteMany({});
  const metric = alsoMetrics ? await db.panelMetric.deleteMany({}) : { count: 0 };

  console.log("\npanel-reset: borrado");
  console.log(`  ${event.count} eventos, ${rollup.count} rollups, ${excluded.count} días excluidos`);
  console.log(`  ${job.count} corridas del job, ${inbox.count} del inbox, ${metric.count} métricas`);
} catch (err) {
  console.error("panel-reset: FALLÓ");
  console.error(err instanceof Error ? err.stack : err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
