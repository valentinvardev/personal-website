/**
 * El gráfico compuesto: dos lecturas de la misma serie diaria.
 *
 * ---------------------------------------------------------------------------
 * Por qué NO se compone al estilo de Hábitos Atómicos
 * ---------------------------------------------------------------------------
 * La curva famosa del libro (1.01^365 = 37.78 contra 0.99^365 = 0.03) es
 * motivadora porque no mide a nadie: asume un 1% diario inventado. Aplicarla a
 * datos reales se rompe en tres lugares, y los tres se midieron antes de
 * descartarla:
 *
 * 1. **El punto neutro decide el resultado.** Con la misma serie (72% de
 *    adherencia sostenida un año) y un factor `1 + r*(a - neutro)`, el
 *    acumulado a 365 días va de 54x con neutro 0.5 a 0.006x con neutro 1.0.
 *    Cuatro órdenes de magnitud de diferencia salidos de una constante que
 *    elige el que programa, no de la conducta que se quiere medir.
 *
 * 2. **La asimetría.** El libro compara 1.01 contra 0.99, simétricos. Con
 *    neutro 0.8 el mejor día posible vale +1.00% y el peor -4.00%: la curva de
 *    abajo cae mucho más rápido de lo que la de arriba sube, así que el
 *    gráfico castiga por construcción.
 *
 * 3. **Es un error de tipo.** La adherencia está acotada en [0,1]: es un
 *    caudal, no un stock. No puede componer. La curva del libro es una
 *    afirmación sobre el rendimiento de algo que se acumula.
 *
 * ---------------------------------------------------------------------------
 * Qué se dibuja en su lugar
 * ---------------------------------------------------------------------------
 * El MENSAJE del libro ("diferencias chicas y sostenidas se acumulan en
 * diferencias enormes") sí es representable sin inventar nada: el acumulado de
 * días cumplidos por hábito. Las líneas divergen solas, con la misma forma de
 * abanico, y cada punto es un día que pasó. Un hábito en bajón dibuja una
 * meseta de verdad, sin prometer ningún despegue posterior.
 *
 * Lo que se pierde: el acumulado nunca baja, así que una mala racha se lee
 * como meseta y no como caída. Ese drama era justo la parte inventada. La
 * caída se ve en la otra vista, donde la pendiente sí baja.
 */

import { ALPHA_SLOW } from "./metrics.ts";

/** Una línea del gráfico acumulado: un hábito a lo largo de la ventana. */
export interface CompoundLine {
  key: string;
  name: string;
  /**
   * Acumulado de días cumplidos. `null` antes de que la métrica existiera, y
   * ahí la línea directamente no arranca: una métrica creada el día 40 no
   * puede tener un acumulado el día 39.
   */
  cumulative: (number | null)[];
  /** Días cumplidos en toda la ventana. Es el último valor no nulo. */
  total: number;
  /** Días que se podían cumplir. El denominador honesto de `total`. */
  evaluable: number;
}

/**
 * Acumulado de días cumplidos de una serie diaria.
 *
 * La serie viene como 1 (cumplido), 0 (no cumplido) y `null` (no evaluable:
 * la métrica no existía, el día está excluido, o el día todavía no cerró).
 *
 * Un `null` NO suma y NO corta el acumulado: la línea sigue plana y continúa
 * después. Eso es exacto: no cumpliste ese día porque no había nada que
 * cumplir, no porque hayas fallado. Lo único que sí corta es el arranque,
 * porque antes de la primera observación la línea no existe.
 */
export function cumulativeLine(
  key: string,
  name: string,
  series: readonly (number | null)[],
): CompoundLine {
  const cumulative: (number | null)[] = [];
  let acc = 0;
  let evaluable = 0;
  let started = false;

  for (const v of series) {
    if (v !== null) {
      started = true;
      evaluable += 1;
      if (v > 0) acc += 1;
    }
    cumulative.push(started ? acc : null);
  }

  return { key, name, cumulative, total: acc, evaluable };
}

/**
 * El contrafactual honesto: tu propio ritmo de arranque, proyectado.
 *
 * No inventa un 1% sacado de un libro. Toma la tasa de los primeros
 * `warmupDays` días EVALUABLES y la extiende sobre los días evaluables
 * posteriores. La brecha contra lo que pasó de verdad dice si mejoraste o
 * aflojaste respecto de vos mismo, que es la única comparación disponible en
 * un sistema de un solo usuario.
 *
 * Devuelve `null` mientras no haya al menos `warmupDays` evaluables de arranque
 * MÁS un día posterior: sin eso la proyección se compara consigo misma y
 * siempre da cero, que parece información y no lo es.
 */
export interface PaceProjection {
  /** Tasa de cumplimiento del arranque, en [0,1]. */
  startRate: number;
  /** Días que habrías acumulado sosteniendo esa tasa. */
  projected: number;
  /** Los que acumulaste. */
  actual: number;
  /** Días evaluables del arranque. Es el `n` de `startRate`. */
  n: number;
}

export function paceProjection(
  series: readonly (number | null)[],
  warmupDays: number,
): PaceProjection | null {
  if (warmupDays < 1) throw new RangeError(`warmupDays inválido: ${warmupDays}`);

  let warmupEvaluable = 0;
  let warmupHits = 0;
  let laterEvaluable = 0;
  let laterHits = 0;

  for (const v of series) {
    if (v === null) continue;
    if (warmupEvaluable < warmupDays) {
      warmupEvaluable += 1;
      if (v > 0) warmupHits += 1;
    } else {
      laterEvaluable += 1;
      if (v > 0) laterHits += 1;
    }
  }

  if (warmupEvaluable < warmupDays || laterEvaluable === 0) return null;

  const startRate = warmupHits / warmupEvaluable;
  return {
    startRate,
    projected: warmupHits + startRate * laterEvaluable,
    actual: warmupHits + laterHits,
    n: warmupEvaluable,
  };
}

/**
 * Serie de EWMA para dibujar la tendencia de la vista analítica.
 *
 * `metrics.ewma` devuelve un solo número (el estado final); para una línea
 * hace falta el valor en cada paso. Se siembra con la primera observación real,
 * igual que allá: sembrar en cero mete un sesgo hacia abajo que tarda ~1/alpha
 * muestras en disiparse.
 *
 * Los días sin observación devuelven `null` y PARTEN la línea, no la
 * interpolan. Es la misma regla que sostiene `Sparkline`: unir por encima de un
 * hueco dibuja datos que no existen. El acumulador sobrevive al hueco, así que
 * al otro lado la tendencia continúa desde donde estaba en vez de resembrarse.
 *
 * El alpha por defecto es el LENTO (~14 días de memoria efectiva) y no el
 * rápido. Con el rápido la línea copia el ruido diario: dibuja lo mismo que los
 * puntos, encima de los puntos, y deja de ser una tendencia para ser una
 * repetición más gruesa del mismo dato.
 */
export function ewmaSeries(
  values: readonly (number | null)[],
  alpha: number = ALPHA_SLOW,
): (number | null)[] {
  if (!(alpha > 0 && alpha <= 1)) throw new RangeError(`alpha fuera de rango: ${alpha}`);
  let acc: number | null = null;
  return values.map((v) => {
    if (v === null || !Number.isFinite(v)) return null;
    acc = acc === null ? v : alpha * v + (1 - alpha) * acc;
    return acc;
  });
}

/**
 * Días evaluables de una serie. Es el `n` que acompaña a todo lo que se dibuja:
 * una línea de 300 días de largo construida sobre 4 observaciones no es una
 * tendencia, y la vista tiene que poder decirlo.
 */
export function evaluableCount(values: readonly (number | null)[]): number {
  return values.reduce<number>((acc, v) => acc + (v === null ? 0 : 1), 0);
}
