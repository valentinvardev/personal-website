"use client";

import { Badge, Icon } from "~/components/geist";
import type { IconName } from "~/components/geist/icons-data";
import { StackChip } from "~/components/geist/tech-icon";
import { accentVar, type ProjectView } from "~/lib/catalog";
import type { Content } from "~/lib/content";

export function ProjectGlyph({
  icon,
  color,
  size = 44,
}: {
  icon: IconName;
  color: string;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, Math.round(size * 0.25)),
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: accentVar(color, 700),
        color: "#fff",
      }}
    >
      <Icon name={icon} size={size * 0.5} />
    </span>
  );
}

export function ProjectCard({
  p,
  onOpen,
  t,
}: {
  p: ProjectView;
  onOpen: (p: ProjectView) => void;
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
        <ProjectGlyph icon={p.icon} color={p.color} />
        <Badge color={p.status.color} size="small" dot>
          {p.status.label}
        </Badge>
      </div>
      <h3>{p.name}</h3>
      <p>{p.short}</p>
      <div className="pcard__stack">
        {p.stack.slice(0, 4).map((s) => (
          <StackChip key={s} label={s} />
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
  p: ProjectView;
  onOpen: (p: ProjectView) => void;
  t: Content;
}) {
  return (
    <button type="button" className="prow" onClick={() => onOpen(p)}>
      <ProjectGlyph icon={p.icon} color={p.color} size={40} />
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
            <StackChip key={s} label={s} />
          ))}
        </div>
      </div>
      <Icon name="arrow-up-right" size={18} color="var(--ds-gray-700)" style={{ alignSelf: "center" }} />
    </button>
  );
}
