"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { env } from "~/env";
import {
  ADMIN_COOKIE,
  adminToken,
  isAdminPassword,
  noteLoginResult,
  throttleLoginAttempt,
} from "~/server/admin-auth";
import { panelEnabled } from "~/server/panel/config";

export interface PanelLoginState {
  error: boolean;
}

/**
 * Login del panel. Misma credencial y misma cookie que `/admin`, con la única
 * diferencia de a dónde vuelve después.
 *
 * Next protege las Server Actions contra CSRF comparando Origin con Host, así
 * que la cookie `lax` heredada de `/admin` no abre un agujero acá. La regla
 * que sí hay que sostener es que ningún GET del panel mute nada: con `lax`, el
 * navegador manda la cookie en una navegación de nivel superior desde otro
 * sitio.
 */
export async function panelLogin(
  _prev: PanelLoginState,
  formData: FormData,
): Promise<PanelLoginState> {
  if (!panelEnabled()) notFound();

  // Encarece la fuerza bruta sin permitir que nadie te deje afuera.
  await throttleLoginAttempt();

  const ok = isAdminPassword(formData.get("password"));
  noteLoginResult(ok);
  if (!ok) return { error: true };

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/panel");
}

export async function panelLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/panel");
}
