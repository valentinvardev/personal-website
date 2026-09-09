interface Props {
  values: (number | null)[];
  /** Dominio FIJO, pasado por quien sabe qué significa la serie. */
  domain: [number, number];
  width?: number;
  height?: number;
}

/**
 * Sparkline de una serie diaria.
 *
 * Dos decisiones que evitan que el gráfico mienta:
 *
 * 1. **Dominio fijo, nunca autoescala.** Con min/max automáticos, 28 días
 *    oscilando entre 3 y 4 se dibujan como una montaña rusa idéntica a la de
 *    alguien que fue de 1 a 5. Y una serie constante da rango cero y se pega
 *    al borde inferior, que se lee como el peor valor posible.
 *
 * 2. **Los nulls PARTEN la línea, no se interpolan.** Unir por encima de un
 *    hueco dibuja datos que no existen. Un tramo de un solo punto se dibuja
 *    como círculo, si no desaparece (una línea de un punto no se ve).
 */
export function Sparkline({ values, domain, width = 120, height = 28 }: Props) {
  const [min, max] = domain;
  const span = max - min || 1;
  const n = values.length;
  if (n === 0) return null;

  const x = (i: number) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    return height - ((clamped - min) / span) * height;
  };

  // Tramos contiguos de valores no nulos.
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

  if (runs.length === 0) {
    return (
      <svg className="spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
        <line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} className="spark__empty" />
      </svg>
    );
  }

  const last = runs[runs.length - 1]!.at(-1)!;

  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      {runs.map((run, k) =>
        run.length === 1 ? (
          <circle key={k} cx={x(run[0]!.i)} cy={y(run[0]!.v)} r={1.6} className="spark__dot" />
        ) : (
          <path
            key={k}
            className="spark__line"
            d={run.map((p, j) => `${j === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}
          />
        ),
      )}
      {/* El último valor se marca: es el que importa al mirar de reojo. */}
      <circle cx={x(last.i)} cy={y(last.v)} r={2.2} className="spark__last" />
    </svg>
  );
}
