"use client";

import { useRef, useState } from "react";

import { Button, Note } from "~/components/geist";
import { ScaleChoice } from "~/components/panel/scale-choice";
import { SleepRange, type SleepValue } from "~/components/panel/sleep-range";
import {
  SLEEP_SLOTS,
  SLEEP_SLOT_MINUTES,
  durationLabel,
  wallLabel,
} from "~/lib/panel/format";
import { api } from "~/trpc/react";

/** Mismas anclas que el servidor; van al meta del evento para poder versionar. */
const ENERGY = ["Agotado", "Bajo", "Bien", "Con energía"] as const;
const MOOD = ["Mal", "Bajo", "Neutro", "Bien", "Muy bien"] as const;

interface Habit {
  key: string;
  name: string;
  unit: string;
  targetValue: number | null;
}

export interface CheckinInitial {
  habits: { key: string; amount: number | null }[];
  sleep: SleepValue | null;
  energy: number | null;
  mood: number | null;
  exists: boolean;
}

export function CheckinForm({
  logicalDate,
  dayLabel,
  nightLabel,
  habits,
  initial,
}: {
  logicalDate: string;
  dayLabel: string;
  nightLabel: string;
  habits: Habit[];
  initial: CheckinInitial;
}) {
  /**
   * El formulario arranca con lo que YA está guardado de hoy.
   *
   * La spec §5.2 prohíbe mostrar la respuesta de ayer (el anclaje es real y
   * comprime la variabilidad). No prohíbe mostrar la de hoy, y sin esto
   * entrar a la tarde a cargar el ánimo borraba los hábitos de la mañana,
   * porque el envío nuevo no los incluía.
   */
  const [done, setDone] = useState<Map<string, number | null>>(
    () => new Map(initial.habits.map((h) => [h.key, h.amount])),
  );
  const [sleep, setSleep] = useState<SleepValue | null>(initial.sleep);
  const [energy, setEnergy] = useState<number | null>(initial.energy);
  const [mood, setMood] = useState<number | null>(initial.mood);
  const [saved, setSaved] = useState(false);

  // Cuánto tarda en completarse. Arranca en la primera interacción real, no
  // al montar: si no, mediría cuánto tardaste en volver a la pestaña.
  const startedAt = useRef<number | null>(null);
  const markStart = () => {
    startedAt.current ??= performance.now();
  };

  const utils = api.useUtils();
  const submit = api.panel.submitCheckin.useMutation({
    onSuccess: () => {
      setSaved(true);
      void utils.panel.invalidate();
    },
  });

  const toggle = (key: string) => {
    markStart();
    setDone((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, null);
      return next;
    });
  };

  const setAmount = (key: string, raw: string) => {
    markStart();
    setDone((prev) => {
      const next = new Map(prev);
      next.set(key, raw === "" ? null : Number(raw));
      return next;
    });
  };

  const onSubmit = () => {
    const elapsed =
      startedAt.current === null ? null : Math.round(performance.now() - startedAt.current);
    submit.mutate({
      logicalDate,
      habits: [...done].map(([key, amount]) => ({ key, amount })),
      sleep,
      energy,
      mood,
      elapsedMs: elapsed !== null && elapsed <= 10 * 60 * 1000 ? elapsed : null,
    });
  };

  if (saved) {
    return (
      <div className="panel-page">
        <div className="eyebrow">Check-in</div>
        <h1>Guardado</h1>
        <p className="panel-lead">
          Quedó registrado el {dayLabel}. Si volvés a entrar, vas a ver lo que cargaste y podés
          corregirlo.
        </p>
        <Button variant="secondary" onClick={() => setSaved(false)}>
          Corregir
        </Button>
      </div>
    );
  }

  return (
    <div className="panel-page" onPointerDown={markStart}>
      <div className="eyebrow">Check-in</div>
      <h1>{dayLabel}</h1>
      {initial.exists && (
        <p className="ci-sub">Ya cargaste este día. Lo que ves es lo guardado; podés corregirlo.</p>
      )}

      <section className="ci-block">
        <h2>Sueño</h2>
        <p className="ci-sub">Marcá {nightLabel}.</p>
        <SleepRange
          slots={SLEEP_SLOTS}
          slotMinutes={SLEEP_SLOT_MINUTES}
          value={sleep}
          onChange={(v) => {
            markStart();
            setSleep(v);
          }}
          labelFor={wallLabel}
          durationLabel={durationLabel}
        />
      </section>

      <section className="ci-block">
        <ScaleChoice
          name="energy"
          label="Energía"
          hint="cuánta batería tenés"
          anchors={ENERGY}
          value={energy}
          onChange={(v) => {
            markStart();
            setEnergy(v);
          }}
        />
      </section>

      <section className="ci-block">
        <ScaleChoice
          name="mood"
          label="Ánimo"
          hint="cómo te sentís"
          anchors={MOOD}
          value={mood}
          onChange={(v) => {
            markStart();
            setMood(v);
          }}
        />
      </section>

      {habits.length > 0 && (
        <section className="ci-block">
          <h2>Hábitos</h2>
          <div className="ci-habits">
            {habits.map((h) => {
              const on = done.has(h.key);
              const amount = done.get(h.key) ?? null;
              const needsAmount = h.unit !== "check";
              return (
                <div key={h.key} className={"ci-habit" + (on ? " is-on" : "")}>
                  <button
                    type="button"
                    className="ci-habit__toggle"
                    aria-pressed={on}
                    onClick={() => toggle(h.key)}
                  >
                    <span className="ci-habit__name">{h.name}</span>
                    {!needsAmount && h.targetValue !== null && (
                      <span className="ci-habit__target">{h.targetValue}</span>
                    )}
                  </button>
                  {/* La cantidad real. Sin esto, marcar "Leer" escribía 1
                      contra un target de 30 y el sistema te decía que
                      fallaste el día que cumpliste. Vacío significa "lo hice
                      pero no sé cuánto": vale como cumplido, con el total
                      desconocido. */}
                  {on && needsAmount && (
                    <label className="ci-habit__amount">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={h.unit === "min" ? 5 : 1}
                        placeholder={String(h.targetValue ?? "")}
                        value={amount === null ? "" : String(amount)}
                        onChange={(e) => setAmount(h.key, e.target.value)}
                        aria-label={`Cantidad de ${h.name}`}
                      />
                      <span>{h.unit === "min" ? "min" : "u"}</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <p className="ci-sub">
            Si dejás la cantidad vacía cuenta como cumplido, sin registrar cuánto.
          </p>
        </section>
      )}

      {submit.isError && (
        <Note type="error" label="No se guardó">
          {submit.error.message}
        </Note>
      )}

      <div className="ci-actions">
        <Button variant="primary" size="large" fullWidth loading={submit.isPending} onClick={onSubmit}>
          Guardar
        </Button>
        <p className="ci-note">
          Lo que dejes sin contestar queda como sin dato, no como cero.
        </p>
      </div>
    </div>
  );
}
