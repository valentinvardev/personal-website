import assert from "node:assert/strict";
import { test } from "node:test";

import { parseLogicalDate } from "../../lib/panel/logical-date.ts";
import { pendingRollupDays } from "./overview.ts";

/**
 * Días cerrados que el rollup no consolidó. Es la señal que tiene que sobrevivir
 * a que el job muera antes de escribir su fila en JobRun, que es exactamente lo
 * que pasó el 2026-09-09 con Node 20 en el VPS.
 */

const d = parseLogicalDate;
const sinExcluir = new Set<string>();

test("sin un solo evento no hay nada pendiente", () => {
  assert.equal(pendingRollupDays(d("2026-09-09"), null, null, sinExcluir), 0);
});

test("el sistema arrancó hoy: no hay días cerrados todavía", () => {
  assert.equal(pendingRollupDays(d("2026-09-09"), d("2026-09-09"), null, sinExcluir), 0);
});

test("el cron nunca corrió y ya pasaron días", () => {
  // Arrancó el 1, hoy es 9: quedan cerrados del 1 al 8, o sea 8 días.
  assert.equal(pendingRollupDays(d("2026-09-09"), d("2026-09-01"), null, sinExcluir), 8);
});

test("el rollup está al día: ayer ya está consolidado", () => {
  assert.equal(pendingRollupDays(d("2026-09-09"), d("2026-09-01"), d("2026-09-08"), sinExcluir), 0);
});

test("el rollup consolidó hasta hoy: tampoco falta nada", () => {
  // El cron con --catchup recomputa el día en curso; no debe contar como deuda.
  assert.equal(pendingRollupDays(d("2026-09-09"), d("2026-09-01"), d("2026-09-09"), sinExcluir), 0);
});

test("el cron murió hace tres días", () => {
  // Consolidado hasta el 5, cerrados hasta el 8: faltan 6, 7 y 8.
  assert.equal(pendingRollupDays(d("2026-09-09"), d("2026-09-01"), d("2026-09-05"), sinExcluir), 3);
});

test("los días excluidos no son deuda: para ellos no haber filas es lo correcto", () => {
  const excluidos = new Set(["2026-09-06", "2026-09-07"]);
  assert.equal(pendingRollupDays(d("2026-09-09"), d("2026-09-01"), d("2026-09-05"), excluidos), 1);
});

test("un rollup viejo anterior al arranque no adelanta el punto de partida", () => {
  // Restaurar un backup viejo puede dejar filas de antes del primer evento
  // actual. La deuda se cuenta desde que el sistema arrancó, no desde ahí.
  assert.equal(pendingRollupDays(d("2026-09-09"), d("2026-09-05"), d("2026-08-01"), sinExcluir), 4);
});
