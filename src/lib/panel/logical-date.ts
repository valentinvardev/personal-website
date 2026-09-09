/**
 * El día lógico: la ÚNICA función del sistema que decide a qué día pertenece
 * un instante. Spec §3.3.
 *
 * Reglas que este módulo existe para hacer cumplir:
 *
 * 1. Los instantes se guardan siempre en UTC (`timestamptz`). Acá se convierten
 *    a la hora de pared de Buenos Aires y se les aplica el corte de las 5 AM:
 *    lo hecho a las 2 de la mañana pertenece al día anterior.
 *
 * 2. Un día lógico NO es un instante: es un día de calendario con el corte ya
 *    aplicado. Por eso se representa como `LogicalDate`, un string
 *    "YYYY-MM-DD" con marca de tipo, y nunca como Date. Un Date obliga a
 *    elegir una hora, y esa hora se corre de día apenas alguien la formatea
 *    en otra zona. Ese es el bug clásico y acá no se puede escribir.
 *
 * 3. La zona se resuelve contra la base de datos de zonas horarias (`Intl`),
 *    nunca con un offset constante. Buenos Aires es UTC-3 hoy, pero estuvo en
 *    UTC-2 en enero de 2008 y 2009: un `-180` hardcodeado corre un día en
 *    cualquier dato histórico.
 *
 * 4. Nada de esto depende del `TZ` del proceso ni de la zona del navegador.
 *    Las funciones dan el mismo resultado corriendo en el VPS, en tu máquina
 *    o en un teléfono en Madrid.
 *
 * Módulo puro: sin Prisma, sin `server-only`, sin imports del repo. Se testea
 * con `node --test` sin base de datos.
 */

/** Zona de referencia del sistema. Toda conversión pasa por acá. */
export const PANEL_TZ = "America/Argentina/Buenos_Aires";

/**
 * Hora local a la que empieza un día lógico. Decidido en 5: un corte temprano
 * parte una sesión de trabajo nocturna en dos días, uno tardío solo hace que
 * un madrugón raro cuente para el día anterior. El error es asimétrico.
 *
 * NO se cambia sin recomputar todo el histórico (`panel-job rollup --all`).
 */
export const CUTOFF_HOUR = 5;

declare const LOGICAL_DATE: unique symbol;

/**
 * Día de calendario con el corte ya aplicado, en formato "YYYY-MM-DD".
 * La marca de tipo impide pasar un string cualquiera donde se espera un día
 * lógico: solo las funciones de este módulo pueden producir uno.
 */
export type LogicalDate = string & { readonly [LOGICAL_DATE]: true };

const WALL = new Intl.DateTimeFormat("en-US", {
  timeZone: PANEL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

interface Wall {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
  s: number;
}

/** Hora de pared en Buenos Aires para un instante dado. */
function wallClock(ts: Date): Wall {
  const parts = WALL.formatToParts(ts);
  const read = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Intl no devolvió "${type}" para ${PANEL_TZ}`);
    return Number(part.value);
  };
  return {
    y: read("year"),
    m: read("month"),
    d: read("day"),
    h: read("hour"),
    min: read("minute"),
    s: read("second"),
  };
}

/**
 * Offset de la zona (en ms) vigente en ese instante. Se calcula interpretando
 * la hora de pared como si fuera UTC y restando el instante real.
 */
function offsetMs(ts: Date): number {
  const w = wallClock(ts);
  const asIfUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s);
  return asIfUtc - Math.floor(ts.getTime() / 1000) * 1000;
}

/**
 * Hora de pared de Buenos Aires -> instante UTC. Se refina una vez porque el
 * offset depende del instante que estamos buscando: la primera pasada usa un
 * offset aproximado y la segunda ya cae del lado correcto de un cambio de hora.
 */
function zonedToUtc(y: number, m: number, d: number, h: number, min = 0): Date {
  const target = Date.UTC(y, m - 1, d, h, min);
  const first = target - offsetMs(new Date(target));
  const refined = target - offsetMs(new Date(first));
  return new Date(refined);
}

const pad = (n: number, width = 2): string => String(n).padStart(width, "0");

function build(y: number, m: number, d: number): LogicalDate {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}` as LogicalDate;
}

/** Partes de un día lógico. Aritmética de calendario pura, sin zonas. */
function split(ld: LogicalDate): { y: number; m: number; d: number } {
  const y = Number(ld.slice(0, 4));
  const m = Number(ld.slice(5, 7));
  const d = Number(ld.slice(8, 10));
  return { y, m, d };
}

const SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A qué día lógico pertenece un instante. Ésta es la función; ningún otro
 * lugar del código decide esto.
 */
export function logicalDate(ts: Date): LogicalDate {
  if (Number.isNaN(ts.getTime())) throw new RangeError("logicalDate: fecha inválida");
  const w = wallClock(ts);
  if (w.h >= CUTOFF_HOUR) return build(w.y, w.m, w.d);
  // Antes del corte: pertenece al día anterior. Aritmética en UTC para no
  // volver a meter la zona en el medio.
  const prev = new Date(Date.UTC(w.y, w.m - 1, w.d) - 86_400_000);
  return build(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
}

/** El día lógico en curso. */
export function todayLogical(now: Date = new Date()): LogicalDate {
  return logicalDate(now);
}

/** Valida y marca un string externo (query param, CLI, JSON importado). */
export function parseLogicalDate(value: string): LogicalDate {
  if (!SHAPE.test(value)) {
    throw new RangeError(`día lógico inválido: "${value}" (se espera YYYY-MM-DD)`);
  }
  const { y, m, d } = { y: Number(value.slice(0, 4)), m: Number(value.slice(5, 7)), d: Number(value.slice(8, 10)) };
  // Rechaza 2026-02-30 y 2026-13-01: Date.UTC los normaliza en silencio.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() + 1 !== m || probe.getUTCDate() !== d) {
    throw new RangeError(`día lógico inexistente en el calendario: "${value}"`);
  }
  return value as LogicalDate;
}

/**
 * Ventana de instantes UTC que cubre un día lógico: [inicio, fin).
 * Es lo que se usa para filtrar `occurredAt` en la base.
 */
export function logicalDayBounds(ld: LogicalDate): { startUtc: Date; endUtc: Date } {
  const a = split(ld);
  const b = split(addDays(ld, 1));
  return {
    startUtc: zonedToUtc(a.y, a.m, a.d, CUTOFF_HOUR),
    endUtc: zonedToUtc(b.y, b.m, b.d, CUTOFF_HOUR),
  };
}

/** Ventana UTC que cubre un rango inclusivo de días lógicos. */
export function logicalRangeBounds(from: LogicalDate, to: LogicalDate): { startUtc: Date; endUtc: Date } {
  if (from > to) throw new RangeError(`rango invertido: ${from} > ${to}`);
  return { startUtc: logicalDayBounds(from).startUtc, endUtc: logicalDayBounds(to).endUtc };
}

export function addDays(ld: LogicalDate, days: number): LogicalDate {
  const { y, m, d } = split(ld);
  const moved = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
  return build(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}

/** Días entre dos días lógicos (b - a). Sin zonas: es aritmética de calendario. */
export function diffDays(a: LogicalDate, b: LogicalDate): number {
  const x = split(a);
  const y = split(b);
  return Math.round((Date.UTC(y.y, y.m - 1, y.d) - Date.UTC(x.y, x.m - 1, x.d)) / 86_400_000);
}

/** Días lógicos consecutivos, inclusive en ambos extremos. */
export function rangeOfDays(from: LogicalDate, to: LogicalDate): LogicalDate[] {
  const total = diffDays(from, to);
  if (total < 0) throw new RangeError(`rango invertido: ${from} > ${to}`);
  const out: LogicalDate[] = [];
  for (let i = 0; i <= total; i++) out.push(addDays(from, i));
  return out;
}

/**
 * Día lógico -> valor para una columna `@db.Date` de Postgres.
 *
 * Prisma tipa esas columnas como Date y las hidrata a medianoche UTC. Guardar
 * el día a medianoche UTC es correcto SIEMPRE Y CUANDO nadie lo formatee con
 * la zona local: en UTC-3, `toLocaleDateString()` sobre ese Date devuelve el
 * día anterior. Por eso ningún resolver devuelve este Date hacia afuera:
 * se convierte de vuelta con `fromDbDate`.
 */
export function toDbDate(ld: LogicalDate): Date {
  const { y, m, d } = split(ld);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Columna `@db.Date` -> día lógico. Solo getUTC*, nunca getDate. */
export function fromDbDate(value: Date): LogicalDate {
  if (Number.isNaN(value.getTime())) throw new RangeError("fromDbDate: fecha inválida");
  return build(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
}
