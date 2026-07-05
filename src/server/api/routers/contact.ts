import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const contactRouter = createTRPCRouter({
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
});
