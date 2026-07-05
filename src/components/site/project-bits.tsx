"use client";

import { Badge, Icon } from "~/components/geist";
import { PROJECT_ACCENT, type Content, type Project } from "~/lib/content";

export function ProjectGlyph({ slug, size = 44 }: { slug: string; size?: number }) {
  const a = PROJECT_ACCENT[slug] ?? { icon: "box" as const, color: "var(--ds-gray-700)" };
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: a.color,
        color: "#fff",
      }}
    >
      <Icon name={a.icon} size={size * 0.5} />
    </span>
  );
}

export function ProjectCard({
  p,
  onOpen,
  t,
}: {
  p: Project;
  onOpen: (p: Project) => void;
  t: Content;
}) {
  return (
    <div
      className="pcard"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(p)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(p);
      }}
    >
      <div className="pcard__top">
        <ProjectGlyph slug={p.slug} />
        <Badge color={p.status.color} size="small" dot>
          {p.status.label}
        </Badge>
      </div>
      <h3>{p.name}</h3>
      <p>{p.short}</p>
      <div className="pcard__stack">
        {p.stack.slice(0, 4).map((s) => (
          <span key={s} className="chip">
            {s}
          </span>
        ))}
      </div>
      <div className="pcard__foot">
        <span className="pcard__more">
          {t.projects.view} <Icon name="arrow-up-right" size={15} />
        </span>
      </div>
    </div>
  );
}

export function ProjectRow({
  p,
  onOpen,
  t,
}: {
  p: Project;
  onOpen: (p: Project) => void;
  t: Content;
}) {
  return (
    <button type="button" className="prow" onClick={() => onOpen(p)}>
      <ProjectGlyph slug={p.slug} size={40} />
      <div className="prow__body">
        <div className="prow__head">
          <h3>{p.name}</h3>
          <Badge color={p.status.color} size="small" dot>
            {p.status.label}
          </Badge>
        </div>
        <p>{p.short}</p>
        <div className="pcard__stack">
          {p.stack.slice(0, 5).map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
      </div>
      <Icon name="arrow-up-right" size={18} color="var(--ds-gray-700)" style={{ alignSelf: "center" }} />
    </button>
  );
}
