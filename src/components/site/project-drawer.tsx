"use client";

import { useEffect, useState } from "react";

import { Badge, Button, Icon } from "~/components/geist";
import type { Content, Project } from "~/lib/content";
import { ButtonLink } from "./button-link";
import { PreviewModal } from "./preview-modal";
import { ProjectGlyph } from "./project-bits";

export function ProjectDrawer({
  p,
  t,
  onClose,
}: {
  p: Project;
  t: Content;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="drawer__close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <div className="drawer__head">
          <ProjectGlyph slug={p.slug} size={56} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2>{p.name}</h2>
              <Badge color={p.status.color} size="small" dot>
                {p.status.label}
              </Badge>
            </div>
            <div className="drawer__role">{p.role}</div>
          </div>
        </div>
        <p className="drawer__lead">{p.long}</p>
        <h4 className="drawer__h">{t.projects.highlights}</h4>
        <ul className="drawer__list">
          {p.features.map((f) => (
            <li key={f}>
              <Icon name="circle-dot" size={15} color="var(--ds-gray-700)" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <h4 className="drawer__h">{t.projects.stackLabel}</h4>
        <div className="pcard__stack">
          {p.stack.map((s) => (
            <span key={s} className="chip chip--lg">
              {s}
            </span>
          ))}
        </div>
        <div className="drawer__actions">
          {p.links.map((l) =>
            l.primary ? (
              // El botón primario ("Ver sitio") abre el modal de capturas.
              <Button
                key={l.label}
                variant="primary"
                prefix={<Icon name={l.icon} size={16} />}
                onClick={() => setPreview(true)}
              >
                {l.label}
              </Button>
            ) : l.href ? (
              <ButtonLink
                key={l.label}
                href={l.href}
                variant="secondary"
                prefix={<Icon name={l.icon} size={16} />}
              >
                {l.label}
              </ButtonLink>
            ) : (
              <Button
                key={l.label}
                variant="secondary"
                prefix={<Icon name={l.icon} size={16} />}
              >
                {l.label}
              </Button>
            ),
          )}
        </div>
      </aside>
      {preview && <PreviewModal p={p} onClose={() => setPreview(false)} />}
    </div>
  );
}
