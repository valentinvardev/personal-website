import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const contactRouter = createTRPCRouter({
  /** Envío del formulario público de contacto. */
  send: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(200),
        email: z.string().trim().email().max(320),
        subject: z.string().trim().max(300).optional(),
        message: z.string().trim().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contactMessage.create({
        data: {
          name: input.name,
          email: input.email,
          subject: input.subject?.length ? input.subject : null,
          message: input.message,
        },
      });
      return { ok: true };
    }),

  /* ---- Bandeja de entrada del admin ---- */

  list: adminProcedure.query(({ ctx }) => {
    return ctx.db.contactMessage.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    });
  }),

  unreadCount: adminProcedure.query(({ ctx }) => {
    return ctx.db.contactMessage.count({ where: { read: false } });
  }),

  markRead: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.contactMessage.update({
        where: { id: input.id },
        data: { read: true },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.contactMessage.delete({ where: { id: input.id } });
    }),
});
