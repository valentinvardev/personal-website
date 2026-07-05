"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "~/components/geist";
import { ButtonLink } from "./button-link";
import { Logo } from "./logo";
import { NavPreview, type NavMenuKind } from "./nav-preview";
import { usePrefs } from "./prefs";

/* Items del nav con navigation menu (preview flotante en hover). */
const MENUS: Record<string, NavMenuKind> = {
  "/projects": "projects",
  "/niches": "niches",
  "/writing": "writing",
};

/* Icono hamburguesa (estilo Lucide, no está en el set generado). */
function BurgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

/** Toggle de tema + idioma (header en desktop, sidebar en mobile). */
function PrefControls() {
  const { theme, setTheme, lang, setLang } = usePrefs();
  return (
    <div className="ctrl">
      <button
        type="button"
        className="ctrl__btn"
        title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Icon name={theme === "dark" ? "moon" : "sun"} size={16} color="var(--ds-gray-900)" />
      </button>
      <button
        type="button"
        className="ctrl__lang"
        title="Idioma"
        onClick={() => setLang(lang === "es" ? "en" : "es")}
      >
        <Icon name="languages" size={15} color="var(--ds-gray-900)" />
        <span>{lang.toUpperCase()}</span>
      </button>
    </div>
  );
}

export function TopNav() {
  const { t } = usePrefs();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [menu, setMenu] = useState<NavMenuKind | null>(null);
  const closeTimer = useRef<number | null>(null);
  const sidebarTimer = useRef<number | null>(null);

  const openSidebar = () => {
    if (sidebarTimer.current) {
      window.clearTimeout(sidebarTimer.current);
      sidebarTimer.current = null;
    }
    setClosing(false);
    setOpen(true);
  };

  /* Cierre animado: la clase .is-closing corre la animación de salida
     y recién después se desmonta el sidebar. */
  const closeSidebar = useCallback(() => {
    setClosing(true);
    if (sidebarTimer.current) window.clearTimeout(sidebarTimer.current);
    sidebarTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      sidebarTimer.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (sidebarTimer.current) window.clearTimeout(sidebarTimer.current);
    };
  }, []);

  const openMenu = (m: NavMenuKind) => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setMenu(m);
  };
  // Delay de gracia para mover el mouse del link al panel sin que cierre.
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenu(null), 140);
  };

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", on);
    on();
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Al navegar se cierran el sidebar (en seco, la página ya cambió)
  // y el navigation menu.
  useEffect(() => {
    if (sidebarTimer.current) {
      window.clearTimeout(sidebarTimer.current);
      sidebarTimer.current = null;
    }
    setOpen(false);
    setClosing(false);
    setMenu(null);
  }, [pathname]);

  // ESC cierra el navigation menu.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  // Con el sidebar abierto: ESC cierra, el body no scrollea y si la
  // ventana pasa a desktop (>900px) se cierra en seco.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    const onResize = () => {
      if (window.innerWidth > 900) {
        if (sidebarTimer.current) {
          window.clearTimeout(sidebarTimer.current);
          sidebarTimer.current = null;
        }
        setOpen(false);
        setClosing(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [open, closeSidebar]);

  const links: [string, string][] = [
    ["/", t.nav.home],
    ["/projects", t.nav.projects],
    ["/niches", t.nav.niches],
    ["/writing", t.nav.writing],
    ["/about", t.nav.about],
    ["/contact", t.nav.contact],
  ];

  return (
    <>
      <nav className={"nav" + (scrolled ? " nav--scrolled" : "")}>
        <div className="nav__inner">
          <Link href="/" className="brand" aria-label="Inicio">
            <Logo height={24} />
          </Link>
          <div className="nav__links" onMouseLeave={scheduleClose}>
            {links.map(([href, label]) => {
              const m = MENUS[href];
              return (
                <span
                  key={href}
                  className="nav__item"
                  onMouseEnter={() => (m ? openMenu(m) : setMenu(null))}
                  onFocus={() => m && openMenu(m)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleClose();
                  }}
                >
                  <Link
                    href={href}
                    className={"nav__link" + (pathname === href ? " is-active" : "")}
                    aria-haspopup={m ? "menu" : undefined}
                    aria-expanded={m ? menu === m : undefined}
                  >
                    {label}
                  </Link>
                  {m && menu === m && <NavPreview kind={m} />}
                </span>
              );
            })}
          </div>
          <div className="nav__right">
            <PrefControls />
            <ButtonLink href="/contact" size="small" variant="primary">
              {t.nav.cta}
            </ButtonLink>
            <button
              type="button"
              className="nav__burger"
              aria-label="Abrir menú"
              aria-expanded={open && !closing}
              onClick={openSidebar}
            >
              <BurgerIcon />
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div
          className={"mnav-scrim" + (closing ? " is-closing" : "")}
          onClick={closeSidebar}
        >
          <aside
            className="mnav"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mnav__head">
              <Link href="/" className="brand" aria-label="Inicio" onClick={closeSidebar}>
                <Logo height={22} />
              </Link>
              <button
                type="button"
                className="mnav__close"
                aria-label="Cerrar menú"
                onClick={closeSidebar}
              >
                ✕
              </button>
            </div>
            <div className="mnav__links">
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className={"mnav__link" + (pathname === href ? " is-active" : "")}
                  onClick={closeSidebar}
                >
                  {label}
                  <Icon name="arrow-right" size={15} color="var(--ds-gray-700)" />
                </Link>
              ))}
            </div>
            <div className="mnav__foot">
              <PrefControls />
              <ButtonLink href="/contact" variant="primary" fullWidth onClick={closeSidebar}>
                {t.nav.cta}
              </ButtonLink>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
