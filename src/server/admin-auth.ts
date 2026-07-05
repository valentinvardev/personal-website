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

/** Extrae el token de admin de un header Cookie crudo. */
export function adminTokenFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_COOKIE) return rest.join("=");
  }
  return undefined;
}
