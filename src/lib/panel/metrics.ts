/**
 * Métricas derivadas (tier 2 de la spec §4). Funciones puras sobre series
 * diarias: se computan on demand en los resolvers, no se persisten.
 *
 * Dos reglas atraviesan todo el módulo:
 *
 * 1. **La ausencia no es cero.** Un día sin dato es `null` y sale del
 *    DENOMINADOR. Nunca se imputa con la media: los días que faltan no faltan
 *    al azar (se saltea el registro justo los días caóticos), así que rellenar
 *    huecos sesga la serie hacia arriba. Spec §5.3.
 *
 * 2. **Toda métrica devuelve su tamaño de muestra.** Un promedio sin `n` no se
 *    puede auditar, y con `n` chico el dashboard imprime un guion en vez de un
 *    número convincente y falso. Spec §1, principios 2 y 3.
 */

/**
 * Resultado de una métrica derivada. `value` en null significa "no calculable",
 * y `reason` dice por qué. Nunca se devuelve 0 para representar "sin datos".
 */
export interface MetricResult {
  value: number | null;
  /** Observaciones que entraron al cálculo (el denominador real). */
  n: number;
  reason?: "sin-datos" | "muestra-chica";
}

/**
 * Versión de las fórmulas de este módulo. Al cambiar una definición se sube,
 * y el dashboard puede marcar el salto en el histórico como cambio de fórmula
 * y no como cambio de conducta. Spec §8.
 */
export const FORMULA_VERSION = 1;

const empty = (reason: MetricResult["reason"] = "sin-datos"): MetricResult => ({
  value: null,
  n: 0,
  reason,
});

/**
 * Adherencia: días cumplidos sobre días evaluables.
 *
 * `null` en la serie = día no evaluable (sin definición activa, o día
 * excluido por enfermedad o viaje) y sale del denominador. `false` = día que
 * se podía cumplir y no se cumplió: ése SÍ cuenta abajo. Spec §4.
 *
 * Umbrales de lectura: >80% verde, 50-80% amarillo, <50% el hábito está mal
 * diseñado (no es un problema de voluntad, es de diseño).
 */
export function adherence(days: readonly (boolean | null)[]): MetricResult {
  const evaluables = days.filter((d): d is boolean => d !== null);
  if (evaluables.length === 0) return empty();
  const hits = evaluables.filter(Boolean).length;
  return { value: hits / evaluables.length, n: evaluables.length };
}

/**
 * Completitud: proporción de días con check-in registrado.
 *
 * Es la métrica de confianza del sistema. Spec §4: si cae por debajo de 70%,
 * el tier 3 no es confiable, porque los días que faltan no faltan al azar.
 */
export function completeness(days: readonly boolean[]): MetricResult {
  if (days.length === 0) return empty();
  return { value: days.filter(Boolean).length / days.length, n: days.length };
}

/**
 * EWMA (media móvil exponencial). Reemplaza a la media móvil simple, que
 * tiene efecto escalón: un valor viejo saliendo de la ventana mueve el
 * promedio tanto como uno nuevo entrando.
 *
 * La siembra importa y la spec no la define: sembrar en 0 mete un sesgo hacia
 * abajo que tarda ~1/alpha muestras en disiparse (con alpha 0.07 son 14 días
 * de números falsos). Acá se siembra con la PRIMERA observación real, que es
 * insesgado desde el primer día.
 *
 * Los `null` se saltean: no arrastran el promedio ni cuentan como cero.
 */
export function ewma(values: readonly (number | null)[], alpha: number): MetricResult {
  if (!(alpha > 0 && alpha <= 1)) throw new RangeError(`alpha fuera de rango: ${alpha}`);
  let acc: number | null = null;
  let n = 0;
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) continue;
    n += 1;
    acc = acc === null ? v : alpha * v + (1 - alpha) * acc;
  }
  if (acc === null) return empty();
  return { value: acc, n };
}

/** Alphas de la spec §4: rápida para la tendencia, lenta para la base. */
export const ALPHA_FAST = 0.25;
export const ALPHA_SLOW = 0.07;

/**
 * Momentum: EWMA rápida sobre EWMA lenta. >1 acelerando, <1 desacelerando.
 *
 * Necesita que la EWMA lenta esté caliente: con alpha 0.07 son ~29
 * observaciones. Antes de eso devuelve null con "muestra-chica" en vez de un
 * número que parece información y no lo es.
 */
export function momentum(values: readonly (number | null)[]): MetricResult {
  const fast = ewma(values, ALPHA_FAST);
  const slow = ewma(values, ALPHA_SLOW);
  const warmup = Math.ceil(1 / ALPHA_SLOW) * 2; // ~29 observaciones
  if (fast.value === null || slow.value === null) return empty();
  if (slow.n < warmup) return { value: null, n: slow.n, reason: "muestra-chica" };
  if (slow.value === 0) return { value: null, n: slow.n, reason: "sin-datos" };
  return { value: fast.value / slow.value, n: slow.n };
}

/**
 * Consistencia: 1 - (desvío estándar / media). Adimensional, así que compara
 * entre escalas distintas (minutos de lectura contra cantidad de commits).
 *
 * Se usa el desvío POBLACIONAL, no muestral: la serie es la población de días
 * observados, no una muestra de un universo mayor.
 */
export function consistency(values: readonly (number | null)[]): MetricResult {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (xs.length < 2) return { value: null, n: xs.length, reason: "muestra-chica" };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (mean === 0) return { value: null, n: xs.length, reason: "sin-datos" };
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return { value: 1 - Math.sqrt(variance) / mean, n: xs.length };
}

/**
 * Ritmo requerido para llegar a un objetivo de cantidad. Reemplaza al
 * porcentaje de progreso: "66% a mitad de mes" tranquiliza, "necesitás
 * 1.9 h/día y venís a 1.3" es accionable. Spec §6.1.
 *
 * Con el objetivo ya alcanzado devuelve 0. Sin días restantes devuelve null:
 * el ritmo requerido es infinito y eso no es un número para mostrar.
 */
export function requiredPace(target: number, accumulated: number, daysLeft: number): MetricResult {
  const missing = target - accumulated;
  if (missing <= 0) return { value: 0, n: daysLeft };
  if (daysLeft <= 0) return { value: null, n: 0, reason: "sin-datos" };
  return { value: missing / daysLeft, n: daysLeft };
}

/** Formatea un MetricResult como porcentaje, o un guion si no es calculable. */
export function asPercent(r: MetricResult, digits = 0): string {
  if (r.value === null) return "—";
  return `${(r.value * 100).toFixed(digits)}%`;
}
