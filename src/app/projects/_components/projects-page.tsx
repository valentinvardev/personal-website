"use client";

import { useState, type CSSProperties } from "react";

import { Icon, Note } from "~/components/geist";
import { usePrefs } from "~/components/site/prefs";
import { ProjectCard, ProjectRow } from "~/components/site/project-bits";
import { ProjectDrawer } from "~/components/site/project-drawer";
import { accentVar, resolveNiche, resolveProject, type ProjectView } from "~/lib/catalog";
import type { RouterOutputs } from "~/trpc/react";

export function ProjectsPage({
  projects,
  niches,
}: {
  projects: RouterOutputs["catalog"]["projects"];
  niches: RouterOutputs["catalog"]["niches"];
}) {
  const { t, lang } = usePrefs();
  const [layout, setLayout] = useState<"rows" | "grid">("rows");
  const [filter, setFilter] = useState<string | null>(null);
  const [active, setActive] = useState<ProjectView | null>(null);

  const filtered = projects
    .filter((p) => filter == null || p.niche?.slug === filter)
    .map((p) => resolveProject(p, lang));

  return (
    <div className="wrap page-pad">
      <div className="page-head">
        <div>
          <div className="eyebrow">{t.projects.eyebrow}</div>
          <h1>{t.projects.pageTitle}</h1>
          <p className="lead">{t.projects.pageLead}</p>
        </div>
        <div className="seg">
          <button
            type="button"
            className={layout === "rows" ? "on" : ""}
            onClick={() => setLayout("rows")}
            aria-label="Lista"
          >
            <Icon name="layers" size={16} />
          </button>
          <button
            type="button"
            className={layout === "grid" ? "on" : ""}
            onClick={() => setLayout("grid")}
            aria-label="Grilla"
          >
            <Icon name="layout-dashboard" size={16} />
          </button>
        </div>
      </div>

      {niches.length > 0 && (
        <div className="filters">
          <button
            type="button"
            className={"filter" + (filter == null ? " on" : "")}
            onClick={() => setFilter(null)}
          >
            {t.projects.filterAll}
          </button>
          {niches.map((n) => {
            const v = resolveNiche(n, lang);
            return (
              <button
                key={n.id}
                type="button"
                className={"filter" + (filter === n.slug ? " on" : "")}
                style={{ "--fc": accentVar(v.color, 700) } as CSSProperties}
                onClick={() => setFilter(filter === n.slug ? null : n.slug)}
              >
                <span className="filter__dot" aria-hidden="true" />
                {v.name}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <Note type="default">{t.projects.empty}</Note>
      ) : layout === "grid" ? (
        <div className="pgrid">
          {filtered.map((p) => (
            <ProjectCard key={p.slug} p={p} onOpen={setActive} t={t} />
          ))}
        </div>
      ) : (
        <div className="prows">
          {filtered.map((p) => (
            <ProjectRow key={p.slug} p={p} onOpen={setActive} t={t} />
          ))}
        </div>
      )}
      {active && <ProjectDrawer p={active} t={t} onClose={() => setActive(null)} />}
    </div>
  );
}
