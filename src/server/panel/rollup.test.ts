import assert from "node:assert/strict";
import { test } from "node:test";

import { dayOfEvent, logicalDayOf } from "./rollup.ts";

/**
 * A qué día pertenece un evento. Es la regla más fácil de romper de todo el
 * panel porque el error es silencioso: los números siguen siendo plausibles.
 */

test("un evento común se fecha por occurredAt", () => {
  // 13:00 de Buenos Aires: bien adentro del día lógico.
  assert.equal(logicalDayOf({ occurredAt: new Date("2026-09-09T16:00:00Z") }), "2026-09-09");
});

test("antes del corte de las 5 AM el evento pertenece al día anterior", () => {
  // 02:00 locales del 9 todavía son el día lógico 8.
  assert.equal(logicalDayOf({ occurredAt: new Date("2026-09-09T05:00:00Z") }), "2026-09-08");
});

test("meta.logicalDate le gana a occurredAt", () => {
  // El sueño que alimenta el 9 arranca a las 23:00 del 8.
  assert.equal(
    logicalDayOf({
      occurredAt: new Date("2026-09-09T02:00:00Z"),
      meta: { logicalDate: "2026-09-09" },
    }),
    "2026-09-09",
  );
});

test("la cabecera del check-in se fecha por su externalId, no por cuándo se apretó Guardar", () => {
  // Cargar el día de ayer a las 10 de la mañana: occurredAt es hoy.
  assert.equal(
    logicalDayOf({
      externalId: "checkin:2026-09-08",
      occurredAt: new Date("2026-09-09T13:00:00Z"),
    }),
    "2026-09-08",
  );
});

test("un externalId que no es una cabecera no cambia la fecha", () => {
  // Las filas por métrica llevan el día en el externalId, pero su occurredAt
  // ya cae en el día correcto: la regla de la cabecera no debe alcanzarlas.
  assert.equal(
    logicalDayOf({
      externalId: "checkin:2026-09-08:read.minutes",
      occurredAt: new Date("2026-09-09T16:00:00Z"),
    }),
    "2026-09-09",
  );
});

test("dayOfEvent arma la fila del bucket con el día atribuido", () => {
  const row = dayOfEvent({
    subjectId: "metric:sleep.duration",
    type: "sleep.segment",
    externalId: "checkin:2026-09-09:sleep.duration",
    occurredAt: new Date("2026-09-09T02:00:00Z"),
    value: 480,
    meta: { logicalDate: "2026-09-09" },
  });
  assert.deepEqual(row, {
    subjectId: "metric:sleep.duration",
    type: "sleep.segment",
    logicalDate: "2026-09-09",
    value: 480,
  });
});

test("un meta.logicalDate imposible explota en vez de normalizarse en silencio", () => {
  assert.throws(() =>
    logicalDayOf({
      occurredAt: new Date("2026-09-09T16:00:00Z"),
      meta: { logicalDate: "2026-02-30" },
    }),
  );
});
