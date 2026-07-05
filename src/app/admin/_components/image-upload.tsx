"use client";

import { useRef, useState, type DragEvent } from "react";

import { Icon, Input, Spinner } from "~/components/geist";

const MAX_MB = 25;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

/**
 * Subida segura de imágenes: drag & drop o click → POST /api/admin/upload
 * (validación de firma binaria y tamaño en el servidor; requiere la cookie
 * de admin). También acepta pegar una URL externa.
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Imagen",
}: {
  value: string;
  onChange: (url: string) => void;
  folder: "screenshots" | "material";
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Formato no permitido. Solo PNG, JPEG, WebP, GIF o AVIF.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera el máximo de ${MAX_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "No se pudo subir el archivo.");
      } else {
        onChange(json.url);
      }
    } catch {
      setError("No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void upload(file);
  };

  return (
    <div className="upl">
      <span className="geist-field__label">{label}</span>
      <div
        className={"upl__zone" + (dragOver ? " is-over" : "")}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {uploading ? (
          <span className="upl__state">
            <Spinner size="small" /> Subiendo…
          </span>
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="upl__thumb" src={value} alt="" />
            <span className="upl__hint">Click o arrastrá para reemplazar</span>
          </>
        ) : (
          <span className="upl__state">
            <Icon name="camera" size={17} color="var(--ds-gray-700)" />
            Arrastrá una imagen o hacé click para elegirla
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <span className="geist-field__hint" data-error="true">{error}</span>}
      <Input
        size="small"
        placeholder="…o pegá una URL de imagen"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
      />
    </div>
  );
}
