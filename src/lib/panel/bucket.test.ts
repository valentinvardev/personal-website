import assert from "node:assert/strict";
import { test } from "node:test";

import { bucketEvents, type BucketEvent, type BucketMetric } from "./bucket.ts";
import { parseLogicalDate, rangeOfDays } from "./logical-date.ts";

const ld = parseLogicalDate;
const DAYS = rangeOfDays(ld("2026-09-01"), ld("2026-09-03"));

const leer: BucketMetric = {
  key: "read.minutes",
  scored: true,
  targetValue: 30,
  activeFrom: ld("2026-09-01"),
  activeTo: null,
};
const animo: BucketMetric = {
  key: "mood",
  scored: false,
  targetValue: null,
  activeFrom: ld("2026-09-01"),
  activeTo: null,
};

const ev = (subjectId: string, day: string, value: number | null, type = "habit.check"): BucketEvent => ({
  subjectId,
  type,
  logicalDate: ld(day),
  value,
});

test("un hábito puntuado sin evento genera fila con hit:false", () => {
  const rows = bucketEvents([], [leer], DAYS);
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.hit === false && r.count === 0 && r.target === 30));
  // Sin estas filas la adherencia sería siempre 100%: solo contaría los días
  // que cumpliste.
});

test("un sujeto NO puntuado sin evento no genera ninguna fila", () => {
  const rows = bucketEvents([], [animo], DAYS);
  assert.equal(rows.length, 0);
  // No registrar el ánimo no dice nada sobre el ánimo.
});

test("cumplir el target marca hit, quedarse corto no", () => {
  const rows = bucketEvents(
    [ev("metric:read.minutes", "2026-09-01", 45), ev("metric:read.minutes", "2026-09-02", 10)],
    [leer],
    DAYS,
  );
  const byDay = new Map(rows.map((r) => [r.logicalDate as string, r]));
  assert.equal(byDay.get("2026-09-01")?.hit, true);
  assert.equal(byDay.get("2026-09-01")?.total, 45);
  assert.equal(byDay.get("2026-09-02")?.hit, false);
  assert.equal(byDay.get("2026-09-03")?.hit, false); // sin evento
});

test("marcar sin decir la cantidad cuenta como cumplido, con total desconocido", () => {
  const rows = bucketEvents([ev("metric:read.minutes", "2026-09-01", null)], [leer], DAYS);
  const day1 = rows.find((r) => r.logicalDate === "2026-09-01");
  assert.equal(day1?.count, 1);
  assert.equal(day1?.total, null, "no se inventa una cantidad");
  assert.equal(day1?.hit, true, "el evento existe: lo marcaste");
});

test("un sujeto no puntuado con evento no lleva ni target ni hit", () => {
  const rows = bucketEvents(
    [ev("metric:mood", "2026-09-01", 4, "scale.mood")],
    [animo],
    DAYS,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.target, null);
  assert.equal(rows[0]?.hit, null);
  assert.equal(rows[0]?.total, 4);
  // Cumple el CHECK de la base: target y hit son ambos NULL o ninguno.
  assert.equal(rows[0]?.target === null, rows[0]?.hit === null);
});

test("un día excluido no genera ninguna fila: sale del denominador", () => {
  const rows = bucketEvents([], [leer], DAYS, new Set(["2026-09-02"]));
  assert.equal(rows.length, 2);
  assert.ok(!rows.some((r) => r.logicalDate === "2026-09-02"));
});

test("tipos mezclados en el mismo sujeto y día no se suman", () => {
  const rows = bucketEvents(
    [
      ev("repo:mio/app", "2026-09-01", 3, "code.commit"),
      ev("repo:mio/app", "2026-09-01", 120, "code.time"),
    ],
    [],
    DAYS,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.count, 2);
  assert.equal(rows[0]?.total, null, "3 commits + 120 minutos no es 123 de nada");
});

test("varios eventos del mismo tipo sí se suman", () => {
  const rows = bucketEvents(
    [
      ev("repo:mio/app", "2026-09-01", 3, "code.commit"),
      ev("repo:mio/app", "2026-09-01", 2, "code.commit"),
    ],
    [],
    DAYS,
  );
  assert.equal(rows[0]?.total, 5);
  assert.equal(rows[0]?.count, 2);
});

test("una métrica creada ayer no genera fallas retroactivas", () => {
  const nueva: BucketMetric = { ...leer, key: "nuevo", activeFrom: ld("2026-09-03") };
  const rows = bucketEvents([], [nueva], DAYS);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.logicalDate, "2026-09-03");
});

test("una métrica archivada deja de evaluarse", () => {
  const vieja: BucketMetric = { ...leer, key: "vieja", activeTo: ld("2026-09-01") };
  const rows = bucketEvents([], [vieja], DAYS);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.logicalDate, "2026-09-01");
});

test("los eventos fuera del rango pedido se ignoran", () => {
  const rows = bucketEvents([ev("metric:read.minutes", "2026-08-20", 60)], [leer], DAYS);
  assert.ok(rows.every((r) => r.total === 0 && r.hit === false));
});

test("es determinista: mismo input, mismo output", () => {
  const events = [ev("metric:read.minutes", "2026-09-01", 45), ev("metric:mood", "2026-09-02", 3, "scale.mood")];
  const a = bucketEvents(events, [leer, animo], DAYS);
  const b = bucketEvents(events, [leer, animo], DAYS);
  assert.deepEqual(a, b);
});
