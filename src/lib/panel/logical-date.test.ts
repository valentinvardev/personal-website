import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CUTOFF_HOUR,
  addDays,
  diffDays,
  fromDbDate,
  logicalDate,
  logicalDayBounds,
  logicalRangeBounds,
  parseLogicalDate,
  rangeOfDays,
  toDbDate,
  weekdayOf,
} from "./logical-date.ts";

const ld = parseLogicalDate;

/* Buenos Aires es UTC-3, así que el corte de las 5 AM local cae 08:00 UTC. */

test("el corte parte el día en la hora local correcta", () => {
  // 04:59 local del 9 pertenece al 8: todavía es "la noche del 8".
  assert.equal(logicalDate(new Date("2026-09-09T07:59:59Z")), "2026-09-08");
  // 05:00 local del 9 ya es el día 9.
  assert.equal(logicalDate(new Date("2026-09-09T08:00:00Z")), "2026-09-09");
});

test("medianoche y fin del día caen donde corresponde", () => {
  // 00:00 local del 9 -> día 8.
  assert.equal(logicalDate(new Date("2026-09-09T03:00:00Z")), "2026-09-08");
  // 23:59 local del 9 -> día 9.
  assert.equal(logicalDate(new Date("2026-09-10T02:59:59Z")), "2026-09-09");
});

test("el caso que motiva todo: trabajar a las 2 de la mañana cuenta para ayer", () => {
  const dosDeLaManana = new Date("2026-09-10T05:30:00Z"); // 02:30 local del 10
  assert.equal(logicalDate(dosDeLaManana), "2026-09-09");
});

test("cruza mes, año y año bisiesto", () => {
  assert.equal(logicalDate(new Date("2026-10-01T07:00:00Z")), "2026-09-30");
  assert.equal(logicalDate(new Date("2027-01-01T07:00:00Z")), "2026-12-31");
  // 2028 es bisiesto: 04:00 local del 1 de marzo pertenece al 29 de febrero.
  assert.equal(logicalDate(new Date("2028-03-01T07:00:00Z")), "2028-02-29");
  assert.equal(addDays(ld("2028-02-28"), 1), "2028-02-29");
  assert.equal(addDays(ld("2027-02-28"), 1), "2027-03-01");
});

test("usa la base de zonas horarias, no un offset fijo (enero 2009 fue UTC-2)", () => {
  // Con -3 hardcodeado este caso daría el día anterior: el sistema tenía
  // horario de verano por el decreto de 2007.
  assert.equal(logicalDate(new Date("2009-01-15T07:00:00Z")), "2009-01-15"); // 05:00 local
  assert.equal(logicalDate(new Date("2009-01-15T06:59:59Z")), "2009-01-14"); // 04:59 local
  // El mismo día del año, ya sin horario de verano, cae una hora distinto.
  assert.equal(logicalDate(new Date("2026-01-15T08:00:00Z")), "2026-01-15");
  assert.equal(logicalDate(new Date("2026-01-15T07:59:59Z")), "2026-01-14");
});

test("los bordes de la ventana son coherentes con el corte", () => {
  const { startUtc, endUtc } = logicalDayBounds(ld("2026-09-09"));
  assert.equal(startUtc.toISOString(), "2026-09-09T08:00:00.000Z");
  assert.equal(endUtc.toISOString(), "2026-09-10T08:00:00.000Z");
  // El fin es exclusivo: ese instante ya es del día siguiente.
  assert.equal(logicalDate(endUtc), "2026-09-10");
  assert.equal(logicalDate(new Date(endUtc.getTime() - 1)), "2026-09-09");
});

test("propiedad: 400 días seguidos van y vuelven sin correrse", () => {
  let day = ld("2025-11-01");
  for (let i = 0; i < 400; i++) {
    const { startUtc, endUtc } = logicalDayBounds(day);
    assert.equal(logicalDate(startUtc), day, `inicio de ${day}`);
    assert.equal(logicalDate(new Date(endUtc.getTime() - 1)), day, `fin de ${day}`);
    assert.equal(endUtc.getTime() - startUtc.getTime(), 86_400_000, `duración de ${day}`);
    day = addDays(day, 1);
  }
});

test("propiedad: el día lógico sobrevive al round trip por la columna @db.Date", () => {
  let day = ld("2026-01-01");
  for (let i = 0; i < 366; i++) {
    assert.equal(fromDbDate(toDbDate(day)), day);
    day = addDays(day, 1);
  }
});

test("parseLogicalDate rechaza lo que Date.UTC normalizaría en silencio", () => {
  assert.throws(() => parseLogicalDate("2026-02-30"), /inexistente/);
  assert.throws(() => parseLogicalDate("2026-13-01"), /inexistente/);
  assert.throws(() => parseLogicalDate("2026-9-9"), /se espera/);
  assert.throws(() => parseLogicalDate("ayer"), /se espera/);
  assert.equal(parseLogicalDate("2028-02-29"), "2028-02-29");
});

test("aritmética de días", () => {
  assert.equal(diffDays(ld("2026-09-01"), ld("2026-09-30")), 29);
  assert.equal(diffDays(ld("2026-09-30"), ld("2026-09-01")), -29);
  assert.equal(diffDays(ld("2026-01-01"), ld("2027-01-01")), 365);
  assert.equal(addDays(ld("2026-09-09"), -1), "2026-09-08");
  assert.equal(rangeOfDays(ld("2026-09-08"), ld("2026-09-10")).length, 3);
  assert.deepEqual(rangeOfDays(ld("2026-09-09"), ld("2026-09-09")), ["2026-09-09"]);
  assert.throws(() => rangeOfDays(ld("2026-09-10"), ld("2026-09-09")), /invertido/);
});

test("el rango de varios días cubre desde el corte del primero al del siguiente al último", () => {
  const { startUtc, endUtc } = logicalRangeBounds(ld("2026-09-01"), ld("2026-09-03"));
  assert.equal(startUtc.toISOString(), "2026-09-01T08:00:00.000Z");
  assert.equal(endUtc.toISOString(), "2026-09-04T08:00:00.000Z");
});

test("entradas inválidas fallan ruidosamente, no devuelven un día plausible", () => {
  assert.throws(() => logicalDate(new Date("no es una fecha")), /inválida/);
  assert.throws(() => fromDbDate(new Date(NaN)), /inválida/);
});

test("el corte es el que decidimos", () => {
  assert.equal(CUTOFF_HOUR, 5);
});

test("día de la semana con la semana empezando en lunes", () => {
  // 2026-09-09 es miércoles.
  assert.equal(weekdayOf(ld("2026-09-09")), 2);
  assert.equal(weekdayOf(ld("2026-09-07")), 0, "lunes");
  assert.equal(weekdayOf(ld("2026-09-13")), 6, "domingo");
  // Siete días seguidos recorren los siete valores sin repetir.
  const week = rangeOfDays(ld("2026-09-07"), ld("2026-09-13")).map(weekdayOf);
  assert.deepEqual(week, [0, 1, 2, 3, 4, 5, 6]);
});
