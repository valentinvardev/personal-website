#!/usr/bin/env node
/**
 * Hace cumplir la regla §3.3.3 de la spec: `logicalDate()` es el único lugar
 * del panel que decide a qué día pertenece un instante.
 *
 * Es una regla que sin mecanismo se rompe sola: los bugs de zona horaria se
 * propagan justamente porque cada archivo resuelve "qué día es" a su manera,
 * y ninguno falla ruidosamente. Fallan produciendo un día plausible y
 * equivocado.
 *
 * Corre en `prebuild` y en `npm test`. Sin dependencias.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Solo el panel. El resto del sitio tiene su propio formateo de fechas. */
const SCOPES = [
  "src/lib/panel",
  "src/server/panel",
  "src/app/panel",
  "src/components/panel",
];

/**
 * Archivos autorizados a hablar de zonas horarias.
 * `logical-date.ts` es la implementación; `format.ts` renderiza horas de
 * pared para la UI (el selector de sueño necesita mostrar "23:15").
 */
const ALLOW = new Set(["src/lib/panel/logical-date.ts", "src/lib/panel/format.ts"]);

const BANNED = [
  [/\.getDate\s*\(/, "getDate() usa la zona del proceso; usá logicalDate()"],
  [/\.getMonth\s*\(/, "getMonth() usa la zona del proceso; usá logicalDate()"],
  [/\.getFullYear\s*\(/, "getFullYear() usa la zona del proceso; usá logicalDate()"],
  [/\.getDay\s*\(/, "getDay() usa la zona del proceso; usá logicalDate()"],
  [/\.getHours\s*\(/, "getHours() usa la zona del proceso; usá logicalDate()"],
  [/toLocaleDateString\s*\(/, "toLocaleDateString() formatea en la zona del cliente"],
  [/toDateString\s*\(/, "toDateString() formatea en la zona del proceso"],
  [/new\s+Intl\.DateTimeFormat/, "la zona se resuelve solo en logical-date.ts"],
  [/America\/Argentina/, "la zona se declara solo en logical-date.ts (PANEL_TZ)"],
];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // scope todavía no creado
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) yield full;
  }
}

const problems = [];

for (const scope of SCOPES) {
  for await (const file of walk(join(ROOT, scope))) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (ALLOW.has(rel)) continue;
    const source = await readFile(file, "utf8");
    const lines = source.split("\n");
    for (const [pattern, why] of BANNED) {
      lines.forEach((line, i) => {
        // Ignora comentarios: el texto explicativo puede nombrar lo prohibido.
        const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
        if (pattern.test(code)) problems.push(`${rel}:${i + 1}  ${why}\n    ${line.trim()}`);
      });
    }
  }
}

if (problems.length > 0) {
  console.error(`\nguard-time: ${problems.length} violación(es) de la regla del día lógico\n`);
  for (const p of problems) console.error("  " + p + "\n");
  console.error("Si el caso es legítimo, agregá el archivo a ALLOW en scripts/guard-time.mjs\n");
  process.exit(1);
}

console.log("guard-time: ok, el día lógico se decide en un solo lugar");
