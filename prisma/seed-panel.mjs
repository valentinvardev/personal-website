/**
 * Siembra las definiciones del panel. Idempotente: se puede correr de nuevo.
 *
 *   node --env-file=.env prisma/seed-panel.mjs
 *
 * Los tres hábitos son PLACEHOLDERS a propósito (decisión de Valentín): están
 * para probar el pipeline de punta a punta con las tres unidades distintas
 * (check, minutos, cantidad), y se renombran desde la UI sin migración.
 *
 * Los tres sujetos de check-in NO son hábitos y por eso van con
 * `scored: false` y `targetValue: null`: el sueño, la energía y el ánimo se
 * registran pero no se juzgan. Ahí es donde vive el `excludeFromScoring` de
 * la spec §5.4, en el schema y no en la vista.
 */

import { PrismaClient } from "../generated/prisma/index.js";

const db = new PrismaClient();

const METRICS = [
  // --- Hábitos (se puntúan) ---
  {
    key: "read.minutes",
    name: "Leer",
    kind: "habit",
    unit: "min",
    scored: true,
    targetValue: 30,
    sortOrder: 10,
  },
  {
    key: "train.check",
    name: "Entrenar",
    kind: "habit",
    unit: "check",
    scored: true,
    targetValue: 1,
    sortOrder: 20,
  },
  {
    key: "focus.blocks",
    name: "Bloques de foco",
    kind: "habit",
    unit: "count",
    scored: true,
    targetValue: 2,
    sortOrder: 30,
  },
  // --- Check-in (se registran, no se juzgan) ---
  {
    key: "sleep.duration",
    name: "Sueño",
    kind: "checkin",
    unit: "min",
    scored: false,
    targetValue: null,
    sortOrder: 40,
  },
  {
    key: "energy",
    name: "Energía",
    kind: "checkin",
    unit: "scale",
    scored: false,
    targetValue: null,
    sortOrder: 50,
  },
  {
    key: "mood",
    name: "Ánimo",
    kind: "checkin",
    unit: "scale",
    scored: false,
    targetValue: null,
    sortOrder: 60,
  },
];

async function main() {
  for (const m of METRICS) {
    await db.panelMetric.upsert({
      where: { key: m.key },
      create: m,
      // No pisa `name` ni `targetValue`: si los editaste desde la UI, un
      // seed posterior no te los revierte.
      update: { kind: m.kind, unit: m.unit, scored: m.scored, sortOrder: m.sortOrder },
    });
  }
  const total = await db.panelMetric.count();
  const habits = await db.panelMetric.count({ where: { kind: "habit" } });
  console.log(`Panel sembrado: ${total} métricas (${habits} hábitos, ${total - habits} de check-in)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
