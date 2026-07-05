import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v?.length ? v : null));

const attachmentInput = z.object({
  kind: z.enum(["image", "file"]),
  url: z.string().trim().min(1).max(2000),
  name: z.string().trim().min(1).max(200),
  mime: z.string().trim().max(100).optional(),
  size: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

const postInput = z.object({
  title: optionalText(200),
  body: z.string().trim().min(1).max(10000),
  category: optionalText(60),
  pinned: z.boolean().default(false),
  published: z.boolean().default(true),
  attachments: z.array(attachmentInput).max(12).default([]),
});

const publicOrder = [
  { pinned: "desc" as const },
  { createdAt: "desc" as const },
];

const withAttachments = {
  attachments: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
};

export const postsRouter = createTRPCRouter({
  /** Feed público: solo publicados, fijados primero. */
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.post.findMany({
      where: { published: true },
      orderBy: publicOrder,
      take: 100,
      include: withAttachments,
    });
  }),

  /** Últimos posts para la sección del inicio. */
  latest: publicProcedure.query(({ ctx }) => {
    return ctx.db.post.findMany({
      where: { published: true },
      orderBy: publicOrder,
      take: 3,
      include: withAttachments,
    });
  }),

  /** Para /admin: incluye borradores. */
  adminList: adminProcedure.query(({ ctx }) => {
    return ctx.db.post.findMany({
      orderBy: publicOrder,
      take: 200,
      include: withAttachments,
    });
  }),

  create: adminProcedure.input(postInput).mutation(({ ctx, input }) => {
    const { attachments, ...data } = input;
    return ctx.db.post.create({
      data: { ...data, attachments: { create: attachments } },
      include: withAttachments,
    });
  }),

  update: adminProcedure
    .input(postInput.extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const { id, attachments, ...data } = input;
      // Los adjuntos se reemplazan completos: es la lista final del editor.
      return ctx.db.post.update({
        where: { id },
        data: { ...data, attachments: { deleteMany: {}, create: attachments } },
        include: withAttachments,
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.post.delete({ where: { id: input.id } });
    }),
});
