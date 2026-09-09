import { after } from "next/server";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "~/env";
import { db } from "~/server/db";
import { panelEnabled } from "~/server/panel/config";
import { verifyGithubSignature } from "~/server/panel/github-signature";
import { processInboxEntry } from "~/server/panel/github-push";

/**
 * Webhook de push de GitHub.
 *
 * El orden de los pasos NO es arbitrario:
 *
 *   1. leer el cuerpo CRUDO (nunca req.json() antes: GitHub firma los bytes
 *      exactos y reserializar rompe la firma)
 *   2. verificar la firma
 *   3. responder 200 al ping sin escribir nada
 *   4. parsear
 *   5. GUARDAR EL PAYLOAD CRUDO, sincrónicamente
 *   6. recién ahí responder 202
 *   7. procesar en background con after()
 *
 * El paso 5 antes del 6 es la decisión importante. En un proceso persistente
 * como éste (pm2, no serverless) el trabajo de `after()` sí se ejecuta, y Next
 * captura sus errores. El problema es el opuesto al de serverless: como el
 * error se traga y ya respondiste 202, el fallo es SILENCIOSO. Y GitHub no
 * reintenta las entregas fallidas de un webhook de repositorio. Sin la fila
 * cruda, un bug de parseo hace desaparecer commits y el único rastro queda en
 * una UI de GitHub que nadie mira. Con la fila, el cron puede reprocesar.
 */
export const dynamic = "force-dynamic";

/** El array `commits` de un push puede traer hasta 2048 entradas. */
const MAX_BODY_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!panelEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return new NextResponse("Webhook no configurado", { status: 503 });
  }

  const raw = Buffer.from(await req.arrayBuffer());

  if (!verifyGithubSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    // Firma inválida: no se guarda NADA. Si no, el endpoint es un buzón
    // abierto para que cualquiera llene la tabla.
    return new NextResponse("Firma inválida", { status: 401 });
  }

  const event = req.headers.get("x-github-event") ?? "unknown";
  const deliveryId = req.headers.get("x-github-delivery");
  if (!deliveryId) {
    return new NextResponse("Falta X-GitHub-Delivery", { status: 400 });
  }

  // El ping de configuración no es un dato: se contesta y se olvida.
  if (event === "ping") {
    return NextResponse.json({ ok: true, pong: true });
  }

  const oversize = raw.byteLength > MAX_BODY_BYTES;

  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }

  try {
    await db.panelInbox.create({
      data: {
        id: deliveryId, // idempotente ante el botón Redeliver de GitHub
        source: "github",
        event,
        payload: oversize ? { truncated: true } : (payload as object),
        error: oversize ? "oversize" : null,
      },
    });
  } catch {
    // Ya existía esta entrega: es un reenvío, no hay nada nuevo que guardar.
    return NextResponse.json({ ok: true, duplicate: true }, { status: 202 });
  }

  // Un webhook rechazado por tamaño tiene que ser VISIBLE en el sistema, no
  // desaparecer con un 413 que solo queda en la UI de GitHub.
  if (!oversize) {
    after(async () => {
      await processInboxEntry(deliveryId);
    });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
