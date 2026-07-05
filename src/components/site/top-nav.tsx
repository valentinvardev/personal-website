"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "~/components/geist";
import { ButtonLink } from "./button-link";
import { Monogram } from "./monogram";
import { usePrefs } from "./prefs";

export function TopNav() {
  const { theme, setTheme, lang, setLang, t } = usePrefs();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", on);
    on();
    return () => window.removeEventListener("scroll", on);
  }, []);

  const links: [string, string][] = [
    ["/", t.nav.home],
    ["/projects", t.nav.projects],
    ["/about", t.nav.about],
    ["/contact", t.nav.contact],
  ];

  return (
    <nav className={"nav" + (scrolled ? " nav--scrolled" : "")}>
      <div className="nav__inner">
        <Link href="/" className="brand">
          <Monogram />
          <span className="brand__name">Valentín Varela</span>
        </Link>
        <div className="nav__links">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={"nav__link" + (pathname === href ? " is-active" : "")}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="nav__right">
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
          <ButtonLink href="/contact" size="small" variant="primary">
            {t.nav.cta}
          </ButtonLink>
        </div>
      </div>
    </nav>
  );
}
