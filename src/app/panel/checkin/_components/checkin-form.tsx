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

export function CheckinForm({
  logicalDate,
  dayLabel,
  nightLabel,
  habits,
}: {
  logicalDate: string;
  dayLabel: string;
  nightLabel: string;
  habits: Habit[];
}) {
  const [done, setDone] = useState<string[]>([]);
  const [sleep, setSleep] = useState<SleepValue | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  // Cuánto tarda en completarse. Es el mejor detector de que las respuestas
  // se volvieron automáticas, y cuesta una línea. Arranca en la primera
  // interacción real, no al montar: si no, mediría cuánto tardaste en volver
  // a la pestaña.
  const startedAt = useRef<number | null>(null);
  const markStart = () => {
    startedAt.current ??= performance.now();
  };

  const submit = api.panel.submitCheckin.useMutation({
    onSuccess: () => setSaved(true),
  });

  const toggle = (key: string) => {
    markStart();
    setDone((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const onSubmit = () => {
    const elapsed = startedAt.current === null ? null : Math.round(performance.now() - startedAt.current);
    submit.mutate({
      logicalDate,
      habits: done,
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
          Quedó registrado el {dayLabel}. Si volvés a enviarlo, corrige el mismo día en vez de
          duplicarlo.
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
              const on = done.includes(h.key);
              return (
                <button
                  key={h.key}
                  type="button"
                  className={"ci-habit" + (on ? " is-on" : "")}
                  aria-pressed={on}
                  onClick={() => toggle(h.key)}
                >
                  <span className="ci-habit__name">{h.name}</span>
                  {h.unit !== "check" && h.targetValue !== null && (
                    <span className="ci-habit__target">
                      {h.targetValue}
                      {h.unit === "min" ? " min" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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
