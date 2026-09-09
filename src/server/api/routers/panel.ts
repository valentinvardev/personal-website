import { z } from "zod";

import { todayLogical, type LogicalDate } from "~/lib/panel/logical-date";
import { createTRPCRouter, panelProcedure } from "~/server/api/trpc";
import { checkinInput, saveCheckin } from "~/server/panel/checkin";

export const panelRouter = createTRPCRouter({
  /** Definiciones activas, ordenadas para el formulario. */
  metrics: panelProcedure.query(({ ctx }) => {
    return ctx.db.panelMetric.findMany({
      where: { archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    });
  }),

  /**
   * Si ya hay check-in de un día, y CUÁNTO se contestó. Nunca devuelve los
   * valores.
   *
   * La spec §5.2 pide no mostrar la respuesta anterior porque el anclaje es
   * real: ver "ayer dormiste 7 h" empuja la respuesta de hoy hacia ahí y
   * comprime justo la variabilidad que se quiere medir. Que el dato no viaje
   * al cliente hace que la regla no dependa de que ningún componente se
   * acuerde de no mostrarlo.
   */
  checkinStatus: panelProcedure
    .input(z.object({ logicalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).optional())
    .query(async ({ ctx, input }) => {
      const ld = (input?.logicalDate ?? todayLogical()) as LogicalDate;
      const header = await ctx.db.panelEvent.findUnique({
        where: {
          sourceKey_externalId: { sourceKey: "manual", externalId: `checkin:${ld}` },
        },
        select: { recordedAt: true, meta: true },
      });
      if (!header) return { logicalDate: ld, done: false as const };
      const meta = (header.meta ?? {}) as Record<string, unknown>;
      return {
        logicalDate: ld,
        done: true as const,
        recordedAt: header.recordedAt,
        sleepAnswered: meta.sleepAnswered === true,
        energyAnswered: meta.energyAnswered === true,
        moodAnswered: meta.moodAnswered === true,
        habitsMarked: typeof meta.habitsMarked === "number" ? meta.habitsMarked : 0,
      };
    }),

  submitCheckin: panelProcedure.input(checkinInput).mutation(async ({ input }) => {
    return saveCheckin(input);
  }),
});
