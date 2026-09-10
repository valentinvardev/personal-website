import type { CompoundData } from "~/server/panel/overview";

/**
 * El gráfico que agrega todo, en dos lecturas de la misma serie diaria.
 *
 * **Acumulado** es la respuesta honesta al gráfico de Hábitos Atómicos: una
 * línea por hábito con los días cumplidos que llevás. Las líneas divergen solas
 * y con la misma forma de abanico, pero cada punto es un día que pasó, no un 1%
 * inventado. El porqué largo, con los números que descartaron la curva
 * compuesta del libro, está en `src/lib/panel/compound.ts`.
 *
 * **Analítico** es la misma información leída como tasa: la adherencia diaria
 * con su tendencia. Ahí una mala racha SÍ baja, que es lo que el acumulado no
 * puede mostrar porque nunca decrece.
 *
 * Sin `"use client"`. El cambio de vista son dos radios nativos y un `:has()`
 * en CSS, igual que `ScaleChoice` resuelve su escala sin JavaScript. Un
 * gráfico que solo cambia de pestaña no justifica hidratar la página.
 */

const W = 720;
const H = 240;
const PAD = { top: 12, right: 14, bottom: 26, left: 38 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Tres canales de distinción, no uno: el trazo y el gris. Igual que el heatmap
 *  separa sus estados por canal y no por opacidad, que a 11 px no se ve. */
const DASHES = ["", "7 4", "2 3", "11 4 2 4"];
const TONES = ["cmp__line--a", "cmp__line--b", "cmp__line--c"];

/** Tramos contiguos de valores no nulos: los huecos PARTEN la línea. */
function runsOf(values: readonly (number | null)[]): { i: number; v: number }[][] {
  const runs: { i: number; v: number }[][] = [];
  let current: { i: number; v: number }[] = [];
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (current.length > 0) runs.push(current);
      current = [];
    } else {
      current.push({ i, v });
    }
  });
  if (current.length > 0) runs.push(current);
  return runs;
}

function pathOf(run: { i: number; v: number }[], x: (i: number) => number, y: (v: number) => number) {
  return run.map((p, j) => `${j === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * El día lógico ya es "AAAA-MM-DD"; no se construye un `Date` solo para
 * formatearlo, que además haría que el navegador lo reinterprete en su zona.
 *
 * El año se imprime cuando los extremos caen en años distintos. Sin eso una
 * ventana de 365 días muestra "10 sep" y "9 sep", que se lee como un solo día
 * en vez de como un año entero.
 */
function shortDate(d: string, withYear: boolean): string {
  const [y, m, day] = d.split("-");
  const base = `${Number(day)} ${MESES[Number(m) - 1] ?? ""}`;
  return withYear ? `${base} ${y}` : base;
}

export function CompoundChart({ data }: { data: CompoundData }) {
  const { days, daily, trend, n, lines } = data;

  // Día 1 no dibuja un eje vacío: dice qué falta. Un gráfico en blanco con
  // ejes se lee como sistema roto, y lo único que pasa es que es nuevo.
  if (n === 0 || days.length === 0) {
    return (
      <section className="cmp">
        <h2>El compuesto</h2>
        <p className="cmp__empty">
          Todavía no hay ningún día cerrado que medir. Aparece solo, con el primer check-in.
        </p>
      </section>
    );
  }

  const last = days.length - 1;
  const x = (i: number) => PAD.left + (last === 0 ? PLOT_W / 2 : (i / last) * PLOT_W);

  // --- Vista acumulada -------------------------------------------------------
  const techo = Math.max(1, ...lines.map((l) => l.total));
  const yAcc = (v: number) => PAD.top + PLOT_H - (v / techo) * PLOT_H;

  // --- Vista analítica -------------------------------------------------------
  // Dominio FIJO [0,1]. La adherencia es una proporción: autoescalarla haría
  // que una semana entre 90% y 95% se dibuje igual que una entre 10% y 95%.
  const yAna = (v: number) => PAD.top + PLOT_H - Math.max(0, Math.min(1, v)) * PLOT_H;

  const cruzaAnio = days[0]!.slice(0, 4) !== days[last]!.slice(0, 4);
  const ejeX = (
    <>
      <line className="cmp__axis" x1={PAD.left} y1={PAD.top + PLOT_H} x2={W - PAD.right} y2={PAD.top + PLOT_H} />
      <text className="cmp__tick" x={PAD.left} y={H - 8} textAnchor="start">
        {shortDate(days[0]!, cruzaAnio)}
      </text>
      {days.length > 1 && (
        <text className="cmp__tick" x={W - PAD.right} y={H - 8} textAnchor="end">
          {shortDate(days[last]!, cruzaAnio)}
        </text>
      )}
    </>
  );

  return (
    <section className="cmp">
      <div className="cmp__head">
        <h2>El compuesto</h2>
        <div className="cmp__tabs" role="group" aria-label="Cómo leer la serie">
          <input type="radio" name="cmp-view" id="cmp-view-acc" defaultChecked className="cmp__radio" />
          <label htmlFor="cmp-view-acc">Acumulado</label>
          <input type="radio" name="cmp-view" id="cmp-view-ana" className="cmp__radio" />
          <label htmlFor="cmp-view-ana">Analítico</label>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      <div className="cmp__pane cmp__pane--acc">
        <p className="cmp__lead">
          Días cumplidos que llevás, hábito por hábito. Cada punto es un día que pasó.
        </p>
        <div className="cmp__scroll">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            role="img"
            aria-label={`Acumulado de días cumplidos en ${days.length} días: ${lines
              .map((l) => `${l.name} ${l.total}`)
              .join(", ")}`}
          >
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  className="cmp__grid"
                  x1={PAD.left}
                  y1={yAcc(techo * f)}
                  x2={W - PAD.right}
                  y2={yAcc(techo * f)}
                />
                <text className="cmp__tick" x={PAD.left - 6} y={yAcc(techo * f) + 3} textAnchor="end">
                  {Math.round(techo * f)}
                </text>
              </g>
            ))}
            {ejeX}
            {lines.map((l, k) =>
              runsOf(l.cumulative).map((run, r) => (
                <path
                  key={`${l.key}-${r}`}
                  className={`cmp__line ${TONES[k % TONES.length]}`}
                  strokeDasharray={DASHES[k % DASHES.length] || undefined}
                  d={
                    run.length === 1
                      ? `M${x(run[0]!.i).toFixed(1)},${yAcc(run[0]!.v).toFixed(1)} l0.01,0`
                      : pathOf(run, x, yAcc)
                  }
                />
              )),
            )}
          </svg>
        </div>
        <ul className="cmp__legend">
          {lines.map((l, k) => (
            <li key={l.key}>
              <span className={`cmp__key ${TONES[k % TONES.length]}`} data-dash={DASHES[k % DASHES.length] || "solid"} />
              <strong>{l.name}</strong>
              <span className="cmp__count">
                {l.total} de {l.evaluable}
              </span>
              {l.pace && (
                <span className={paceClass(l.pace.actual - l.pace.projected)}>
                  {formatDelta(l.pace.actual - l.pace.projected)} vs tu ritmo de arranque (
                  {Math.round(l.pace.startRate * 100)}%, n {l.pace.n})
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ---------------------------------------------------------------- */}
      <div className="cmp__pane cmp__pane--ana">
        <p className="cmp__lead">
          Adherencia de cada día y su tendencia. Acá una mala racha sí baja: el acumulado no puede
          mostrarla porque nunca decrece.
        </p>
        <div className="cmp__scroll">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            role="img"
            aria-label={`Adherencia diaria de ${n} días registrados sobre ${days.length}`}
          >
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line className="cmp__grid" x1={PAD.left} y1={yAna(f)} x2={W - PAD.right} y2={yAna(f)} />
                <text className="cmp__tick" x={PAD.left - 6} y={yAna(f) + 3} textAnchor="end">
                  {Math.round(f * 100)}%
                </text>
              </g>
            ))}
            {ejeX}
            {/* Los días crudos van, porque son EL dato: la tendencia es lo
                derivado. Pero a 365 puntos en 674 px se solapan en bandas, así
                que van livianos y chicos, y la tendencia es la que manda. */}
            {daily.map((v, i) =>
              v === null ? null : (
                <circle key={i} className="cmp__dot" cx={x(i)} cy={yAna(v)} r={1.2} />
              ),
            )}
            {runsOf(trend).map((run, r) => (
              <path
                key={r}
                className="cmp__trend"
                d={
                  run.length === 1
                    ? `M${x(run[0]!.i).toFixed(1)},${yAna(run[0]!.v).toFixed(1)} l0.01,0`
                    : pathOf(run, x, yAna)
                }
              />
            ))}
          </svg>
        </div>
        <p className="cmp__note">
          {n} {n === 1 ? "día registrado" : "días registrados"} sobre {days.length}. Los días sin
          registro parten la línea: no se rellenan.
        </p>
      </div>
    </section>
  );
}

function formatDelta(d: number): string {
  const r = Math.round(d);
  return r > 0 ? `+${r}` : String(r);
}

/** Verde y rojo solo cuando la diferencia es de al menos un día entero. Un
 *  redondeo a +0 pintado de verde afirma una mejora que no se midió. */
function paceClass(d: number): string {
  const r = Math.round(d);
  if (r > 0) return "cmp__pace num--good";
  if (r < 0) return "cmp__pace num--low";
  return "cmp__pace num--none";
}
