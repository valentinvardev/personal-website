import "server-only";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ADMIN_COOKIE, isValidAdminToken } from "~/server/admin-auth";
import { panelEnabled } from "./config";

/**
 * Sesión del panel.
 *
 * Decisión de Valentín (2026-09-09): el panel comparte la sesión de `/admin`,
 * una sola contraseña. La alternativa evaluada era una credencial propia, con
 * el argumento de que `ADMIN_PASSWORD` se tipea en un formulario público y es
 * plausible compartirla para cargar un post, mientras que acá viven el sueño
 * y el ánimo. Se eligió conveniencia; queda documentado para poder revisarlo.
 *
 * Consecuencia operativa: rotar `ADMIN_PASSWORD` cierra las dos sesiones a la
 * vez, y quien tenga acceso a `/admin` tiene acceso al panel.
 */
export async function panelSessionActive(): Promise<boolean> {
  const jar = await cookies();
  return isValidAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

/**
 * Guarda para páginas y componentes de servidor del panel.
 *
 * Orden deliberado: primero "existe" (404 si está apagado), después "sos vos".
 * Sin ese orden, alguien que sondea la URL con el panel apagado recibiría un
 * 401, que confirma que la ruta existe.
 *
 * Se llama en el layout Y en cada page: los layouts no se re-renderizan en la
 * navegación del lado del cliente, así que un layout no alcanza para proteger
 * una página a la que se llega navegando.
 */
export async function requirePanel(): Promise<void> {
  if (!panelEnabled()) notFound();
  if (!(await panelSessionActive())) notFound();
}
