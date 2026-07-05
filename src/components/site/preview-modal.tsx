"use client";

import { useEffect, useState } from "react";

import { Note, Spinner, Tabs } from "~/components/geist";
import type { ProjectView } from "~/lib/catalog";
import { api } from "~/trpc/react";
import { usePrefs } from "./prefs";
import { ProjectGlyph } from "./project-bits";

/**
 * Modal "Ver sitio": muestra capturas de página completa del proyecto,
 * una por sección (tabs). La imagen se scrollea dentro del cuerpo del modal.
 */
export function PreviewModal({ p, onClose }: { p: ProjectView; onClose: () => void }) {
  const { t, lang } = usePrefs();
  const sections = api.showcase.byProject.useQuery({ slug: p.slug });
  const [active, setActive] = useState<string | undefined>(undefined);

  // ESC en fase de captura + stopPropagation: cierra solo el modal,
  // sin cerrar también el drawer que está debajo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const data = sections.data ?? [];
  const items = data.map((s) => ({
    value: String(s.id),
    label: lang === "en" && s.labelEn ? s.labelEn : s.label,
  }));
  const activeId = active ?? items[0]?.value;
  const current = data.find((s) => String(s.id) === activeId);

  return (
    // stopPropagation: el modal vive dentro del scrim del drawer; un click
    // acá no debe cerrar también el drawer.
    <div
      className="pv-scrim"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="pv"
        role="dialog"
        aria-modal="true"
        aria-label={p.name}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pv__head">
          <ProjectGlyph icon={p.icon} color={p.color} logoUrl={p.logoUrl} size={36} />
          <h2>{p.name}</h2>
          <button type="button" className="pv__close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {items.length > 0 && (
          <div className="pv__tabs">
            <Tabs items={items} value={activeId} onChange={setActive} />
          </div>
        )}
        <div className="pv__body">
          {sections.isPending ? (
            <div className="pv__state">
              <Spinner size="large" />
            </div>
          ) : sections.isError ? (
            <div className="pv__state">
              <Note type="error">{t.preview.error}</Note>
            </div>
          ) : current ? (
            // Captura de página completa: el usuario scrollea sobre la imagen.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt={`${p.name} — ${current.label}`} />
          ) : (
            <div className="pv__state">
              <Note type="default">{t.preview.empty}</Note>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
