"use client";

import { useState } from "react";

import { Button, Icon, Input, Note, Spinner, Textarea } from "~/components/geist";
import { accentVar, asIcon, type Accent } from "~/lib/catalog";
import { api, type RouterOutputs } from "~/trpc/react";
import { ImageUpload } from "./image-upload";
import { AdminSelect, ColorPicker, FieldLabel, IconPicker } from "./pickers";

type NicheRow = RouterOutputs["catalog"]["niches"][number];
type BlockRow = RouterOutputs["catalog"]["nicheBySlug"]["blocks"][number];

/* ===================== Nichos ===================== */

interface NicheDraft {
  slug: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  icon: string;
  color: string;
  sortOrder: number;
}

const EMPTY_NICHE: NicheDraft = {
  slug: "",
  name: "",
  nameEn: "",
  tagline: "",
  taglineEn: "",
  icon: "box",
  color: "blue",
  sortOrder: 0,
};

export function NichesAdmin() {
  const niches = api.catalog.niches.useQuery();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [openBlocks, setOpenBlocks] = useState<string | null>(null);

  if (niches.isPending)
    return (
      <div className="adm-state">
        <Spinner size="large" />
      </div>
    );
  if (niches.isError)
    return (
      <div className="adm-state">
        <Note type="error" label="Sin conexión a la base">
          No se pudieron cargar los nichos.
        </Note>
      </div>
    );

  return (
    <div className="adm-section">
      <div className="adm-rows">
        {niches.data.map((n) => (
          <div key={n.id} className="adm-block">
            {editing === n.id ? (
              <NicheEditor niche={n} onDone={() => setEditing(null)} />
            ) : (
              <div className="adm-item">
                <span
                  className="adm-nglyph"
                  style={{ background: accentVar(n.color, 700) }}
                >
                  <Icon name={asIcon(n.icon)} size={18} />
                </span>
                <div className="adm-item__body">
                  <div className="adm-item__head">
                    <strong>{n.name}</strong>
                  </div>
                  <span className="adm-item__meta">
                    /niches/{n.slug} · {n._count.projects} proyectos · orden {n.sortOrder}
                  </span>
                </div>
                <Button
                  variant="tertiary"
                  size="small"
                  onClick={() => setOpenBlocks(openBlocks === n.slug ? null : n.slug)}
                >
                  Material
                </Button>
                <Button variant="secondary" size="small" onClick={() => setEditing(n.id)}>
                  Editar
                </Button>
              </div>
            )}
            {openBlocks === n.slug && <BlocksEditor nicheSlug={n.slug} nicheId={n.id} />}
          </div>
        ))}
      </div>
      {editing === "new" ? (
        <div className="adm-new">
          <h3>Agregar nicho</h3>
          <NicheEditor onDone={() => setEditing(null)} />
        </div>
      ) : (
        <div className="adm-addbar">
          <Button variant="primary" onClick={() => setEditing("new")}>
            Agregar nicho
          </Button>
        </div>
      )}
    </div>
  );
}

function NicheEditor({ niche, onDone }: { niche?: NicheRow; onDone: () => void }) {
  const [d, setD] = useState<NicheDraft>(
    niche
      ? {
          slug: niche.slug,
          name: niche.name,
          nameEn: niche.nameEn ?? "",
          tagline: niche.tagline ?? "",
          taglineEn: niche.taglineEn ?? "",
          icon: niche.icon,
          color: niche.color,
          sortOrder: niche.sortOrder,
        }
      : EMPTY_NICHE,
  );
  const utils = api.useUtils();
  const invalidate = () => {
    void utils.catalog.invalidate();
    onDone();
  };
  const create = api.catalog.createNiche.useMutation({ onSuccess: invalidate });
  const update = api.catalog.updateNiche.useMutation({ onSuccess: invalidate });
  const remove = api.catalog.deleteNiche.useMutation({ onSuccess: invalidate });
  const set = (patch: Partial<NicheDraft>) => setD({ ...d, ...patch });

  const save = () => {
    const input = {
      slug: d.slug.trim(),
      name: d.name.trim(),
      nameEn: d.nameEn || undefined,
      tagline: d.tagline || undefined,
      taglineEn: d.taglineEn || undefined,
      icon: d.icon,
      color: d.color as Accent,
      sortOrder: d.sortOrder,
    };
    if (niche) update.mutate({ id: niche.id, ...input });
    else create.mutate(input);
  };

  return (
    <div className="adm-editor">
      <div className="adm-fields">
        <Input label="Nombre (ES)" value={d.name} onChange={(e) => set({ name: e.target.value })} fullWidth required />
        <Input label="Nombre (EN)" value={d.nameEn} onChange={(e) => set({ nameEn: e.target.value })} fullWidth />
        <Input
          label="Slug (URL)"
          value={d.slug}
          onChange={(e) => set({ slug: e.target.value })}
          hint="minúsculas-con-guiones"
          fullWidth
          required
        />
        <Input
          label="Orden"
          type="number"
          value={String(d.sortOrder)}
          onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
          fullWidth
        />
        <div className="full">
          <Textarea label="Tagline (ES)" rows={2} value={d.tagline} onChange={(e) => set({ tagline: e.target.value })} />
        </div>
        <div className="full">
          <Textarea label="Tagline (EN)" rows={2} value={d.taglineEn} onChange={(e) => set({ taglineEn: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Icono</FieldLabel>
          <IconPicker value={d.icon} onChange={(icon) => set({ icon })} />
        </div>
        <div>
          <FieldLabel>Color del lomo</FieldLabel>
          <ColorPicker value={d.color} onChange={(color) => set({ color })} />
        </div>
      </div>
      {(create.isError || update.isError || remove.isError) && (
        <Note type="error" style={{ marginTop: 12 }}>
          No se pudo guardar. Revisá el slug (único, minúsculas-con-guiones) y probá de nuevo.
        </Note>
      )}
      <div className="adm-actions">
        {niche && (
          <Button
            variant="error"
            size="small"
            loading={remove.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `¿Eliminar el nicho “${niche.name}”? Sus proyectos quedan sin nicho y su material se borra.`,
                )
              ) {
                remove.mutate({ id: niche.id });
              }
            }}
          >
            Eliminar
          </Button>
        )}
        <Button variant="secondary" size="small" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="small"
          loading={create.isPending || update.isPending}
          disabled={!d.name.trim() || !d.slug.trim()}
          onClick={save}
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

/* ===================== Material (tarjetas) ===================== */

interface BlockDraft {
  kind: "text" | "image";
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  imageUrl: string;
  span: "sm" | "md" | "lg";
  sortOrder: number;
}

const EMPTY_BLOCK: BlockDraft = {
  kind: "text",
  title: "",
  titleEn: "",
  body: "",
  bodyEn: "",
  imageUrl: "",
  span: "md",
  sortOrder: 0,
};

function BlocksEditor({ nicheSlug, nicheId }: { nicheSlug: string; nicheId: number }) {
  const detail = api.catalog.nicheBySlug.useQuery({ slug: nicheSlug });

  if (detail.isPending)
    return (
      <div className="adm-state">
        <Spinner />
      </div>
    );
  if (detail.isError)
    return (
      <div className="adm-state">
        <Note type="error">No se pudo cargar el material.</Note>
      </div>
    );

  return (
    <div className="adm-blocks">
      {detail.data.blocks.length === 0 && (
        <Note type="default" label="Sin material">
          Este nicho todavía no tiene tarjetas. Agregá la primera abajo.
        </Note>
      )}
      {detail.data.blocks.map((b) => (
        <BlockEditor key={b.id} block={b} nicheSlug={nicheSlug} />
      ))}
      <div className="adm-new">
        <h3>Agregar tarjeta</h3>
        <BlockEditor nicheId={nicheId} nicheSlug={nicheSlug} />
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  nicheId,
  nicheSlug,
}: {
  block?: BlockRow;
  nicheId?: number;
  nicheSlug: string;
}) {
  const [d, setD] = useState<BlockDraft>(
    block
      ? {
          kind: block.kind === "image" ? "image" : "text",
          title: block.title ?? "",
          titleEn: block.titleEn ?? "",
          body: block.body ?? "",
          bodyEn: block.bodyEn ?? "",
          imageUrl: block.imageUrl ?? "",
          span: block.span === "sm" || block.span === "lg" ? block.span : "md",
          sortOrder: block.sortOrder,
        }
      : EMPTY_BLOCK,
  );
  const utils = api.useUtils();
  const invalidate = () => {
    void utils.catalog.nicheBySlug.invalidate({ slug: nicheSlug });
    if (!block) setD(EMPTY_BLOCK);
  };
  const create = api.catalog.createBlock.useMutation({ onSuccess: invalidate });
  const update = api.catalog.updateBlock.useMutation({ onSuccess: invalidate });
  const remove = api.catalog.deleteBlock.useMutation({ onSuccess: invalidate });
  const set = (patch: Partial<BlockDraft>) => setD({ ...d, ...patch });

  const save = () => {
    const input = {
      kind: d.kind,
      title: d.title || undefined,
      titleEn: d.titleEn || undefined,
      body: d.body || undefined,
      bodyEn: d.bodyEn || undefined,
      imageUrl: d.imageUrl || undefined,
      span: d.span,
      sortOrder: d.sortOrder,
    };
    if (block) update.mutate({ id: block.id, ...input });
    else create.mutate({ ...input, nicheId: nicheId ?? null, projectId: null });
  };

  const valid = d.kind === "image" ? d.imageUrl.trim().length > 0 : d.body.trim().length > 0;

  return (
    <div className="adm-editor adm-editor--block">
      <div className="adm-fields">
        <AdminSelect
          label="Tipo"
          value={d.kind}
          onChange={(e) => set({ kind: e.target.value === "image" ? "image" : "text" })}
        >
          <option value="text">Nota de texto</option>
          <option value="image">Imagen</option>
        </AdminSelect>
        <AdminSelect
          label="Ancho en la grilla"
          value={d.span}
          onChange={(e) => set({ span: e.target.value as BlockDraft["span"] })}
        >
          <option value="sm">Angosta (1/3)</option>
          <option value="md">Media (1/2)</option>
          <option value="lg">Completa</option>
        </AdminSelect>
        <Input label="Título (ES)" value={d.title} onChange={(e) => set({ title: e.target.value })} fullWidth />
        <Input label="Título (EN)" value={d.titleEn} onChange={(e) => set({ titleEn: e.target.value })} fullWidth />
        {d.kind === "text" ? (
          <>
            <div className="full">
              <Textarea
                label="Texto (ES)"
                rows={4}
                value={d.body}
                onChange={(e) => set({ body: e.target.value })}
                placeholder={"Párrafos separados por una línea en blanco"}
              />
            </div>
            <div className="full">
              <Textarea label="Texto (EN)" rows={4} value={d.bodyEn} onChange={(e) => set({ bodyEn: e.target.value })} />
            </div>
          </>
        ) : (
          <div className="full">
            <ImageUpload
              value={d.imageUrl}
              onChange={(imageUrl) => set({ imageUrl })}
              folder="material"
              label="Imagen de la tarjeta"
            />
          </div>
        )}
        <Input
          label="Orden"
          type="number"
          value={String(d.sortOrder)}
          onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
          fullWidth
        />
      </div>
      {(create.isError || update.isError || remove.isError) && (
        <Note type="error" style={{ marginTop: 12 }}>
          No se pudo guardar la tarjeta. Probá de nuevo.
        </Note>
      )}
      <div className="adm-actions">
        {block && (
          <Button
            variant="error"
            size="small"
            loading={remove.isPending}
            onClick={() => {
              if (window.confirm("¿Eliminar esta tarjeta?")) remove.mutate({ id: block.id });
            }}
          >
            Eliminar
          </Button>
        )}
        <Button
          variant="primary"
          size="small"
          loading={create.isPending || update.isPending}
          disabled={!valid}
          onClick={save}
        >
          {block ? "Guardar cambios" : "Agregar tarjeta"}
        </Button>
      </div>
    </div>
  );
}
