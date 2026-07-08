"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { Icon } from "~/components/geist";
import { accentVar, asIcon, resolveNiche, type NicheRecord } from "~/lib/catalog";
import { usePrefs } from "./prefs";

export interface NicheListRow extends NicheRecord {
  _count: { projects: number };
  projects: {
    slug: string;
    name: string;
    icon: string;
    color: string;
    logoUrl: string | null;
  }[];
}

/**
 * Tarjeta de nicho — "el lomo del dossier": un lomo de color en el borde
 * izquierdo identifica al nicho; en la grilla se lee como un estante de
 * carpetas. El acento solo vive en el lomo, el glifo y el hover.
 */
export function NicheCard({ n }: { n: NicheListRow }) {
  const { t, lang } = usePrefs();
  const v = resolveNiche(n, lang);
  const count = n._count.projects;
  return (
    <Link
      href={`/niches/${v.slug}`}
      className="ncard"
      style={{ "--nc": accentVar(v.color, 700) } as CSSProperties}
    >
      <span className="ncard__spine" aria-hidden="true" />
      <div className="ncard__head">
        <span className="ncard__glyph">
          <Icon name={v.icon} size={19} />
        </span>
        <span className="ncard__count">
          {count} {count === 1 ? t.niches.one : t.niches.many}
        </span>
      </div>
      <h3>{v.name}</h3>
      {v.tagline && <p>{v.tagline}</p>}
      <div className="ncard__foot">
        <span className="ncard__strip">
          {n.projects.slice(0, 4).map((p) =>
            p.logoUrl ? (
              // Con logo cargado, el mini muestra el logo real del proyecto.
              <span key={p.slug} className="ncard__mini ncard__mini--logo" title={p.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logoUrl} alt={p.name} loading="lazy" />
              </span>
            ) : (
              <span
                key={p.slug}
                className="ncard__mini"
                style={{ background: accentVar(p.color, 700) }}
                title={p.name}
              >
                <Icon name={asIcon(p.icon)} size={11} />
              </span>
            ),
          )}
        </span>
        <span className="ncard__more">
          {t.niches.view} <Icon name="arrow-right" size={14} />
        </span>
      </div>
    </Link>
  );
}
