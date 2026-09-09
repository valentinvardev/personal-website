import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "~/env";

export const ADMIN_COOKIE = "vv-admin";

/**
 * Token de sesión sin estado: HMAC del password de admin. Si cambia
 * ADMIN_PASSWORD se invalidan todas las sesiones.
 */
export function adminToken(): string {
  return createHmac("sha256", env.ADMIN_PASSWORD)
    .update("vv-admin-session-v1")
    .digest("hex");
}

export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(adminToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Compara una contraseña candidata contra ADMIN_PASSWORD en tiempo constante.
 *
 * `timingSafeEqual` TIRA una excepción con buffers de largo distinto en vez de
 * devolver false, y acá el largo lo controla quien intenta entrar: de ahí la
 * guarda de longitud antes de llamarla.
 */
export function isAdminPassword(candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(env.ADMIN_PASSWORD);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Retardo creciente ante intentos fallidos, en memoria del proceso.
 *
 * A propósito NO es un bloqueo: un lockout tras N intentos es, en un sistema
 * de un solo usuario, una forma trivial de que alguien te deje afuera de tu
 * propio panel para siempre. El retardo encarece la fuerza bruta sin poder
 * cerrarte la puerta.
 *
 * El contador vive en RAM y se borra en cada deploy (pm2 tiene autorestart y
 * max_memory_restart), lo cual está bien: es una molestia para el atacante,
 * no la defensa principal. La defensa es que la contraseña sea larga.
 */
let recentFailures = 0;

export async function throttleLoginAttempt(): Promise<void> {
  if (recentFailures === 0) return;
  const ms = Math.min(2 ** recentFailures * 250, 8000);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function noteLoginResult(ok: boolean): void {
  recentFailures = ok ? 0 : Math.min(recentFailures + 1, 8);
}

/** Extrae el token de admin de un header Cookie crudo. */
export function adminTokenFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_COOKIE) return rest.join("=");
  }
  return undefined;
}
