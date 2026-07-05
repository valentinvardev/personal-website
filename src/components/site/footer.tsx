"use client";

import Link from "next/link";

import { Icon } from "~/components/geist";
import { LINKS } from "~/lib/content";
import { Logo } from "./logo";
import { usePrefs } from "./prefs";

export function Footer() {
  const { t } = usePrefs();
  const nav: [string, string][] = [
    ["/", t.nav.home],
    ["/projects", t.nav.projects],
    ["/niches", t.nav.niches],
    ["/writing", t.nav.writing],
    ["/about", t.nav.about],
    ["/contact", t.nav.contact],
  ];
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Logo height={28} />
          <p>{t.footer.tag}</p>
          <div className="footer__social">
            {LINKS.map((l) => (
              <a
                key={l.k}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social"
                title={l.label}
              >
                <Icon name={l.icon} size={17} color="currentColor" />
              </a>
            ))}
          </div>
        </div>
        <div className="footer__cols">
          <div>
            <h4>{t.footer.site}</h4>
            {nav.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <div>
            <h4>{t.footer.contact}</h4>
            {LINKS.map((l) => (
              <a key={l.k} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer__base">
        <span>© 2026 Valentín Varela · valentinvarela.cloud</span>
        <span className="footer__built">
          <span className="dot dot-green" /> {t.footer.built}
        </span>
      </div>
    </footer>
  );
}
