import "server-only";

import { env } from "~/env";

/**
 * Interruptor del panel de medición.
 *
 * Apagado, `/panel` devuelve 404: no existe una URL sin proteger ni siquiera
 * por un instante, y el código puede estar deployado mientras se termina.
 * Se enciende poniendo `PANEL_ENABLED=true` en el `.env` del VPS y
 * reiniciando el proceso.
 *
 * La validación vive acá y no en `src/env.js` a propósito: ese archivo se
 * importa desde `next.config.js`, así que una variable malformada impediría
 * que arranque el proceso que sirve el sitio público. Acá, cualquier valor
 * distinto de "true" simplemente deja el panel apagado.
 */
export function panelEnabled(): boolean {
  return env.PANEL_ENABLED === "true";
}
