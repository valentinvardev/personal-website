import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ALPHA_FAST,
  adherence,
  asPercent,
  completeness,
  consistency,
  ewma,
  momentum,
  requiredPace,
} from "./metrics.ts";

test("adherencia: los nulls salen del denominador, los false no", () => {
  // 2 de 3 días evaluables. El null (día excluido) no cuenta en ningún lado.
  assert.deepEqual(adherence([true, false, null, true]), { value: 2 / 3, n: 3 });
});

test("adherencia sin días evaluables no es cero, es no calculable", () => {
  const r = adherence([null, null]);
  assert.equal(r.value, null);
  assert.equal(r.n, 0);
  assert.equal(r.reason, "sin-datos");
  // Ésta es la diferencia que evita que el sistema mienta: 0% dice "fallaste
  // siempre", null dice "no hay con qué responder".
  assert.notEqual(r.value, 0);
});

test("adherencia perfecta y nula", () => {
  assert.equal(adherence([true, true, true]).value, 1);
  assert.equal(adherence([false, false]).value, 0);
});

test("completitud cuenta días, no eventos", () => {
  assert.deepEqual(completeness([true, true, false, false]), { value: 0.5, n: 4 });
  assert.equal(completeness([]).value, null);
});

test("la EWMA se siembra con la primera observación, no con cero", () => {
  // Sembrada en 0, el primer valor daría 0.25*10 = 2.5 en vez de 10.
  assert.equal(ewma([10], ALPHA_FAST).value, 10);
  // Serie constante: la EWMA es esa constante, sin arrastre desde cero.
  const r = ewma([10, 10, 10, 10, 10], ALPHA_FAST);
  assert.equal(r.value, 10);
  assert.equal(r.n, 5);
});

test("la EWMA saltea los nulls sin tratarlos como cero", () => {
  const conNulls = ewma([10, null, 10], ALPHA_FAST);
  const sinNulls = ewma([10, 10], ALPHA_FAST);
  assert.equal(conNulls.value, sinNulls.value);
  assert.equal(conNulls.n, 2);
  // Si el null valiera cero, el promedio se desplomaría.
  assert.ok(conNulls.value !== null && conNulls.value > 9);
});

test("la EWMA reacciona más rápido con alpha alto", () => {
  const serie = [0, 0, 0, 0, 10];
  const rapida = ewma(serie, 0.5).value;
  const lenta = ewma(serie, 0.05).value;
  assert.ok(rapida !== null && lenta !== null && rapida > lenta);
});

test("la EWMA rechaza alphas imposibles", () => {
  assert.throws(() => ewma([1], 0), /alpha/);
  assert.throws(() => ewma([1], 1.5), /alpha/);
});

test("momentum calla hasta que la EWMA lenta está caliente", () => {
  const pocos = momentum([1, 2, 3, 4, 5]);
  assert.equal(pocos.value, null);
  assert.equal(pocos.reason, "muestra-chica");

  // Con 40 observaciones en aceleración, el momentum es > 1.
  const subiendo = Array.from({ length: 40 }, (_, i) => i + 1);
  const r = momentum(subiendo);
  assert.ok(r.value !== null && r.value > 1, `esperaba >1, dio ${r.value}`);

  const bajando = Array.from({ length: 40 }, (_, i) => 40 - i);
  const b = momentum(bajando);
  assert.ok(b.value !== null && b.value < 1, `esperaba <1, dio ${b.value}`);
});

test("consistencia: serie estable cerca de 1, serie errática mucho menor", () => {
  const estable = consistency([10, 10, 10, 10]);
  assert.equal(estable.value, 1);
  const erratica = consistency([1, 20, 2, 19]);
  assert.ok(erratica.value !== null && erratica.value < 0.3);
  // Con una sola observación no hay dispersión que medir.
  assert.equal(consistency([5]).reason, "muestra-chica");
  // Media cero: la fórmula divide por cero, así que no es calculable.
  assert.equal(consistency([0, 0]).value, null);
});

test("ritmo requerido", () => {
  assert.equal(requiredPace(100, 40, 10).value, 6);
  // Objetivo alcanzado: el ritmo necesario es cero, no negativo.
  assert.equal(requiredPace(100, 120, 5).value, 0);
  // Sin días restantes no hay ritmo que alcance: null, no Infinity.
  assert.equal(requiredPace(100, 40, 0).value, null);
});

test("el formato imprime un guion cuando no hay dato, nunca 0%", () => {
  assert.equal(asPercent(adherence([true, false])), "50%");
  assert.equal(asPercent(adherence([null])), "—");
  assert.equal(asPercent(adherence([false])), "0%");
});
