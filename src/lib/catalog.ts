import type { BadgeColor } from "~/components/geist/badge";
import { ICONS, type IconName } from "~/components/geist/icons-data";
import type { Lang } from "./content";

/* =====================================================================
   Catálogo dinámico (nichos, proyectos, tarjetas de material).
   Los registros vienen de la DB con campos ES + EN opcionales; acá se
   resuelven a "vistas" en el idioma activo, con fallback al español.
   ===================================================================== */

export const ACCENTS = [
  "gray",
  "blue",
  "green",
  "amber",
  "red",
  "purple",
  "pink",
  "teal",
] as const;

export type Accent = (typeof ACCENTS)[number];

export function asAccent(value: string): Accent {
  return (ACCENTS as readonly string[]).includes(value) ? (value as Accent) : "gray";
}

export function asIcon(value: string): IconName {
  return value in ICONS ? (value as IconName) : "box";
}

/** Var CSS del acento, p. ej. accentVar("teal") → var(--ds-teal-700). */
export function accentVar(color: string, step = 700): string {
  return `var(--ds-${asAccent(color)}-${step})`;
}

/* ---------- Registros (forma estructural de las filas de la DB) ---------- */

export interface ProjectRecord {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  role: string | null;
  roleEn: string | null;
  statusColor: string;
  statusLabel: string;
  statusLabelEn: string | null;
  short: string;
  shortEn: string | null;
  long: string | null;
  longEn: string | null;
  stack: string[];
  features: string[];
  featuresEn: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  featured: boolean;
  sortOrder: number;
  nicheId: number | null;
  niche?: { slug: string; name: string; nameEn: string | null } | null;
}

export interface NicheRecord {
  id: number;
  slug: string;
  name: string;
  nameEn: string | null;
  tagline: string | null;
  taglineEn: string | null;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface BlockRecord {
  id: number;
  kind: string;
  title: string | null;
  titleEn: string | null;
  body: string | null;
  bodyEn: string | null;
  imageUrl: string | null;
  span: string;
  sortOrder: number;
}

/* ---------- Vistas resueltas por idioma ---------- */

export interface ProjectView {
  id: number;
  slug: string;
  name: string;
  icon: IconName;
  color: Accent;
  role: string;
  status: { color: BadgeColor; label: string };
  stack: string[];
  short: string;
  long: string;
  features: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  niche: { slug: string; name: string } | null;
}

export interface NicheView {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  icon: IconName;
  color: Accent;
}

export interface BlockView {
  id: number;
  kind: "text" | "image";
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  span: "sm" | "md" | "lg";
}

function pick(en: boolean, primary: string | null | undefined, fallback: string): string;
function pick(
  en: boolean,
  primary: string | null | undefined,
  fallback: string | null,
): string | null;
function pick(
  en: boolean,
  primary: string | null | undefined,
  fallback: string | null,
): string | null {
  return (en ? primary : null) ?? fallback;
}

export function resolveProject(row: ProjectRecord, lang: Lang): ProjectView {
  const en = lang === "en";
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    icon: asIcon(row.icon),
    color: asAccent(row.color),
    role: pick(en, row.roleEn, row.role ?? ""),
    status: {
      color: asAccent(row.statusColor) as BadgeColor,
      label: pick(en, row.statusLabelEn, row.statusLabel),
    },
    stack: row.stack,
    short: pick(en, row.shortEn, row.short),
    long: pick(en, row.longEn, row.long ?? ""),
    features: en && row.featuresEn.length > 0 ? row.featuresEn : row.features,
    liveUrl: row.liveUrl,
    repoUrl: row.repoUrl,
    niche: row.niche
      ? { slug: row.niche.slug, name: pick(en, row.niche.nameEn, row.niche.name) }
      : null,
  };
}

export function resolveNiche(row: NicheRecord, lang: Lang): NicheView {
  const en = lang === "en";
  return {
    id: row.id,
    slug: row.slug,
    name: pick(en, row.nameEn, row.name),
    tagline: pick(en, row.taglineEn, row.tagline ?? ""),
    icon: asIcon(row.icon),
    color: asAccent(row.color),
  };
}

export function resolveBlock(row: BlockRecord, lang: Lang): BlockView {
  const en = lang === "en";
  return {
    id: row.id,
    kind: row.kind === "image" ? "image" : "text",
    title: pick(en, row.titleEn, row.title),
    body: pick(en, row.bodyEn, row.body),
    imageUrl: row.imageUrl,
    span: row.span === "sm" || row.span === "lg" ? row.span : "md",
  };
}
