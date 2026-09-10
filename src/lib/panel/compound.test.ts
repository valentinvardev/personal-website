import assert from "node:assert/strict";
import { test } from "node:test";

import { cumulativeLine, evaluableCount, ewmaSeries, paceProjection } from "./compound.ts";

/**
 * El gráfico compuesto es el único del panel que agrega TODO en una lectura,
 * así que es el que más fácil miente. Estos tests fijan las reglas que lo
 * mantienen honesto.
 */

test("el acumulado suma los días cumplidos y ignora los fallados", () => {
  const l = cumulativeLine("leer", "Leer", [1, 0, 1, 1, 0]);
  assert.deepEqual(l.cumulative, [1, 1, 2, 3, 3]);
  assert.equal(l.total, 3);
  assert.equal(l.evaluable, 5);
});

test("antes de la primera observación la línea no existe", () => {
  // Una métrica creada el día 3 no puede tener acumulado el día 2.
  const l = cumulativeLine("foco", "Foco", [null, null, 1, 0, 1]);
  assert.deepEqual(l.cumulative, [null, null, 1, 1, 2]);
  assert.equal(l.evaluable, 3);
});

test("un hueco en el medio deja la línea plana, no la corta", () => {
  // No cumpliste ese día porque no habia nada que cumplir (día excluido, o
  // todavía no cerró), no porque hayas fallado. La línea sigue.
  const l = cumulativeLine("leer", "Leer", [1, 1, null, null, 1]);
  assert.deepEqual(l.cumulative, [1, 2, 2, 2, 3]);
  assert.equal(l.total, 3);
  // El hueco NO infla el denominador: 3 evaluables, no 5.
  assert.equal(l.evaluable, 3);
});

test("una serie entera sin datos no dibuja nada", () => {
  const l = cumulativeLine("x", "X", [null, null, null]);
  assert.deepEqual(l.cumulative, [null, null, null]);
  assert.equal(l.total, 0);
  assert.equal(l.evaluable, 0);
});

test("el acumulado es monótono: nunca puede bajar", () => {
  const l = cumulativeLine("x", "X", [1, 0, 0, 1, null, 0, 1, 1]);
  const vals = l.cumulative.filter((v): v is number => v !== null);
  for (let i = 1; i < vals.length; i++) {
    assert.ok(vals[i]! >= vals[i - 1]!, `bajó en el índice ${i}`);
  }
});

test("la proyección compara tu ritmo de arranque contra lo que pasó", () => {
  // Arranque: 2 de 4 evaluables = 50%. Después: 4 evaluables más, todos cumplidos.
  const p = paceProjection([1, 0, 1, 0, 1, 1, 1, 1], 4);
  assert.ok(p);
  assert.equal(p.startRate, 0.5);
  assert.equal(p.n, 4);
  assert.equal(p.projected, 2 + 0.5 * 4); // 4
  assert.equal(p.actual, 6);
  assert.ok(p.actual > p.projected, "mejoró respecto de su propio arranque");
});

test("sin suficiente arranque no hay proyección, ni siquiera cero", () => {
  // Solo 3 evaluables y el arranque pide 4: comparar seria compararse consigo mismo.
  assert.equal(paceProjection([1, 0, 1], 4), null);
});

test("con arranque completo pero sin días posteriores tampoco hay proyección", () => {
  // Exactamente 4 evaluables: la proyección daria la identidad y un +0 falso.
  assert.equal(paceProjection([1, 0, 1, 0], 4), null);
});

test("la proyección cuenta días EVALUABLES, no posiciones del calendario", () => {
  // Los nulls del arranque no consumen warmup: si no, irte de viaje la primera
  // semana fijaria tu "ritmo inicial" con dos observaciones.
  const p = paceProjection([null, 1, null, 1, null, 0, 0, 1, 1], 4);
  assert.ok(p);
  assert.equal(p.n, 4);
  assert.equal(p.startRate, 0.5); // 1,1,0,0
});

test("la tendencia se siembra con la primera observación, no con cero", () => {
  // Sembrar en cero mete un sesgo hacia abajo que tarda ~1/alpha en irse.
  const s = ewmaSeries([1, 1, 1], 0.25);
  assert.equal(s[0], 1);
  assert.equal(s[1], 1);
  assert.equal(s[2], 1);
});

test("la tendencia parte la línea en los huecos pero no se resiembra", () => {
  const s = ewmaSeries([1, null, 0], 0.5);
  assert.equal(s[0], 1);
  assert.equal(s[1], null, "el hueco no dibuja");
  // Al otro lado continua desde 1, no desde 0: 0.5*0 + 0.5*1 = 0.5
  assert.equal(s[2], 0.5);
});

test("una tendencia sin ninguna observación es toda nula", () => {
  assert.deepEqual(ewmaSeries([null, null], 0.25), [null, null]);
});

test("alpha fuera de rango explota en vez de dibujar cualquier cosa", () => {
  assert.throws(() => ewmaSeries([1], 0));
  assert.throws(() => ewmaSeries([1], 1.5));
});

test("el n de una serie son sus días evaluables", () => {
  assert.equal(evaluableCount([1, null, 0, null, 1]), 3);
  assert.equal(evaluableCount([]), 0);
});
