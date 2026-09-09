import { NextResponse, type NextRequest } from "next/server";

import { adminTokenFromCookieHeader, isValidAdminToken } from "~/server/admin-auth";
import { db } from "~/server/db";
import { buildExport, countExportRows, HTTP_ROW_LIMIT } from "~/server/panel/export";
import { panelEnabled } from "~/server/panel/config";

/**
 * Descarga de todos los datos del panel. Cumple el checklist §13 de la spec
 * ("el endpoint de exportación existe") y es el botón de "llevarme mis datos".
 *
 * NO es el backup. Un backup que depende de que la web esté levantada no es
 * un backup: para eso está `scripts/panel-export.ts`, que corre por cron y no
 * necesita que el sitio responda.
 *
 * Sin streaming a propósito. El volumen real del v1 son unos 4 eventos por
 * día, ~1500 filas al año, muy por debajo de 1 MB de JSON. Un ReadableStream
 * con cursor resolvería un problema que llega en el año cinco, y a cambio hay
 * que acertarle a la paginación sobre una tabla con clave compuesta. El guard
 * de conteo cubre el caso raro.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Primero "existe", después "sos vos": el mismo orden que en el resto del
  // panel, para no confirmarle la ruta a nadie que la sondee.
  if (!panelEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isValidAdminToken(adminTokenFromCookieHeader(req.headers.get("cookie")))) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const rows = await countExportRows(db);
  if (rows > HTTP_ROW_LIMIT) {
    return NextResponse.json(
      {
        error: `Son ${rows} filas, demasiadas para servir de una. Usá el CLI: node --env-file=.env scripts/panel-export.ts`,
      },
      { status: 409 },
    );
  }

  const data = await buildExport(db);
  const stamp = data.meta.exportedAt.slice(0, 10);

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="panel-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
