import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ADMIN_COOKIE, isValidAdminToken } from "~/server/admin-auth";
import { AdminPanel } from "./_components/admin-panel";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function Admin() {
  const jar = await cookies();
  const authed = isValidAdminToken(jar.get(ADMIN_COOKIE)?.value);
  return authed ? <AdminPanel /> : <LoginForm />;
}
