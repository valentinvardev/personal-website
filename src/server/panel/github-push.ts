import "server-only";

import { db } from "~/server/db";
import { repoSubject } from "./subject";

/**
 * Convierte un evento `push` de GitHub en filas de `Event`.
 *
 * Semántica de la fuente (spec §3.2): un commit es un hecho INMUTABLE y su
 * identidad es el `sha`, así que la operación es crear y la idempotencia sale
 * del unique `(sourceKey, externalId)`.
 *
 * Pero `create` a secas está mal: si GitHub reenvía una entrega cuyos primeros
 * commits ya se insertaron, el primero choca contra el unique, tira P2002 y se
 * pierden los que faltaban. Por eso `createMany({ skipDuplicates: true })`,
 * que traduce a `ON CONFLICT DO NOTHING`: los que ya están se saltean y los
 * nuevos entran.
 */

interface PushPayload {
  repository?: { full_name?: string };
  commits?: { id?: string; timestamp?: string; message?: string; distinct?: boolean }[];
  ref?: string;
}

export async function processPush(payload: unknown): Promise<{ inserted: number }> {
  const push = payload as PushPayload;
  const repo = push.repository?.full_name;
  if (!repo) return { inserted: 0 };

  const subjectId = repoSubject(repo);
  const now = Date.now();

  const rows = (push.commits ?? [])
    .filter((c) => typeof c.id === "string" && c.id.length > 0)
    .map((c) => {
      // El timestamp del commit lo controla quien commitea (se puede falsear
      // con --date), así que se acota: un reloj mal configurado escribiría un
      // rollup en 2050 que ninguna ventana de recálculo vuelve a tocar.
      const raw = c.timestamp ? new Date(c.timestamp) : new Date();
      const ts = Number.isNaN(raw.getTime()) ? new Date() : raw;
      const clamped =
        ts.getTime() > now + 3_600_000 || ts.getTime() < now - 365 * 86_400_000 ? new Date() : ts;
      return {
        sourceKey: "github",
        externalId: c.id!,
        type: "code.commit",
        subjectId,
        occurredAt: clamped,
        value: 1,
        meta: {
          ref: push.ref ?? null,
          message: (c.message ?? "").slice(0, 200),
          distinct: c.distinct ?? null,
        },
      };
    });

  if (rows.length === 0) return { inserted: 0 };

  const result = await db.panelEvent.createMany({ data: rows, skipDuplicates: true });
  return { inserted: result.count };
}

/**
 * Procesa una entrega guardada en `Inbox` y la marca como hecha.
 *
 * Los errores se guardan en la fila en vez de perderse: GitHub NO reintenta
 * las entregas fallidas de un webhook de repositorio, así que si el parseo
 * falla y no queda rastro, el commit desaparece y lo único que lo registra es
 * una UI de GitHub que nadie mira.
 */
export async function processInboxEntry(deliveryId: string): Promise<void> {
  const entry = await db.panelInbox.findUnique({ where: { id: deliveryId } });
  if (!entry || entry.processedAt) return;

  try {
    if (entry.event === "push") await processPush(entry.payload);
    await db.panelInbox.update({
      where: { id: deliveryId },
      data: { processedAt: new Date(), error: null },
    });
  } catch (err) {
    await db.panelInbox.update({
      where: { id: deliveryId },
      data: { error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500) },
    });
  }
}
