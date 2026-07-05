import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "~/env";

/**
 * Supabase Storage del lado del servidor (secret key — nunca llega al
 * cliente). El bucket es propio de este sitio dentro del proyecto Supabase
 * compartido; crearlo no afecta al otro sistema.
 */
export const MEDIA_BUCKET = "personal-site-media";
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // capturas de página completa
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // recursos descargables

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/* Recursos descargables permitidos: extensión → content-type servido.
   El content-type SIEMPRE sale de esta tabla, nunca del cliente. */
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
};

let client: SupabaseClient | null = null;
let bucketReady = false;

export function storageConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const supabase = getClient();
  const allowed = [...Object.keys(ALLOWED_IMAGE_TYPES), ...Object.values(ALLOWED_FILE_TYPES)];
  const { data } = await supabase.storage.getBucket(MEDIA_BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_BYTES,
      allowedMimeTypes: allowed,
    });
    // Si otro request lo creó en paralelo, seguir.
    if (error && !/already exists/i.test(error.message)) throw error;
  } else {
    // Mantener la config sincronizada (p. ej. tipos nuevos permitidos).
    await supabase.storage.updateBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_BYTES,
      allowedMimeTypes: allowed,
    });
  }
  bucketReady = true;
}

/** Firma binaria real de una imagen — no se confía en la extensión. */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38)
    return "image/gif";
  // AVIF: caja ISO-BMFF "ftyp" + marca avif/avis
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69
  )
    return "image/avif";
  return null;
}

/**
 * Verifica la firma binaria de los formatos de archivo que la tienen.
 * Los formatos de texto (txt/md/csv/json) no tienen firma: se aceptan
 * por whitelist de extensión y content-type forzado desde el servidor.
 */
export function fileSignatureOk(ext: string, bytes: Uint8Array): boolean {
  switch (ext) {
    case "pdf":
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
    case "zip":
      return bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05); // PK
    case "mp4":
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70; // ftyp
    case "webm":
      return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    case "mp3":
      return (
        (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3
        (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0)
      );
    default:
      return true; // formatos de texto: sin firma
  }
}

export async function uploadMedia(
  folder: "screenshots" | "material" | "posts" | "files" | "logos",
  fileName: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<string> {
  await ensureBucket();
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(`${folder}/${fileName}`, bytes, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(`${folder}/${fileName}`);
  return data.publicUrl;
}
