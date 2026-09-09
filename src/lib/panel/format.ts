/**
 * Formateo de fechas y horas del panel.
 *
 * Éste es el ÚNICO módulo además de `logical-date.ts` autorizado a formatear
 * tiempo (está en la allowlist de `scripts/guard-time.mjs`). Todo lo demás
 * recibe strings ya renderizados.
 *
 * Regla que se sostiene acá: lo que se formatea con zona horaria se formatea
 * en el SERVIDOR. Si la cabecera del check-in se formateara en el cliente,
 * abrirlo desde Madrid mostraría "23:00 a 19:00" mientras el servidor guarda
 * contra las 18:00 de Buenos Aires.
 */

import { PANEL_TZ, addDays, type LogicalDate } from "./logical-date.ts";

/** La línea de tiempo del sueño arranca a las 18:00 y cubre 20 horas. */
export const SLEEP_WINDOW_START_HOUR = 18;
export const SLEEP_WINDOW_HOURS = 20;
/** Snap de 15 minutos: ±7 min de ruido contra una señal que se mide en horas. */
export const SLEEP_SLOT_MINUTES = 15;
/** 80 posiciones posibles a lo largo de la ventana. */
export const SLEEP_SLOTS = (SLEEP_WINDOW_HOURS * 60) / SLEEP_SLOT_MINUTES;

/**
 * Minutos desde el inicio de la ventana -> hora de pared "HH:MM".
 *
 * Aritmética pura módulo 24 h: no necesita zona horaria porque la ventana ya
 * está anclada a una hora local. Por eso el cliente puede dibujar todas las
 * etiquetas sin tocar `Intl` ni saber en qué país está.
 */
export function wallLabel(minutesFromWindowStart: number): string {
  const total = (SLEEP_WINDOW_START_HOUR * 60 + minutesFromWindowStart) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "7 h 45 min", o "7 h" justo. Para mostrar la duración resultante. */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const DAY_FMT = new Intl.DateTimeFormat("es-AR", {
  timeZone: PANEL_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "martes 9 de septiembre", en la zona del sistema. Solo servidor. */
export function longDayLabel(ld: LogicalDate): string {
  // Mediodía UTC del día: cae dentro del día en cualquier offset razonable,
  // así que nombra el día correcto sin depender del borde.
  const y = Number(ld.slice(0, 4));
  const m = Number(ld.slice(5, 7));
  const d = Number(ld.slice(8, 10));
  return DAY_FMT.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/**
 * "la noche del lunes 8 al martes 9": describe la ventana de sueño del
 * check-in de un día lógico. El sueño que alimenta el día D empieza la tarde
 * del día anterior.
 */
export function nightLabel(ld: LogicalDate): string {
  return `la noche del ${longDayLabel(addDays(ld, -1))} al ${longDayLabel(ld)}`;
}
