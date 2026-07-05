"use client";

import { useState } from "react";

import { Button, Input, Note, Spinner, Tabs } from "~/components/geist";
import { CONTENT } from "~/lib/content";
import { api } from "~/trpc/react";
import { logout } from "../actions";

const PROJECTS = CONTENT.es.projectData.map((p) => ({ slug: p.slug, name: p.name }));

interface SectionDraft {
  label: string;
  labelEn: string;
  imageUrl: string;
  sortOrder: number;
}

interface Section {
  id: number;
  label: string;
  labelEn: string | null;
  imageUrl: string;
  sortOrder: number;
}

export function AdminPanel() {
  const [slug, setSlug] = useState(PROJECTS[0]!.slug);
  const utils = api.useUtils();
  const sections = api.showcase.byProject.useQuery({ slug });
  const invalidate = () => utils.showcase.byProject.invalidate({ slug });

  return (
    <div className="wrap page-pad">
      <div className="page-head">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Capturas de proyectos</h1>
          <p className="lead">
            Cada sección es un tab del modal “Ver sitio”: un nombre y una captura de página
            completa (el visitante scrollea sobre la imagen).
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="secondary" size="small">
            Cerrar sesión
          </Button>
        </form>
      </div>

      <Tabs
        items={PROJECTS.map((p) => ({ value: p.slug, label: p.name }))}
        value={slug}
        onChange={setSlug}
      />

      {sections.isPending ? (
        <div className="adm-state">
          <Spinner size="large" />
        </div>
      ) : sections.isError ? (
        <div className="adm-state">
          <Note type="error" label="Sin conexión a la base">
            No se pudieron cargar las secciones. Verificá que la base de datos esté configurada
            (DATABASE_URL) y corriendo.
          </Note>
        </div>
      ) : (
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
      )}
    </div>
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
        <Input
          label="URL de la captura"
          value={draft.imageUrl}
          onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
          placeholder="/screenshots/proyecto-inicio.png o https://…supabase.co/storage/…"
          hint="Captura de página completa. Puede ser una ruta de /public o una URL (p. ej. Supabase Storage)."
          fullWidth
          required
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
    <div className="adm-row">
      <div className="adm-thumb">
        {draft.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.imageUrl} alt={draft.label} />
        ) : null}
      </div>
      <div>
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
    </div>
  );
}

const EMPTY_DRAFT: SectionDraft = { label: "", labelEn: "", imageUrl: "", sortOrder: 0 };

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
