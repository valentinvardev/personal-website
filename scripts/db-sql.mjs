#!/usr/bin/env node
/**
 * Aplica, en orden, los .sql de prisma/panel-sql/ contra la base.
 *
 * Existe porque `prisma db push` recrea el schema a imagen de schema.prisma y
 * no sabe nada de lo que Prisma no modela (CHECK constraints, GRANTs). Esos
 * objetos hay que reaplicarlos después de cada push, y por eso todos los
 * archivos de esa carpeta son idempotentes.
 *
 * Se corre solo, o encadenado en `npm run db:sync`.
 *
 * Dos detalles que importan en el VPS:
 *  - Usa DIRECT_URL (5432), no el pooler: pgbouncer en modo transacción no es
 *    confiable para DDL.
 *  - Pasa la URL por variable de entorno, nunca por argv: en un VPS con otras
 *    apps, un `--url` con la contraseña queda visible en `ps aux`.
 */

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SQL_DIR = fileURLToPath(new URL("../prisma/panel-sql/", import.meta.url));
const SCHEMA = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("db-sql: falta DIRECT_URL (o DATABASE_URL). Corré con: node --env-file=.env");
  process.exit(1);
}

const files = readdirSync(SQL_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort(); // el prefijo numérico define el orden

if (files.length === 0) {
  console.error(`db-sql: no hay .sql en ${SQL_DIR}`);
  process.exit(1);
}

for (const file of files) {
  process.stdout.write(`db-sql: aplicando ${file} ... `);
  try {
    execFileSync(
      "npx",
      ["prisma", "db", "execute", "--schema", SCHEMA, "--file", SQL_DIR + file],
      {
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
        // Prisma db execute usa la url del datasource; le damos la directa.
        env: { ...process.env, DATABASE_URL: url },
      },
    );
    console.log("ok");
  } catch (err) {
    console.log("FALLÓ");
    const detail = [err.stdout?.toString(), err.stderr?.toString()].filter(Boolean).join("\n");
    console.error(detail || err.message);
    process.exit(1);
  }
}

console.log(`db-sql: ${files.length} archivo(s) aplicado(s)`);
