import { weekdayOf, type LogicalDate } from "~/lib/panel/logical-date";

interface Day {
  date: string;
  value: number | null;
  evaluable: number;
}

/**
 * Heatmap anual, estilo contribuciones: 53 semanas por 7 días.
 *
 * La decisión que hace que se lea: **los tres estados se separan por canal,
 * no por opacidad.** Los tokens de alfa del sistema (`--ds-gray-alpha-200` es
 * negro al 8%, `-300` al 10%) son indistinguibles en una celda de 11 px, así
 * que "cero" y "sin datos" se verían iguales, y eso es exactamente la
 * confusión que el sistema no puede permitirse:
 *
 *   - **Sin datos**: transparente con borde punteado. No pasó nada que
 *     sepamos.
 *   - **Cero**: gris sólido claro. Había algo que cumplir y no se cumplió.
 *   - **Rampa**: cuatro grises sólidos crecientes según la proporción.
 *
 * Un día sin registrar y un día en que fallaste no son lo mismo, y el
 * dashboard no puede sugerir que sí.
 */
export function HeatmapYear({ days }: { days: Day[] }) {
  if (days.length === 0) return null;

  const CELL = 11;
  const GAP = 2;
  const step = CELL + GAP;

  const firstOffset = weekdayOf(days[0]!.date as LogicalDate);
  const total = firstOffset + days.length;
  const weeks = Math.ceil(total / 7);
  const width = weeks * step;
  const height = 7 * step;

  return (
    <div className="heat" role="img" aria-label={`Actividad de los últimos ${days.length} días`}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        {days.map((d, i) => {
          const pos = firstOffset + i;
          const x = Math.floor(pos / 7) * step;
          const y = (pos % 7) * step;
          const cls = classFor(d);
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={2}
              className={cls}
            >
              <title>{titleFor(d)}</title>
            </rect>
          );
        })}
      </svg>
      <div className="heat__legend">
        <span className="heat__swatch heat--empty" /> sin datos
        <span className="heat__swatch heat--zero" /> nada cumplido
        <span className="heat__swatch heat--l2" />
        <span className="heat__swatch heat--l4" /> todo cumplido
      </div>
    </div>
  );
}

function classFor(d: Day): string {
  if (d.value === null || d.evaluable === 0) return "heat--empty";
  if (d.value === 0) return "heat--zero";
  if (d.value <= 0.34) return "heat--l1";
  if (d.value <= 0.67) return "heat--l2";
  if (d.value < 1) return "heat--l3";
  return "heat--l4";
}

function titleFor(d: Day): string {
  if (d.value === null || d.evaluable === 0) return `${d.date}: sin datos`;
  return `${d.date}: ${Math.round(d.value * 100)}% (${d.evaluable} evaluables)`;
}
