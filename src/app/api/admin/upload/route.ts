import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { adminTokenFromCookieHeader, isValidAdminToken } from "~/server/admin-auth";
import {
  ALLOWED_FILE_TYPES,
  ALLOWED_IMAGE_TYPES,
  fileSignatureOk,
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  sniffImageType,
  storageConfigured,
  uploadMedia,
} from "~/server/storage";

const FOLDERS = ["screenshots", "material", "posts", "files"] as const;
type Folder = (typeof FOLDERS)[number];

/**
 * Subida segura de multimedia para /admin:
 * - solo con la cookie de sesión de admin,
 * - imágenes verificadas por firma binaria; archivos por whitelist de
 *   extensión + firma cuando el formato la tiene,
 * - tamaño acotado, nombre generado en el servidor, content-type forzado
 *   desde el servidor (nunca el declarado por el cliente),
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
  const folder: Folder = FOLDERS.includes(folderRaw as Folder) ? (folderRaw as Folder) : "material";
  const isFileUpload = folder === "files";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }
  const maxBytes = isFileUpload ? MAX_FILE_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let contentType: string;
  let storedName: string;

  if (isFileUpload) {
    const ext = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] ?? "").toLowerCase();
    const mime = ALLOWED_FILE_TYPES[ext];
    if (!mime) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido. Formatos: ${Object.keys(ALLOWED_FILE_TYPES).join(", ")}.`,
        },
        { status: 415 },
      );
    }
    if (!fileSignatureOk(ext, bytes)) {
      return NextResponse.json(
        { error: "El contenido del archivo no coincide con su extensión." },
        { status: 415 },
      );
    }
    contentType = mime;
    // Base legible + sufijo único; nunca se usa el nombre original tal cual.
    const base =
      file.name
        .replace(/\.[a-z0-9]+$/i, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "archivo";
    storedName = `${base}-${randomUUID().slice(0, 8)}.${ext}`;
  } else {
    const realType = sniffImageType(bytes);
    if (!realType || !(realType in ALLOWED_IMAGE_TYPES)) {
      return NextResponse.json(
        { error: "Formato no permitido. Solo imágenes PNG, JPEG, WebP, GIF o AVIF." },
        { status: 415 },
      );
    }
    contentType = realType;
    storedName = `${Date.now()}-${randomUUID()}.${ALLOWED_IMAGE_TYPES[realType]}`;
  }

  try {
    const url = await uploadMedia(folder, storedName, contentType, bytes);
    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
      mime: contentType,
    });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ error: "No se pudo subir el archivo" }, { status: 500 });
  }
}
