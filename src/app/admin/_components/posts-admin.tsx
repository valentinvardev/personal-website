"use client";

import { useRef, useState } from "react";

import { Badge, Button, Icon, Input, Note, Spinner, Switch, Textarea } from "~/components/geist";
import { Logo } from "~/components/site/logo";
import { formatBytes, shortDate } from "~/lib/time";
import { api, type RouterOutputs } from "~/trpc/react";

type PostRow = RouterOutputs["posts"]["adminList"][number];

interface Attachment {
  kind: "image" | "file";
  url: string;
  name: string;
  mime?: string;
  size?: number;
  sortOrder: number;
}

interface Draft {
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  published: boolean;
  attachments: Attachment[];
}

const EMPTY: Draft = {
  title: "",
  body: "",
  category: "",
  pinned: false,
  published: true,
  attachments: [],
};

async function uploadTo(
  folder: "posts" | "files",
  file: File,
): Promise<{ ok: true; att: Omit<Attachment, "sortOrder"> } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  try {
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const json = (await res.json()) as { url?: string; error?: string; mime?: string };
    if (!res.ok || !json.url) return { ok: false, error: json.error ?? "No se pudo subir." };
    return {
      ok: true,
      att: {
        kind: folder === "files" ? "file" : "image",
        url: json.url,
        name: file.name,
        mime: json.mime,
        size: file.size,
      },
    };
  } catch {
    return { ok: false, error: "No se pudo subir." };
  }
}

export function PostsAdmin() {
  const posts = api.posts.adminList.useQuery();
  const [editing, setEditing] = useState<number | null>(null);

  if (posts.isPending)
    return (
      <div className="adm-state">
        <Spinner size="large" />
      </div>
    );
  if (posts.isError)
    return (
      <div className="adm-state">
        <Note type="error" label="Sin conexión a la base">
          No se pudieron cargar las publicaciones.
        </Note>
      </div>
    );

  return (
    <div className="adm-section">
      {/* Composer siempre arriba, como en una red social */}
      <Composer onDone={() => undefined} />

      <div className="adm-rows">
        {posts.data.map((p) =>
          editing === p.id ? (
            <Composer key={p.id} post={p} onDone={() => setEditing(null)} />
          ) : (
            <div key={p.id} className="adm-item">
              <Logo mark height={28} />
              <div className="adm-item__body">
                <div className="adm-item__head">
                  <strong>{p.title ?? (p.body.length > 60 ? p.body.slice(0, 60) + "…" : p.body)}</strong>
                  {!p.published && (
                    <Badge color="amber" size="small">
                      Borrador
                    </Badge>
                  )}
                  {p.pinned && (
                    <Badge color="blue" size="small">
                      Fijado
                    </Badge>
                  )}
                  {p.category && (
                    <Badge color="gray" size="small">
                      {p.category}
                    </Badge>
                  )}
                </div>
                <span className="adm-item__meta">
                  {shortDate(p.createdAt, "es")}
                  {p.attachments.length > 0 && ` · ${p.attachments.length} adjuntos`}
                </span>
              </div>
              <Button variant="secondary" size="small" onClick={() => setEditing(p.id)}>
                Editar
              </Button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function Composer({ post, onDone }: { post?: PostRow; onDone: () => void }) {
  const [d, setD] = useState<Draft>(
    post
      ? {
          title: post.title ?? "",
          body: post.body,
          category: post.category ?? "",
          pinned: post.pinned,
          published: post.published,
          attachments: post.attachments.map((a, i) => ({
            kind: a.kind === "file" ? "file" : "image",
            url: a.url,
            name: a.name,
            mime: a.mime ?? undefined,
            size: a.size ?? undefined,
            sortOrder: i,
          })),
        }
      : EMPTY,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();
  const invalidate = () => {
    void utils.posts.invalidate();
    if (!post) setD(EMPTY);
    onDone();
  };
  const create = api.posts.create.useMutation({ onSuccess: invalidate });
  const update = api.posts.update.useMutation({ onSuccess: invalidate });
  const remove = api.posts.delete.useMutation({ onSuccess: invalidate });
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  const addFiles = async (files: FileList | null, folder: "posts" | "files") => {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    for (const file of Array.from(files)) {
      const r = await uploadTo(folder, file);
      if (r.ok) {
        setD((prev) => ({
          ...prev,
          attachments: [...prev.attachments, { ...r.att, sortOrder: prev.attachments.length }],
        }));
      } else {
        setUploadError(r.error);
      }
    }
    setUploading(false);
  };

  const removeAtt = (idx: number) =>
    setD((prev) => ({
      ...prev,
      attachments: prev.attachments
        .filter((_, i) => i !== idx)
        .map((a, i) => ({ ...a, sortOrder: i })),
    }));

  const save = () => {
    const input = {
      title: d.title || undefined,
      body: d.body.trim(),
      category: d.category || undefined,
      pinned: d.pinned,
      published: d.published,
      attachments: d.attachments,
    };
    if (post) update.mutate({ id: post.id, ...input });
    else create.mutate(input);
  };

  const images = d.attachments.filter((a) => a.kind === "image");
  const files = d.attachments.filter((a) => a.kind === "file");
  const busy = create.isPending || update.isPending || remove.isPending;

  return (
    <div className="composer">
      <div className="composer__head">
        <Logo mark height={32} />
        <div className="composer__fields">
          <input
            className="composer__title"
            placeholder="Título (opcional)"
            value={d.title}
            onChange={(e) => set({ title: e.target.value })}
            maxLength={200}
          />
          <Textarea
            rows={post ? 6 : 3}
            placeholder="¿Qué estás construyendo?"
            value={d.body}
            onChange={(e) => set({ body: e.target.value })}
          />
        </div>
      </div>

      {images.length > 0 && (
        <div className="att-strip">
          {images.map((a, i) => (
            <span key={a.url} className="att-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} />
              <button
                type="button"
                aria-label="Quitar imagen"
                onClick={() => removeAtt(d.attachments.indexOf(a) >= 0 ? d.attachments.indexOf(a) : i)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="att-files">
          {files.map((a) => (
            <span key={a.url} className="att-file">
              <Icon name="box" size={14} />
              <span className="att-file__name">{a.name}</span>
              <span className="att-file__size">{formatBytes(a.size, "es")}</span>
              <button
                type="button"
                aria-label="Quitar archivo"
                onClick={() => removeAtt(d.attachments.indexOf(a))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {uploadError && (
        <Note type="error" style={{ marginTop: 10 }}>
          {uploadError}
        </Note>
      )}
      {(create.isError || update.isError || remove.isError) && (
        <Note type="error" style={{ marginTop: 10 }}>
          No se pudo guardar la publicación. Probá de nuevo.
        </Note>
      )}

      <div className="composer__bar">
        <div className="composer__tools">
          <Button
            variant="tertiary"
            size="small"
            prefix={<Icon name="camera" size={15} />}
            loading={uploading}
            onClick={() => imgInput.current?.click()}
          >
            Imagen
          </Button>
          <Button
            variant="tertiary"
            size="small"
            prefix={<Icon name="box" size={15} />}
            loading={uploading}
            onClick={() => fileInput.current?.click()}
          >
            Archivo
          </Button>
          <input
            className="composer__cat"
            placeholder="Categoría"
            value={d.category}
            onChange={(e) => set({ category: e.target.value })}
            maxLength={60}
          />
        </div>
        <div className="composer__opts">
          <Switch
            size="small"
            checked={d.pinned}
            onChange={(e) => set({ pinned: e.target.checked })}
            label="Fijado"
          />
          <Switch
            size="small"
            checked={d.published}
            onChange={(e) => set({ published: e.target.checked })}
            label="Publicado"
          />
          {post && (
            <>
              <Button
                variant="error"
                size="small"
                loading={remove.isPending}
                onClick={() => {
                  if (window.confirm("¿Eliminar esta publicación?")) remove.mutate({ id: post.id });
                }}
              >
                Eliminar
              </Button>
              <Button variant="secondary" size="small" onClick={onDone} disabled={busy}>
                Cancelar
              </Button>
            </>
          )}
          <Button
            variant="primary"
            size="small"
            loading={create.isPending || update.isPending}
            disabled={!d.body.trim() || uploading}
            onClick={save}
          >
            {post ? "Guardar cambios" : "Publicar"}
          </Button>
        </div>
      </div>

      <input
        ref={imgInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          void addFiles(e.target.files, "posts");
          e.target.value = "";
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.zip,.txt,.md,.csv,.json,.mp4,.webm,.mp3"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          void addFiles(e.target.files, "files");
          e.target.value = "";
        }}
      />
    </div>
  );
}
