"use client";

interface Props {
  name: string;
  label: string;
  /** Anclas en palabras. Su cantidad define la escala (par o impar). */
  anchors: readonly string[];
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
}

/**
 * Escala de opciones con anclas en palabras.
 *
 * Por qué no es un slider de 1 a 10 (spec §5.2): con diez puntos se usan
 * efectivamente cuatro, siempre los del medio-alto. Y "7" no es un estado
 * estable entre meses, mientras que "con energía" sí ancla.
 *
 * La cantidad de puntos es una decisión por eje, no un estilo:
 *   - Energía va con escala PAR (sin neutro) para obligar a inclinarse.
 *   - Ánimo va con escala IMPAR, porque ahí el punto medio es un estado real.
 *
 * Implementado con radios nativos ocultos más labels estilados: eso da
 * navegación con flechas, Home/End y el anuncio "2 de 5" del lector de
 * pantalla sin escribir una línea de JavaScript. Ninguno arranca marcado.
 */
export function ScaleChoice({ name, label, anchors, value, onChange, hint }: Props) {
  return (
    <fieldset className="scale">
      <legend>
        {label}
        {hint && <span className="scale__hint">{hint}</span>}
      </legend>
      <div className="scale__opts" data-points={anchors.length}>
        {anchors.map((anchor, i) => {
          const v = i + 1;
          const id = `${name}-${v}`;
          return (
            <div key={anchor} className="scale__opt">
              <input
                type="radio"
                id={id}
                name={name}
                value={v}
                checked={value === v}
                onChange={() => onChange(v)}
              />
              <label htmlFor={id}>{anchor}</label>
            </div>
          );
        })}
      </div>
      {value !== null && (
        <button type="button" className="scale__clear" onClick={() => onChange(null)}>
          Borrar respuesta
        </button>
      )}
    </fieldset>
  );
}
