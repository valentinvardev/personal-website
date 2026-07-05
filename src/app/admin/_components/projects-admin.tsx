"use client";

import { useState } from "react";

import { Badge, Button, Input, Note, Spinner, Switch, Textarea } from "~/components/geist";
import { ProjectGlyph } from "~/components/site/project-bits";
import { asAccent, asIcon } from "~/lib/catalog";
import { api, type RouterOutputs } from "~/trpc/react";
import { ImageUpload } from "./image-upload";
import { AdminSelect, ColorPicker, FieldLabel, IconPicker } from "./pickers";

type ProjectRow = RouterOutputs["catalog"]["projects"][number];
type NicheRow = RouterOutputs["catalog"]["niches"][number];

interface Draft {
  slug: string;
  name: string;
  icon: string;
  color: string;
  logoUrl: string;
  role: string;
  roleEn: string;
  statusColor: string;
  statusLabel: string;
  statusLabelEn: string;
  short: string;
  shortEn: string;
  long: string;
  longEn: string;
  stack: string;
  features: string;
  featuresEn: string;
  liveUrl: string;
  repoUrl: string;
  featured: boolean;
  sortOrder: number;
  nicheId: number | null;
}

const EMPTY: Draft = {
  slug: "",
  name: "",
  icon: "box",
  color: "blue",
  logoUrl: "",
  role: "",
  roleEn: "",
  statusColor: "green",
  statusLabel: "En producción",
  statusLabelEn: "In production",
  short: "",
  shortEn: "",
  long: "",
  longEn: "",
  stack: "",
  features: "",
  featuresEn: "",
  liveUrl: "",
  repoUrl: "",
  featured: false,
  sortOrder: 0,
  nicheId: null,
};

function toDraft(p: ProjectRow): Draft {
  return {
    slug: p.slug,
    name: p.name,
    icon: p.icon,
    color: p.color,
    logoUrl: p.logoUrl ?? "",
    role: p.role ?? "",
    roleEn: p.roleEn ?? "",
    statusColor: p.statusColor,
    statusLabel: p.statusLabel,
    statusLabelEn: p.statusLabelEn ?? "",
    short: p.short,
    shortEn: p.shortEn ?? "",
    long: p.long ?? "",
    longEn: p.longEn ?? "",
    stack: p.stack.join(", "),
    features: p.features.join("\n"),
    featuresEn: p.featuresEn.join("\n"),
    liveUrl: p.liveUrl ?? "",
    repoUrl: p.repoUrl ?? "",
    featured: p.featured,
    sortOrder: p.sortOrder,
    nicheId: p.nicheId,
  };
}

function toInput(d: Draft) {
  const lines = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  return {
    slug: d.slug.trim(),
    name: d.name.trim(),
    icon: d.icon,
    color: asAccent(d.color),
    logoUrl: d.logoUrl || undefined,
    role: d.role || undefined,
    roleEn: d.roleEn || undefined,
    statusColor: asAccent(d.statusColor),
    statusLabel: d.statusLabel.trim(),
    statusLabelEn: d.statusLabelEn || undefined,
    short: d.short.trim(),
    shortEn: d.shortEn || undefined,
    long: d.long || undefined,
    longEn: d.longEn || undefined,
    stack: d.stack
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    features: lines(d.features),
    featuresEn: lines(d.featuresEn),
    liveUrl: d.liveUrl || undefined,
    repoUrl: d.repoUrl || undefined,
    featured: d.featured,
    sortOrder: d.sortOrder,
    nicheId: d.nicheId,
  };
}

export function ProjectsAdmin() {
  const projects = api.catalog.projects.useQuery();
  const niches = api.catalog.niches.useQuery();
  const [editing, setEditing] = useState<number | "new" | null>(null);

  if (projects.isPending || niches.isPending)
    return (
      <div className="adm-state">
        <Spinner size="large" />
      </div>
    );
  if (projects.isError || niches.isError)
    return (
      <div className="adm-state">
        <Note type="error" label="Sin conexión a la base">
          No se pudieron cargar los proyectos.
        </Note>
      </div>
    );

  return (
    <div className="adm-section">
      <div className="adm-rows">
        {projects.data.map((p) =>
          editing === p.id ? (
            <ProjectEditor
              key={p.id}
              project={p}
              niches={niches.data}
              onDone={() => setEditing(null)}
            />
          ) : (
            <div key={p.id} className="adm-item">
              <ProjectGlyph icon={asIcon(p.icon)} color={p.color} logoUrl={p.logoUrl} size={38} />
              <div className="adm-item__body">
                <div className="adm-item__head">
                  <strong>{p.name}</strong>
                  <Badge color={asAccent(p.statusColor)} size="small" dot>
                    {p.statusLabel}
                  </Badge>
                  {p.featured && (
                    <Badge color="blue" size="small">
                      Destacado
                    </Badge>
                  )}
                </div>
                <span className="adm-item__meta">
                  /{p.slug}
                  {p.niche ? ` · ${p.niche.name}` : " · Sin nicho"} · orden {p.sortOrder}
                </span>
              </div>
              <Button variant="secondary" size="small" onClick={() => setEditing(p.id)}>
                Editar
              </Button>
            </div>
          ),
        )}
      </div>
      {editing === "new" ? (
        <div className="adm-new">
          <h3>Agregar proyecto</h3>
          <ProjectEditor niches={niches.data} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <div className="adm-addbar">
          <Button variant="primary" onClick={() => setEditing("new")}>
            Agregar proyecto
          </Button>
        </div>
      )}
    </div>
  );
}

function ProjectEditor({
  project,
  niches,
  onDone,
}: {
  project?: ProjectRow;
  niches: NicheRow[];
  onDone: () => void;
}) {
  const [d, setD] = useState<Draft>(project ? toDraft(project) : EMPTY);
  const utils = api.useUtils();
  const invalidate = () => {
    void utils.catalog.invalidate();
    onDone();
  };
  const create = api.catalog.createProject.useMutation({ onSuccess: invalidate });
  const update = api.catalog.updateProject.useMutation({ onSuccess: invalidate });
  const remove = api.catalog.deleteProject.useMutation({ onSuccess: invalidate });
  const busy = create.isPending || update.isPending || remove.isPending;
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch });

  const save = () => {
    const input = toInput(d);
    if (project) update.mutate({ id: project.id, ...input });
    else create.mutate(input);
  };

  return (
    <div className="adm-editor">
      <div className="adm-fields">
        <Input label="Nombre" value={d.name} onChange={(e) => set({ name: e.target.value })} fullWidth required />
        <Input
          label="Slug (URL)"
          value={d.slug}
          onChange={(e) => set({ slug: e.target.value })}
          hint="minúsculas-con-guiones"
          fullWidth
          required
        />
        <div>
          <FieldLabel>Icono</FieldLabel>
          <IconPicker value={d.icon} onChange={(icon) => set({ icon })} />
        </div>
        <div className="full">
          <ImageUpload
            value={d.logoUrl}
            onChange={(logoUrl) => set({ logoUrl })}
            folder="logos"
            label="Logo del proyecto (opcional — reemplaza al icono y color)"
          />
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <ColorPicker value={d.color} onChange={(color) => set({ color })} />
          <div style={{ height: 10 }} />
          <FieldLabel>Color del estado</FieldLabel>
          <ColorPicker value={d.statusColor} onChange={(statusColor) => set({ statusColor })} />
        </div>
        <Input label="Estado (ES)" value={d.statusLabel} onChange={(e) => set({ statusLabel: e.target.value })} fullWidth />
        <Input label="Estado (EN)" value={d.statusLabelEn} onChange={(e) => set({ statusLabelEn: e.target.value })} fullWidth />
        <Input label="Rol (ES)" value={d.role} onChange={(e) => set({ role: e.target.value })} fullWidth />
        <Input label="Rol (EN)" value={d.roleEn} onChange={(e) => set({ roleEn: e.target.value })} fullWidth />
        <div className="full">
          <Textarea label="Resumen (ES)" rows={2} value={d.short} onChange={(e) => set({ short: e.target.value })} required />
        </div>
        <div className="full">
          <Textarea label="Resumen (EN)" rows={2} value={d.shortEn} onChange={(e) => set({ shortEn: e.target.value })} />
        </div>
        <div className="full">
          <Textarea label="Descripción larga (ES)" rows={3} value={d.long} onChange={(e) => set({ long: e.target.value })} />
        </div>
        <div className="full">
          <Textarea label="Descripción larga (EN)" rows={3} value={d.longEn} onChange={(e) => set({ longEn: e.target.value })} />
        </div>
        <div className="full">
          <Input
            label="Stack"
            value={d.stack}
            onChange={(e) => set({ stack: e.target.value })}
            hint="Separado por comas — las tecnologías conocidas muestran su logo"
            fullWidth
          />
        </div>
        <Textarea label="Highlights (ES)" rows={4} value={d.features} onChange={(e) => set({ features: e.target.value })} placeholder={"Uno por línea"} />
        <Textarea label="Highlights (EN)" rows={4} value={d.featuresEn} onChange={(e) => set({ featuresEn: e.target.value })} placeholder={"One per line"} />
        <Input label="URL en vivo" value={d.liveUrl} onChange={(e) => set({ liveUrl: e.target.value })} placeholder="https://…" fullWidth />
        <Input label="URL del código" value={d.repoUrl} onChange={(e) => set({ repoUrl: e.target.value })} placeholder="https://github.com/…" fullWidth />
        <AdminSelect
          label="Nicho"
          value={d.nicheId ?? ""}
          onChange={(e) => set({ nicheId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Sin nicho</option>
          {niches.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </AdminSelect>
        <Input
          label="Orden"
          type="number"
          value={String(d.sortOrder)}
          onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
          fullWidth
        />
        <div className="full" style={{ paddingTop: 4 }}>
          <Switch
            checked={d.featured}
            onChange={(e) => set({ featured: e.target.checked })}
            label="Destacado en el inicio"
          />
        </div>
      </div>
      {(create.isError || update.isError || remove.isError) && (
        <Note type="error" style={{ marginTop: 12 }}>
          No se pudo guardar. Revisá el slug (único, minúsculas-con-guiones) y probá de nuevo.
        </Note>
      )}
      <div className="adm-actions">
        {project && (
          <Button
            variant="error"
            size="small"
            loading={remove.isPending}
            onClick={() => {
              if (window.confirm(`¿Eliminar el proyecto “${project.name}” y sus capturas?`)) {
                remove.mutate({ id: project.id });
              }
            }}
          >
            Eliminar
          </Button>
        )}
        <Button variant="secondary" size="small" onClick={onDone} disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="small"
          loading={create.isPending || update.isPending}
          disabled={!d.name.trim() || !d.slug.trim() || !d.short.trim()}
          onClick={save}
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
