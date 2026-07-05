"use client";

import { useState } from "react";

import { Badge, Icon } from "~/components/geist";
import { ButtonLink } from "~/components/site/button-link";
import { usePrefs } from "~/components/site/prefs";
import { ProjectRow } from "~/components/site/project-bits";
import { ProjectDrawer } from "~/components/site/project-drawer";
import { SectionHead } from "~/components/site/section-head";
import type { Project } from "~/lib/content";

export function HomePage() {
  const { t } = usePrefs();
  const [active, setActive] = useState<Project | null>(null);
  const featured = t.projectData.slice(0, 3);

  return (
    <div>
      {/* ---- Hero (dirección A: editorial) ---- */}
      <header className="hero hero--a">
        <div className="hero__left">
          <Badge color="green" dot>
            {t.hero.badge}
          </Badge>
          <h1>{t.hero.title}</h1>
          <p>{t.hero.sub}</p>
          <div className="hero__cta">
            <ButtonLink href="/projects" variant="primary" size="large">
              {t.hero.ctaPrimary}
            </ButtonLink>
            <ButtonLink
              href="/contact"
              variant="tertiary"
              size="large"
              suffix={<Icon name="arrow-right" size={16} />}
            >
              {t.hero.ctaSecondary}
            </ButtonLink>
          </div>
        </div>
        <div className="hero__right">
          <div className="hero__stats hero__stats--stack">
            {t.hero.stats.map((s) => (
              <div key={s.k} className="stat">
                <strong>{s.v}</strong>
                <span>{s.k}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="wrap">
        {/* ---- Servicios ---- */}
        <section className="section">
          <SectionHead eyebrow={t.services.eyebrow} title={t.services.title} sub={t.services.sub} />
          <div className="svc-grid">
            {t.services.items.map((s) => (
              <div className="svc" key={s.title}>
                <span className="svc__ic">
                  <Icon name={s.icon} size={20} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Proyectos destacados ---- */}
        <section className="section">
          <div className="section__bar">
            <SectionHead eyebrow={t.projects.eyebrow} title={t.projects.title} />
            <ButtonLink href="/projects" variant="secondary" size="small">
              {t.projects.all}
            </ButtonLink>
          </div>
          <div className="prows">
            {featured.map((p) => (
              <ProjectRow key={p.slug} p={p} onOpen={setActive} t={t} />
            ))}
          </div>
        </section>

        {/* ---- Escritos ---- */}
        <section className="section">
          <div className="section__bar">
            <SectionHead eyebrow={t.writing.eyebrow} title={t.writing.title} />
          </div>
          <div className="post-list">
            {t.writing.posts.map((p) => (
              <a className="post" key={p.title} onClick={(e) => e.preventDefault()} href="#">
                <div className="post__meta">
                  <span>{p.date}</span>
                  <span className="post__cat">{p.cat}</span>
                </div>
                <h3>{p.title}</h3>
                <Icon name="arrow-up-right" size={16} color="var(--ds-gray-700)" />
              </a>
            ))}
          </div>
        </section>

        {/* ---- Banda CTA ---- */}
        <section className="cta-band">
          <h2>{t.cta.title}</h2>
          <p>{t.cta.sub}</p>
          <div className="cta-band__row">
            <ButtonLink href="/contact" variant="secondary" size="large">
              {t.cta.button}
            </ButtonLink>
          </div>
        </section>
      </div>

      {active && <ProjectDrawer p={active} t={t} onClose={() => setActive(null)} />}
    </div>
  );
}
