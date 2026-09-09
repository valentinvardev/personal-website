import "server-only";

import { z } from "zod";

import {
  SLEEP_SLOTS,
  SLEEP_SLOT_MINUTES,
  SLEEP_WINDOW_START_HOUR,
} from "~/lib/panel/format";
import {
  addDays,
  logicalDayBounds,
  type LogicalDate,
} from "~/lib/panel/logical-date";
import { db } from "~/server/db";
import type { Prisma } from "../../../generated/prisma";
import { metricSubject } from "./subject";

/**
 * Versión del formulario de check-in.
 *
 * Se sube cuando cambian las anclas de una escala o la mecánica de una
 * pregunta. Las respuestas de versiones distintas NO son comparables: "bien"
 * en una escala de 4 puntos no es "bien" en una de 5. El tier 3 excluye los
 * cruces entre versiones.
 */
export const FORM_VERSION = 1;

/** Anclas en palabras, no en números: "7" no es un estado estable entre meses. */
export const ENERGY_ANCHORS = ["Agotado", "Bajo", "Bien", "Con energía"] as const;
export const MOOD_ANCHORS = ["Mal", "Bajo", "Neutro", "Bien", "Muy bien"] as const;

/**
 * Energía: escala PAR, sin punto medio. Obliga a inclinarse.
 * Ánimo: escala IMPAR, con neutro, porque ahí el medio es un estado real.
 *
 * Los dos ejes miden cosas distintas (valencia y activación) y por eso se
 * preguntan por separado: valencia baja con activación alta es ansiedad,
 * valencia baja con activación baja es apatía, y una escala única las
 * colapsa en el mismo número.
 */
export const checkinInput = z.object({
  /** Día lógico al que pertenece este check-in, calculado en el servidor. */
  logicalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Hábitos cumplidos, por `key` de la métrica. */
  habits: z.array(z.string().min(1).max(80)).max(20).default([]),
  /**
   * Sueño en slots de la ventana (0..79). `null` = no se registró.
   * El servidor recalcula la duración desde los extremos: nunca se confía en
   * una duración calculada por el navegador.
   */
  sleep: z
    .object({
      startSlot: z.number().int().min(0).max(SLEEP_SLOTS),
      endSlot: z.number().int().min(0).max(SLEEP_SLOTS),
    })
    .nullable()
    .default(null),
  energy: z.number().int().min(1).max(ENERGY_ANCHORS.length).nullable().default(null),
  mood: z.number().int().min(1).max(MOOD_ANCHORS.length).nullable().default(null),
  /**
   * Cuánto tardó en completarse, en ms. Es el mejor detector de que las
   * respuestas se volvieron automáticas, y cuesta una línea de código.
   */
  elapsedMs: z.number().int().min(0).max(10 * 60 * 1000).nullable().default(null),
});

export type CheckinInput = z.infer<typeof checkinInput>;

/**
 * Instante UTC en el que arranca la ventana de sueño de un día lógico: las
 * 18:00 locales del día ANTERIOR. El sueño que alimenta el día D empieza la
 * tarde del D-1.
 *
 * Se deriva de `logicalDayBounds`, que ya sabe resolver hora local a instante
 * UTC, para no tener una segunda implementación de esa conversión.
 */
export function sleepWindowStart(ld: LogicalDate): Date {
  // El día lógico D-1 arranca a las 5:00 locales del D-1; sumarle 13 horas
  // da las 18:00 locales del mismo día. Argentina no tiene DST, así que la
  // suma en milisegundos es exacta; si algún día lo tuviera, este es el
  // único punto a revisar.
  const previous = logicalDayBounds(addDays(ld, -1)).startUtc;
  const hoursFromCutoff = SLEEP_WINDOW_START_HOUR - 5;
  return new Date(previous.getTime() + hoursFromCutoff * 3_600_000);
}

function slotToInstant(windowStart: Date, slot: number): Date {
  return new Date(windowStart.getTime() + slot * SLEEP_SLOT_MINUTES * 60_000);
}

/**
 * Guarda un check-in completo de forma idempotente.
 *
 * Claves de idempotencia, todas armadas en el SERVIDOR:
 *   - cabecera: `checkin:<día>`
 *   - por métrica: `checkin:<día>:<key>`
 *
 * Que lleven `<key>` y no `<type>` es deliberado: los hábitos comparten
 * `type: "habit.check"`, así que una clave por tipo los colapsaría en uno solo
 * y el segundo chocaría contra el unique. Y que las arme el servidor y no el
 * cliente también: si el teléfono calcula el día, a las 2:30 de la mañana lo
 * calcula para el día equivocado.
 *
 * Reenviar el mismo check-in ACTUALIZA la fila; no crea una segunda.
 */
export async function saveCheckin(input: CheckinInput): Promise<{ written: number }> {
  const ld = input.logicalDate as LogicalDate;
  const now = new Date();
  const windowStart = sleepWindowStart(ld);

  /** Un instante dentro del día lógico, para los eventos que no tienen hora propia. */
  const middayOfDay = new Date(logicalDayBounds(ld).startUtc.getTime() + 8 * 3_600_000);

  const writes: {
    type: string;
    externalId: string;
    subjectId: string | null;
    occurredAt: Date;
    value: number | null;
    meta: Prisma.InputJsonObject;
  }[] = [];

  // --- Cabecera: SIEMPRE, incluso si no se contestó nada -------------------
  // Sin esta fila, la completitud no tiene numerador honesto: un día en que
  // abriste el formulario y saltaste todo se vería idéntico a un día en que
  // ni lo abriste. Y el chip "no sé" del sueño, por definición, no emite
  // evento de sueño.
  writes.push({
    type: "checkin.submitted",
    externalId: `checkin:${ld}`,
    subjectId: null,
    occurredAt: now,
    value: null,
    meta: {
      formVersion: FORM_VERSION,
      elapsedMs: input.elapsedMs,
      sleepAnswered: input.sleep !== null,
      energyAnswered: input.energy !== null,
      moodAnswered: input.mood !== null,
      habitsMarked: input.habits.length,
      energyAnchors: [...ENERGY_ANCHORS],
      moodAnchors: [...MOOD_ANCHORS],
    },
  });

  // --- Sueño ---------------------------------------------------------------
  if (input.sleep) {
    const { startSlot, endSlot } = input.sleep;
    if (endSlot <= startSlot) throw new Error("El sueño tiene que terminar después de empezar");
    const startAt = slotToInstant(windowStart, startSlot);
    const endAt = slotToInstant(windowStart, endSlot);
    // La duración se recalcula acá desde los extremos. La que haya computado
    // el navegador se ignora: es la regla del checklist §13.
    const durationMinutes = (endAt.getTime() - startAt.getTime()) / 60_000;
    const midpointAt = new Date(startAt.getTime() + (endAt.getTime() - startAt.getTime()) / 2);
    writes.push({
      type: "sleep.segment",
      externalId: `checkin:${ld}:sleep.duration`,
      subjectId: metricSubject("sleep.duration"),
      // El instante real de inicio. Con el corte de las 5 AM, dormirse a las
      // 23:00 atribuye el sueño al día anterior, que es justo lo que hace
      // falta para las correlaciones con lag 1 ("dormí mal y hoy no rindo").
      occurredAt: startAt,
      value: durationMinutes,
      meta: {
        formVersion: FORM_VERSION,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        midpointAt: midpointAt.toISOString(),
        precisionMinutes: SLEEP_SLOT_MINUTES,
      },
    });
  }

  // --- Escalas subjetivas --------------------------------------------------
  const scales: [string, number | null, readonly string[]][] = [
    ["energy", input.energy, ENERGY_ANCHORS],
    ["mood", input.mood, MOOD_ANCHORS],
  ];
  for (const [key, value, anchors] of scales) {
    if (value === null) continue; // ausencia != cero: simplemente no hay fila
    writes.push({
      type: `scale.${key}`,
      externalId: `checkin:${ld}:${key}`,
      subjectId: metricSubject(key),
      occurredAt: middayOfDay,
      value,
      meta: {
        formVersion: FORM_VERSION,
        anchor: anchors[value - 1] ?? null,
        points: anchors.length,
      },
    });
  }

  // --- Hábitos -------------------------------------------------------------
  for (const key of input.habits) {
    writes.push({
      type: "habit.check",
      externalId: `checkin:${ld}:${key}`,
      subjectId: metricSubject(key),
      occurredAt: middayOfDay,
      value: 1,
      meta: { formVersion: FORM_VERSION },
    });
  }

  // Upsert por (sourceKey, externalId): corregir el check-in del mismo día
  // actualiza las filas en vez de duplicarlas.
  await db.$transaction(
    writes.map((w) =>
      db.panelEvent.upsert({
        where: { sourceKey_externalId: { sourceKey: "manual", externalId: w.externalId } },
        create: {
          sourceKey: "manual",
          externalId: w.externalId,
          type: w.type,
          subjectId: w.subjectId,
          occurredAt: w.occurredAt,
          value: w.value,
          meta: w.meta,
        },
        update: {
          type: w.type,
          subjectId: w.subjectId,
          occurredAt: w.occurredAt,
          value: w.value,
          meta: w.meta,
          // recordedAt NO se toca: sigue diciendo cuándo se registró por
          // primera vez, que es lo que permite medir sesgo de recuerdo.
        },
      }),
    ),
  );

  // Un hábito desmarcado en una corrección tiene que DESAPARECER, no quedar
  // con value 1 de la carga anterior.
  const keptHabitIds = input.habits.map((k) => `checkin:${ld}:${k}`);
  await db.panelEvent.deleteMany({
    where: {
      sourceKey: "manual",
      type: "habit.check",
      externalId: { startsWith: `checkin:${ld}:`, notIn: keptHabitIds },
    },
  });

  return { written: writes.length };
}
