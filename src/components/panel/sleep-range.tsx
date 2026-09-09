"use client";

import { useCallback, useRef, useState } from "react";

export interface SleepValue {
  startSlot: number;
  endSlot: number;
}

interface Props {
  /** Cantidad de posiciones en la ventana (80 = 20 h en pasos de 15 min). */
  slots: number;
  /** Minutos que representa cada slot. */
  slotMinutes: number;
  value: SleepValue | null;
  onChange: (v: SleepValue | null) => void;
  /** Minutos desde el inicio de la ventana -> "HH:MM". Aritmética pura. */
  labelFor: (minutesFromStart: number) => string;
  /** Minutos -> "7 h 45 min". */
  durationLabel: (minutes: number) => string;
}

/**
 * Selector de segmento de sueño.
 *
 * La spec §5.1 pide tres cosas que ningún control estándar da junto:
 *
 * 1. **Sin posición por defecto.** Un doble slider siempre renderiza sus dos
 *    thumbs en algún lado, y ese lugar se vuelve el ancla desde la que uno
 *    ajusta en vez de marcar desde cero. Eso comprime artificialmente la
 *    variabilidad, que es justo la variable de interés. Acá el control
 *    arranca VACÍO: no hay thumbs hasta que se dibuja el primer segmento.
 *
 * 2. **Origen a las 18:00.** Con origen a medianoche, el sueño queda partido
 *    en los dos extremos de la barra.
 *
 * 3. **Snap de 15 minutos.** ±7 min de ruido contra una señal que se mide en
 *    horas es una relación de 10 a 1: no vale la pena pedir más precisión.
 *
 * El gesto primario es UN arrastre: apoyar donde uno se durmió y soltar donde
 * se despertó. Un toque sin desplazamiento no hace nada (no inventa un
 * segmento de cero minutos ni deja un thumb en una posición arbitraria).
 *
 * Los dos campos de hora de abajo no son un extra: son la vía accesible por
 * teclado y lector de pantalla, y en escritorio suelen ser más rápidos.
 */
export function SleepRange({
  slots,
  slotMinutes,
  value,
  onChange,
  labelFor,
  durationLabel,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ anchor: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const slotFromClientX = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(slots, Math.round(ratio * slots)));
    },
    [slots],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const slot = slotFromClientX(e.clientX);
    // Si ya hay un segmento y el toque cae cerca de un extremo, se arrastra
    // ese extremo; si no, se dibuja uno nuevo desde cero.
    let anchor = slot;
    if (value) {
      const nearStart = Math.abs(slot - value.startSlot);
      const nearEnd = Math.abs(slot - value.endSlot);
      const grabRadius = Math.max(2, Math.round(slots * 0.04));
      if (Math.min(nearStart, nearEnd) <= grabRadius) {
        anchor = nearStart <= nearEnd ? value.endSlot : value.startSlot;
      }
    }
    dragRef.current = { anchor, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const slot = slotFromClientX(e.clientX);
    if (slot === drag.anchor && !drag.moved) return;
    drag.moved = true;
    const startSlot = Math.min(drag.anchor, slot);
    const endSlot = Math.max(drag.anchor, slot);
    if (endSlot > startSlot) onChange({ startSlot, endSlot });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    // Un toque sin arrastre NO marca nada: se vuelve a intentar arrastrando.
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  /** "HH:MM" -> slot, o null si cae fuera de la ventana. */
  const timeToSlot = (time: string): number | null => {
    const m = /^(\d{2}):(\d{2})$/.exec(time);
    if (!m) return null;
    const minutesOfDay = Number(m[1]) * 60 + Number(m[2]);
    // La ventana arranca a las 18:00; todo lo anterior pertenece al día
    // siguiente dentro de la misma ventana.
    const fromStart = (minutesOfDay - 18 * 60 + 1440) % 1440;
    const slot = Math.round(fromStart / slotMinutes);
    return slot >= 0 && slot <= slots ? slot : null;
  };

  const slotToTime = (slot: number): string => labelFor(slot * slotMinutes);

  const setEdge = (edge: "start" | "end", time: string) => {
    const slot = timeToSlot(time);
    if (slot === null) return;
    const current = value ?? { startSlot: slot, endSlot: slot };
    const next =
      edge === "start"
        ? { startSlot: slot, endSlot: current.endSlot }
        : { startSlot: current.startSlot, endSlot: slot };
    if (next.endSlot > next.startSlot) onChange(next);
  };

  const pct = (slot: number) => (slot / slots) * 100;
  const minutes = value ? (value.endSlot - value.startSlot) * slotMinutes : 0;

  // Marcas cada 3 horas.
  const ticks: number[] = [];
  for (let s = 0; s <= slots; s += (3 * 60) / slotMinutes) ticks.push(s);

  return (
    <div className="sleep">
      <div className="sleep__head">
        <span className="sleep__legend">
          {value ? (
            <>
              <strong>{durationLabel(minutes)}</strong>
              <span className="sleep__range">
                {slotToTime(value.startSlot)} a {slotToTime(value.endSlot)}
              </span>
            </>
          ) : (
            <span className="sleep__hint">Arrastrá desde que te dormiste hasta que te despertaste</span>
          )}
        </span>
        {value && (
          <button type="button" className="sleep__clear" onClick={() => onChange(null)}>
            Borrar
          </button>
        )}
      </div>

      <div
        ref={trackRef}
        className={"sleep__track" + (dragging ? " is-dragging" : "")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="presentation"
      >
        {ticks.map((s) => (
          <span key={s} className="sleep__tick" style={{ left: `${pct(s)}%` }}>
            <i />
            <em>{slotToTime(s)}</em>
          </span>
        ))}
        {value && (
          <span
            className="sleep__fill"
            style={{ left: `${pct(value.startSlot)}%`, width: `${pct(value.endSlot - value.startSlot)}%` }}
          >
            <i className="sleep__handle sleep__handle--a" />
            <i className="sleep__handle sleep__handle--b" />
          </span>
        )}
      </div>

      <div className="sleep__inputs">
        <label>
          <span>Me dormí</span>
          <input
            type="time"
            step={slotMinutes * 60}
            value={value ? slotToTime(value.startSlot) : ""}
            onChange={(e) => setEdge("start", e.target.value)}
          />
        </label>
        <label>
          <span>Me desperté</span>
          <input
            type="time"
            step={slotMinutes * 60}
            value={value ? slotToTime(value.endSlot) : ""}
            onChange={(e) => setEdge("end", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
