"use client";

import { useEffect, useState } from "react";

import { Badge, Button, Icon } from "~/components/geist";
import { StackChip } from "~/components/geist/tech-icon";
import type { ProjectView } from "~/lib/catalog";
import type { Content } from "~/lib/content";
import { ButtonLink } from "./button-link";
import { PreviewModal } from "./preview-modal";
import { ProjectGlyph } from "./project-bits";

export function ProjectDrawer({
  p,
  t,
  onClose,
}: {
  p: ProjectView;
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
          <ProjectGlyph icon={p.icon} color={p.color} size={56} />
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
        <p className="drawer__lead">{p.long || p.short}</p>
        {p.features.length > 0 && (
          <>
            <h4 className="drawer__h">{t.projects.highlights}</h4>
            <ul className="drawer__list">
              {p.features.map((f) => (
                <li key={f}>
                  <Icon name="circle-dot" size={15} color="var(--ds-gray-700)" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {p.stack.length > 0 && (
          <>
            <h4 className="drawer__h">{t.projects.stackLabel}</h4>
            <div className="pcard__stack">
              {p.stack.map((s) => (
                <StackChip key={s} label={s} large />
              ))}
            </div>
          </>
        )}
        <div className="drawer__actions">
          {p.liveUrl ? (
            // Con URL en vivo, "Ver sitio" abre la página real del cliente
            // en una pestaña nueva; las capturas quedan como secundario.
            <ButtonLink
              href={p.liveUrl}
              variant="primary"
              prefix={<Icon name="globe" size={16} />}
              suffix={<Icon name="arrow-up-right" size={14} />}
            >
              {t.projects.viewSite}
            </ButtonLink>
          ) : (
            <Button
              variant="primary"
              prefix={<Icon name="globe" size={16} />}
              onClick={() => setPreview(true)}
            >
              {t.projects.viewSite}
            </Button>
          )}
          {p.liveUrl && (
            <Button
              variant="secondary"
              prefix={<Icon name="camera" size={16} />}
              onClick={() => setPreview(true)}
            >
              {t.projects.captures}
            </Button>
          )}
          {p.repoUrl && (
            <ButtonLink
              href={p.repoUrl}
              variant="secondary"
              prefix={<Icon name="github" size={16} />}
            >
              {t.projects.code}
            </ButtonLink>
          )}
        </div>
      </aside>
      {preview && <PreviewModal p={p} onClose={() => setPreview(false)} />}
    </div>
  );
}
