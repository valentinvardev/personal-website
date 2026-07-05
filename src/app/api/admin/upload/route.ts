import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { adminTokenFromCookieHeader, isValidAdminToken } from "~/server/admin-auth";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  sniffImageType,
  storageConfigured,
  uploadImage,
} from "~/server/storage";

/**
 * Subida segura de multimedia para /admin:
 * - solo con la cookie de sesión de admin,
 * - solo imágenes (se verifica la firma binaria real, no la extensión),
 * - tamaño acotado, nombre generado en el servidor (nunca el original),
 * - la secret key de Supabase no sale del servidor.
 */
export async function POST(req: NextRequest) {
  const token = adminTokenFromCookieHeader(req.headers.get("cookie"));
  if (!isValidAdminToken(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!storageConfigured()) {
    return NextResponse.json(
      { error: "Supabase Storage no está configurado (SUPABASE_SECRET_KEY / NEXT_PUBLIC_SUPABASE_URL)" },
      { status: 501 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const folderRaw = form?.get("folder");
  const folder = folderRaw === "screenshots" ? "screenshots" : "material";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `El archivo supera el máximo de ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const realType = sniffImageType(bytes);
  if (!realType || !(realType in ALLOWED_IMAGE_TYPES)) {
    return NextResponse.json(
      { error: "Formato no permitido. Solo imágenes PNG, JPEG, WebP, GIF o AVIF." },
      { status: 415 },
    );
  }

  const ext = ALLOWED_IMAGE_TYPES[realType]!;
  const name = `${Date.now()}-${randomUUID()}.${ext}`;

  try {
    const url = await uploadImage(folder, name, realType, bytes);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ error: "No se pudo subir el archivo" }, { status: 500 });
  }
}
