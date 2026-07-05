"use client";

import { useState } from "react";

import { Button, Input, Note, Spinner } from "~/components/geist";
import { api } from "~/trpc/react";
import { ImageUpload } from "./image-upload";
import { AdminSelect } from "./pickers";

interface SectionDraft {
  label: string;
  labelEn: string;
  imageUrl: string;
  sortOrder: number;
}

const EMPTY_DRAFT: SectionDraft = { label: "", labelEn: "", imageUrl: "", sortOrder: 0 };

interface Section {
  id: number;
  label: string;
  labelEn: string | null;
  imageUrl: string;
  sortOrder: number;
}

/** Capturas del modal "Ver sitio", por proyecto (tabs del preview). */
export function CapturesAdmin() {
  const projects = api.catalog.projects.useQuery();
  const [slug, setSlug] = useState<string | null>(null);

  if (projects.isPending)
    return (
      <div className="adm-state">
        <Spinner size="large" />
      </div>
    );
  if (projects.isError)
    return (
      <div className="adm-state">
        <Note type="error" label="Sin conexión a la base">
          No se pudieron cargar los proyectos.
        </Note>
      </div>
    );
  if (projects.data.length === 0)
    return (
      <div className="adm-state">
        <Note type="default" label="Sin proyectos">
          Primero creá un proyecto en la pestaña Proyectos.
        </Note>
      </div>
    );

  const selected = slug ?? projects.data[0]!.slug;

  return (
    <div className="adm-section">
      <div style={{ maxWidth: 360 }}>
        <AdminSelect label="Proyecto" value={selected} onChange={(e) => setSlug(e.target.value)}>
          {projects.data.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.name}
            </option>
          ))}
        </AdminSelect>
      </div>
      <ProjectSections slug={selected} />
    </div>
  );
}

function ProjectSections({ slug }: { slug: string }) {
  const utils = api.useUtils();
  const sections = api.showcase.byProject.useQuery({ slug });
  const invalidate = () => utils.showcase.byProject.invalidate({ slug });

  if (sections.isPending)
    return (
      <div className="adm-state">
        <Spinner size="large" />
      </div>
    );
  if (sections.isError)
    return (
      <div className="adm-state">
        <Note type="error">No se pudieron cargar las secciones.</Note>
      </div>
    );

  return (
    <>
      <div className="adm-rows">
        {sections.data.length === 0 && (
          <Note type="default" label="Sin secciones">
            Este proyecto todavía no tiene capturas. Agregá la primera abajo.
          </Note>
        )}
        {sections.data.map((s) => (
          <SectionRow key={s.id} section={s} onDone={invalidate} />
        ))}
      </div>
      <NewSectionForm slug={slug} onDone={invalidate} />
    </>
  );
}

function SectionFields({
  draft,
  setDraft,
}: {
  draft: SectionDraft;
  setDraft: (d: SectionDraft) => void;
}) {
  return (
    <div className="adm-fields">
      <Input
        label="Nombre del tab (ES)"
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        placeholder="Inicio"
        fullWidth
        required
      />
      <Input
        label="Nombre del tab (EN, opcional)"
        value={draft.labelEn}
        onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })}
        placeholder="Home"
        fullWidth
      />
      <div className="full">
        <ImageUpload
          value={draft.imageUrl}
          onChange={(imageUrl) => setDraft({ ...draft, imageUrl })}
          folder="screenshots"
          label="Captura de página completa"
        />
      </div>
      <Input
        label="Orden"
        type="number"
        value={String(draft.sortOrder)}
        onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
        fullWidth
      />
    </div>
  );
}

function SectionRow({ section, onDone }: { section: Section; onDone: () => void }) {
  const [draft, setDraft] = useState<SectionDraft>({
    label: section.label,
    labelEn: section.labelEn ?? "",
    imageUrl: section.imageUrl,
    sortOrder: section.sortOrder,
  });
  const update = api.showcase.update.useMutation({ onSuccess: onDone });
  const remove = api.showcase.delete.useMutation({ onSuccess: onDone });

  return (
    <div className="adm-editor">
      <SectionFields draft={draft} setDraft={setDraft} />
      {(update.isError || remove.isError) && (
        <Note type="error" style={{ marginTop: 12 }}>
          No se pudo guardar el cambio. Probá de nuevo.
        </Note>
      )}
      <div className="adm-actions">
        <Button
          variant="error"
          size="small"
          loading={remove.isPending}
          onClick={() => {
            if (window.confirm(`¿Eliminar la sección “${section.label}”?`)) {
              remove.mutate({ id: section.id });
            }
          }}
        >
          Eliminar
        </Button>
        <Button
          variant="primary"
          size="small"
          loading={update.isPending}
          disabled={!draft.label.trim() || !draft.imageUrl.trim()}
          onClick={() =>
            update.mutate({
              id: section.id,
              label: draft.label,
              labelEn: draft.labelEn || undefined,
              imageUrl: draft.imageUrl,
              sortOrder: draft.sortOrder,
            })
          }
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

function NewSectionForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [draft, setDraft] = useState<SectionDraft>(EMPTY_DRAFT);
  const create = api.showcase.create.useMutation({
    onSuccess: () => {
      setDraft(EMPTY_DRAFT);
      onDone();
    },
  });

  return (
    <div className="adm-new">
      <h3>Agregar sección</h3>
      <SectionFields draft={draft} setDraft={setDraft} />
      {create.isError && (
        <Note type="error" style={{ marginTop: 12 }}>
          No se pudo crear la sección. Probá de nuevo.
        </Note>
      )}
      <div className="adm-actions">
        <Button
          variant="primary"
          loading={create.isPending}
          disabled={!draft.label.trim() || !draft.imageUrl.trim()}
          onClick={() =>
            create.mutate({
              projectSlug: slug,
              label: draft.label,
              labelEn: draft.labelEn || undefined,
              imageUrl: draft.imageUrl,
              sortOrder: draft.sortOrder,
            })
          }
        >
          Agregar sección
        </Button>
      </div>
    </div>
  );
}
