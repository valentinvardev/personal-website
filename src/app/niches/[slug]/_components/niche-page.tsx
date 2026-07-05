"use client";

import { useState, type CSSProperties } from "react";

import { Icon, Note } from "~/components/geist";
import { MaterialGrid } from "~/components/site/material-grid";
import { usePrefs } from "~/components/site/prefs";
import { ProjectCard } from "~/components/site/project-bits";
import { ProjectDrawer } from "~/components/site/project-drawer";
import { SectionHead } from "~/components/site/section-head";
import {
  accentVar,
  resolveNiche,
  resolveProject,
  type ProjectView,
} from "~/lib/catalog";
import type { RouterOutputs } from "~/trpc/react";

export function NichePage({ niche }: { niche: RouterOutputs["catalog"]["nicheBySlug"] }) {
  const { t, lang } = usePrefs();
  const [active, setActive] = useState<ProjectView | null>(null);

  const v = resolveNiche(niche, lang);
  const projects = niche.projects.map((p) => resolveProject(p, lang));
  const count = projects.length;

  return (
    <div
      className="wrap page-pad"
      style={{ "--nc": accentVar(v.color, 700) } as CSSProperties}
    >
      {/* El lomo del dossier continúa desde la tarjeta hasta el hero. */}
      <header className="nhero">
        <span className="nhero__spine" aria-hidden="true" />
        <div className="eyebrow">{t.niches.eyebrow}</div>
        <div className="nhero__title">
          <span className="nhero__glyph">
            <Icon name={v.icon} size={26} />
          </span>
          <h1>{v.name}</h1>
        </div>
        {v.tagline && <p className="lead">{v.tagline}</p>}
        <div className="nhero__meta">
          {count} {count === 1 ? t.niches.one : t.niches.many}
        </div>
      </header>

      <section className="section">
        <SectionHead title={t.niches.projectsTitle} />
        {count === 0 ? (
          <Note type="default">{t.projects.empty}</Note>
        ) : (
          <div className="pgrid">
            {projects.map((p) => (
              <ProjectCard key={p.slug} p={p} onOpen={setActive} t={t} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <SectionHead title={t.niches.materialTitle} />
        {niche.blocks.length === 0 ? (
          <Note type="default">{t.niches.materialEmpty}</Note>
        ) : (
          <MaterialGrid blocks={niche.blocks} color={v.color} />
        )}
      </section>

      {active && <ProjectDrawer p={active} t={t} onClose={() => setActive(null)} />}
    </div>
  );
}
