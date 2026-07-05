"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { Icon, Spinner } from "~/components/geist";
import { accentVar, asIcon, resolveNiche, resolveProject } from "~/lib/catalog";
import { timeAgo } from "~/lib/time";
import { api } from "~/trpc/react";
import { usePrefs } from "./prefs";
import { ProjectGlyph } from "./project-bits";

export type NavMenuKind = "projects" | "niches" | "writing";

/**
 * Panel flotante del navigation menu: preview de los elementos de la
 * categoría. Los datos se cargan recién al abrir (enabled on hover).
 */
export function NavPreview({ kind }: { kind: NavMenuKind }) {
  return (
    <div className="nav__pop" role="menu">
      {kind === "projects" && <ProjectsPanel />}
      {kind === "niches" && <NichesPanel />}
      {kind === "writing" && <WritingPanel />}
    </div>
  );
}

function PanelState({ loading, empty }: { loading: boolean; empty: string }) {
  return (
    <div className="navp-state">{loading ? <Spinner size="small" /> : <span>{empty}</span>}</div>
  );
}

function PanelFoot({ href, label }: { href: string; label: string }) {
  return (
    <div className="navp-foot">
      <Link href={href} role="menuitem">
        {label} <Icon name="arrow-right" size={13} />
      </Link>
    </div>
  );
}

function ProjectsPanel() {
  const { t, lang } = usePrefs();
  const projects = api.catalog.projects.useQuery();
  if (projects.isPending || projects.isError || projects.data.length === 0)
    return <PanelState loading={projects.isPending} empty={t.projects.empty} />;
  return (
    <>
      {projects.data.slice(0, 5).map((row) => {
        const p = resolveProject(row, lang);
        return (
          <Link key={p.slug} href={`/projects?p=${p.slug}`} className="navp-row" role="menuitem">
            <ProjectGlyph icon={p.icon} color={p.color} size={30} />
            <span className="navp-row__body">
              <strong>{p.name}</strong>
              <span>{p.short}</span>
            </span>
          </Link>
        );
      })}
      <PanelFoot href="/projects" label={t.projects.all} />
    </>
  );
}

function NichesPanel() {
  const { t, lang } = usePrefs();
  const niches = api.catalog.niches.useQuery();
  if (niches.isPending || niches.isError || niches.data.length === 0)
    return <PanelState loading={niches.isPending} empty={t.projects.empty} />;
  return (
    <>
      {niches.data.map((row) => {
        const n = resolveNiche(row, lang);
        const count = row._count.projects;
        return (
          <Link
            key={n.slug}
            href={`/niches/${n.slug}`}
            className="navp-row"
            role="menuitem"
            style={{ "--nc": accentVar(n.color, 700) } as CSSProperties}
          >
            <span className="navp-row__glyph">
              <Icon name={asIcon(n.icon)} size={16} />
            </span>
            <span className="navp-row__body">
              <strong>{n.name}</strong>
              <span>
                {count} {count === 1 ? t.niches.one : t.niches.many}
              </span>
            </span>
          </Link>
        );
      })}
      <PanelFoot href="/niches" label={t.niches.all} />
    </>
  );
}

function WritingPanel() {
  const { t, lang } = usePrefs();
  const posts = api.posts.latest.useQuery();
  if (posts.isPending || posts.isError || posts.data.length === 0)
    return <PanelState loading={posts.isPending} empty={t.writing.empty} />;
  return (
    <>
      {posts.data.map((p) => (
        <Link key={p.id} href="/writing" className="navp-row" role="menuitem">
          <span className="navp-row__body">
            <strong>
              {p.title ?? (p.body.length > 60 ? p.body.slice(0, 60).trimEnd() + "…" : p.body)}
            </strong>
            <span suppressHydrationWarning>
              {timeAgo(p.createdAt, lang)}
              {p.category ? ` · ${p.category}` : ""}
            </span>
          </span>
        </Link>
      ))}
      <PanelFoot href="/writing" label={t.writing.all} />
    </>
  );
}
