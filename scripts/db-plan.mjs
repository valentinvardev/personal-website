#!/usr/bin/env node
/**
 * Muestra el SQL EXACTO que `db push` va a aplicar, y lo audita antes de que
 * lo apliques.
 *
 * Existe por dos razones medidas contra esta base:
 *
 *  1. `prisma db push` no tiene dry run, y **dropea índices creados a mano en
 *     silencio**: sin warning, sin pedir --accept-data-loss, diciendo "in
 *     sync" y listo.
 *
 *  2. Esta base es COMPARTIDA con la plataforma de la agencia, que vive en el
 *     schema `public` con su propio historial de migraciones. Un push que
 *     toque `public` es pérdida de datos de facturación.
 *
 * El script falla si el plan contiene algo destructivo o algo fuera de los
 * schemas que este repo gestiona. Correr SIEMPRE antes de `npm run db:sync`.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCHEMA = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));

/** Schemas que este repo tiene permitido modificar. */
const OWNED = ["panel", "personal_site"];
/** Schemas ajenos: una sola mención en el plan es motivo de aborto. */
const FOREIGN = ["public", "auth", "storage", "realtime", "vault"];

let sql;
try {
  sql = execFileSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-schema-datasource",
      SCHEMA,
      "--to-schema-datamodel",
      SCHEMA,
      "--script",
    ],
    { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (err) {
  console.error("db-plan: no se pudo calcular el diff");
  console.error(err.stderr?.toString() || err.message);
  process.exit(1);
}

const trimmed = sql.trim();
const noop = trimmed === "" || /^--\s*This is an empty migration/i.test(trimmed);

console.log("\n=== SQL que db push va a aplicar ===\n");
console.log(noop ? "  (nada: la base ya coincide con schema.prisma)\n" : sql);

if (noop) {
  console.log("db-plan: sin cambios pendientes.\n");
  process.exit(0);
}

// --- Auditoría -------------------------------------------------------------
const statements = trimmed
  .split("\n")
  .filter((l) => /^\s*(CREATE|ALTER|DROP|TRUNCATE|REVOKE|GRANT)/i.test(l))
  .map((l) => l.trim());

const problems = [];

for (const s of statements) {
  if (/^\s*(DROP|TRUNCATE)/i.test(s)) problems.push(`destructivo: ${s}`);
  if (/\bDROP\s+(COLUMN|TABLE|INDEX|CONSTRAINT)\b/i.test(s)) problems.push(`destructivo: ${s}`);
}

for (const schema of FOREIGN) {
  const re = new RegExp(`"${schema}"\\.`, "i");
  if (re.test(sql)) problems.push(`toca un schema ajeno ("${schema}"): este repo no lo gestiona`);
}

// Toda sentencia debería nombrar uno de nuestros schemas.
const sinSchema = statements.filter(
  (s) => !OWNED.some((o) => s.includes(`"${o}"`)) && !/CREATE SCHEMA/i.test(s),
);

console.log("=== auditoría ===");
console.log(`  sentencias:        ${statements.length}`);
console.log(`  destructivas:      ${problems.filter((p) => p.startsWith("destructivo")).length}`);
console.log(`  schemas ajenos:    ${problems.filter((p) => p.startsWith("toca")).length}`);
if (sinSchema.length > 0) {
  console.log(`  sin schema explícito: ${sinSchema.length}`);
  for (const s of sinSchema.slice(0, 5)) console.log(`      ${s}`);
}

if (problems.length > 0) {
  console.error("\ndb-plan: PLAN RECHAZADO\n");
  for (const p of new Set(problems)) console.error("  - " + p);
  console.error(
    "\nNo corras db:push. Revisá el drift entre schema.prisma y la base antes de seguir.\n",
  );
  process.exit(1);
}

console.log("\ndb-plan: el plan solo crea o modifica objetos en " + OWNED.join(" y ") + ".");
console.log("Revisá el SQL de arriba y, si estás de acuerdo, corré: npm run db:sync\n");
