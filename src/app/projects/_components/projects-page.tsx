"use client";

import { useState } from "react";

import { Icon } from "~/components/geist";
import { usePrefs } from "~/components/site/prefs";
import { ProjectCard, ProjectRow } from "~/components/site/project-bits";
import { ProjectDrawer } from "~/components/site/project-drawer";
import type { Project } from "~/lib/content";

export function ProjectsPage() {
  const { t } = usePrefs();
  const [layout, setLayout] = useState<"rows" | "grid">("rows");
  const [active, setActive] = useState<Project | null>(null);

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
      {layout === "grid" ? (
        <div className="pgrid">
          {t.projectData.map((p) => (
            <ProjectCard key={p.slug} p={p} onOpen={setActive} t={t} />
          ))}
        </div>
      ) : (
        <div className="prows">
          {t.projectData.map((p) => (
            <ProjectRow key={p.slug} p={p} onOpen={setActive} t={t} />
          ))}
        </div>
      )}
      {active && <ProjectDrawer p={active} t={t} onClose={() => setActive(null)} />}
    </div>
  );
}
