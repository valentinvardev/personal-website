import "server-only";

import { z } from "zod";

import {
  SLEEP_SLOTS,
  SLEEP_SLOT_MINUTES,
  SLEEP_WINDOW_START_HOUR,
} from "~/lib/panel/format";
import {
  CUTOFF_HOUR,
  addDays,
  logicalDayBounds,
  parseLogicalDate,
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
  /**
   * Hábitos cumplidos.
   *
   * `amount` es la cantidad real para los hábitos que se miden en minutos o
   * en unidades. Sin él, marcar "Leer" (target 30) escribiría `value: 1`,
   * `bucket.ts` compararía `1 >= 30` y el sistema te diría que fallaste
   * justo el día que cumpliste: la peor forma del principio 2 de la spec.
   *
   * `null` significa "lo hice pero no sé cuánto": vale como cumplido y el
   * total queda desconocido, en vez de inventar la cantidad del target.
   */
  habits: z
    .array(
      z.object({
        key: z.string().min(1).max(80),
        amount: z.number().min(0).max(100_000).nullable().default(null),
      }),
    )
    .max(20)
    .default([]),
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
  const hoursFromCutoff = SLEEP_WINDOW_START_HOUR - CUTOFF_HOUR;
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
  // parseLogicalDate, no un cast: el cast anula el tipo branded que existe
  // justo para esto, y deja pasar "2026-02-31", que Date.UTC normaliza en
  // silencio a marzo.
  const ld = parseLogicalDate(input.logicalDate);
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
        // El dia al que pertenece este sueno. occurredAt guarda el instante
        // real de inicio (dato crudo, spec 5.1), pero la ventana de sueno
        // cruza el corte de las 5 AM: sin esto, acostarse a las 23:00 lo
        // atribuye al dia anterior y acostarse a las 6:00 al mismo dia, y
        // dos noches podrian caer juntas y sumarse en una de 15 horas.
        logicalDate: ld,
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
  for (const h of input.habits) {
    writes.push({
      type: "habit.check",
      externalId: `checkin:${ld}:${h.key}`,
      subjectId: metricSubject(h.key),
      occurredAt: middayOfDay,
      // La cantidad real si la dijiste; null si solo lo marcaste. Nunca el
      // target: eso seria inventar un dato que no medimos.
      value: h.amount,
      meta: { formVersion: FORM_VERSION, amountGiven: h.amount !== null },
    });
  }

  // Todo lo que este envío deja escrito para el día. Lo que no esté acá y
  // exista en la base se borra: es cómo se desmarca un hábito o se borra una
  // respuesta.
  //
  // Esto es seguro SOLO porque el formulario precarga lo que ya está guardado
  // (`loadCheckin`). Sin esa precarga, entrar a la tarde solo a marcar un
  // hábito borraría el sueño y las escalas de la mañana.
  const keep = writes.map((w) => w.externalId);

  await db.$transaction([
    // Dentro de la transacción, no después: si el proceso muere en el medio,
    // no puede quedar un día a medio borrar.
    db.panelEvent.deleteMany({
      where: {
        sourceKey: "manual",
        externalId: { startsWith: `checkin:${ld}:`, notIn: keep },
      },
    }),
    ...writes.map((w) =>
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
  ]);

  return { written: writes.length };
}

/**
 * Lo que ya está guardado del check-in de un día, para precargar el formulario.
 *
 * La spec §5.2 prohíbe mostrar la respuesta de AYER, porque el anclaje es real
 * y comprime la variabilidad. No prohíbe mostrar la de HOY: sin eso, entrar a
 * la tarde a corregir una cosa borra todo lo demás, y los botones "Borrar" de
 * la UI prometen una acción que el backend no puede ejecutar.
 *
 * Por eso esta función es explícita y se llama solo con el día en curso.
 */
export async function loadCheckin(ld: LogicalDate): Promise<{
  habits: { key: string; amount: number | null }[];
  sleep: { startSlot: number; endSlot: number } | null;
  energy: number | null;
  mood: number | null;
  exists: boolean;
}> {
  const rows = await db.panelEvent.findMany({
    where: { sourceKey: "manual", externalId: { startsWith: `checkin:${ld}` } },
    select: { externalId: true, type: true, value: true, meta: true },
  });

  const habits: { key: string; amount: number | null }[] = [];
  let sleep: { startSlot: number; endSlot: number } | null = null;
  let energy: number | null = null;
  let mood: number | null = null;
  let exists = false;

  const windowStart = sleepWindowStart(ld).getTime();
  for (const r of rows) {
    if (r.externalId === `checkin:${ld}`) {
      exists = true;
      continue;
    }
    const key = r.externalId.slice(`checkin:${ld}:`.length);
    if (r.type === "habit.check") habits.push({ key, amount: r.value });
    else if (r.type === "scale.energy") energy = r.value;
    else if (r.type === "scale.mood") mood = r.value;
    else if (r.type === "sleep.segment") {
      const meta = r.meta as { startAt?: unknown; endAt?: unknown } | null;
      if (typeof meta?.startAt === "string" && typeof meta?.endAt === "string") {
        const toSlot = (iso: string): number =>
          Math.round((new Date(iso).getTime() - windowStart) / (SLEEP_SLOT_MINUTES * 60_000));
        sleep = { startSlot: toSlot(meta.startAt), endSlot: toSlot(meta.endAt) };
      }
    }
  }

  return { habits, sleep, energy, mood, exists };
}
