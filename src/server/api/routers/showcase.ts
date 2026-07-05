import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

const sectionInput = z.object({
  projectSlug: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(100),
  labelEn: z.string().trim().max(100).optional(),
  // Acepta URL absoluta (Supabase Storage, etc.) o ruta relativa (/screenshots/…)
  imageUrl: z.string().trim().min(1).max(2000),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const showcaseRouter = createTRPCRouter({
  /** Secciones (capturas) de un proyecto, para el modal de preview. */
  byProject: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(100) }))
    .query(({ ctx, input }) => {
      return ctx.db.projectSection.findMany({
        where: { projectSlug: input.slug },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      });
    }),

  create: adminProcedure.input(sectionInput).mutation(({ ctx, input }) => {
    return ctx.db.projectSection.create({
      data: {
        projectSlug: input.projectSlug,
        label: input.label,
        labelEn: input.labelEn?.length ? input.labelEn : null,
        imageUrl: input.imageUrl,
        sortOrder: input.sortOrder,
      },
    });
  }),

  update: adminProcedure
    .input(sectionInput.omit({ projectSlug: true }).extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.projectSection.update({
        where: { id: input.id },
        data: {
          label: input.label,
          labelEn: input.labelEn?.length ? input.labelEn : null,
          imageUrl: input.imageUrl,
          sortOrder: input.sortOrder,
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.projectSection.delete({ where: { id: input.id } });
    }),
});
