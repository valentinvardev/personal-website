import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "~/env";

/**
 * Supabase Storage del lado del servidor (secret key — nunca llega al
 * cliente). El bucket es propio de este sitio dentro del proyecto Supabase
 * compartido; crearlo no afecta al otro sistema.
 */
export const MEDIA_BUCKET = "personal-site-media";
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // capturas de página completa

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
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
  const { data } = await supabase.storage.getBucket(MEDIA_BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: MAX_UPLOAD_BYTES,
      allowedMimeTypes: Object.keys(ALLOWED_IMAGE_TYPES),
    });
    // Si otro request lo creó en paralelo, seguir.
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  bucketReady = true;
}

/** Firma binaria real del archivo — no se confía en la extensión declarada. */
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

export async function uploadImage(
  folder: "screenshots" | "material",
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
