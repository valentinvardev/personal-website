import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { panelSessionActive } from "~/server/panel/auth";
import { panelEnabled } from "~/server/panel/config";
import { panelLogout } from "./actions";
import { PanelLogin } from "./_components/panel-login";

/**
 * Nunca cachear: todo lo del panel depende de la cookie y del día lógico en
 * curso. Una página del panel servida desde caché es, además, una página
 * personal servida a quien no debería verla.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false, nocache: true },
};

const TABS: [string, string][] = [
  ["/panel", "Hoy"],
  ["/panel/checkin", "Check-in"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Apagado, el panel no existe: 404 antes de mirar la sesión, para no
  // confirmarle la ruta a nadie que la esté sondeando.
  if (!panelEnabled()) notFound();

  if (!(await panelSessionActive())) return <PanelLogin />;

  return (
    <div className="panel">
      <header className="panel__bar">
        <nav className="panel__tabs">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <form action={panelLogout}>
          <button type="submit" className="panel__logout">
            Salir
          </button>
        </form>
      </header>
      <main className="panel__body">{children}</main>
    </div>
  );
}
