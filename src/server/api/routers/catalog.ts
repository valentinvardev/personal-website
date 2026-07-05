import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

const accent = z.enum([
  "gray",
  "blue",
  "green",
  "amber",
  "red",
  "purple",
  "pink",
  "teal",
]);

const slugField = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido: minúsculas, números y guiones");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v?.length ? v : null));

const nicheInput = z.object({
  slug: slugField,
  name: z.string().trim().min(1).max(120),
  nameEn: optionalText(120),
  tagline: optionalText(300),
  taglineEn: optionalText(300),
  icon: z.string().trim().min(1).max(50),
  color: accent,
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const projectInput = z.object({
  slug: slugField,
  name: z.string().trim().min(1).max(120),
  icon: z.string().trim().min(1).max(50),
  color: accent,
  role: optionalText(160),
  roleEn: optionalText(160),
  statusColor: accent,
  statusLabel: z.string().trim().min(1).max(60),
  statusLabelEn: optionalText(60),
  short: z.string().trim().min(1).max(300),
  shortEn: optionalText(300),
  long: optionalText(2000),
  longEn: optionalText(2000),
  stack: z.array(z.string().trim().min(1).max(60)).max(20),
  features: z.array(z.string().trim().min(1).max(200)).max(20),
  featuresEn: z.array(z.string().trim().min(1).max(200)).max(20),
  liveUrl: optionalText(500),
  repoUrl: optionalText(500),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  nicheId: z.number().int().nullable(),
});

const blockInput = z.object({
  kind: z.enum(["text", "image"]),
  title: optionalText(160),
  titleEn: optionalText(160),
  body: optionalText(4000),
  bodyEn: optionalText(4000),
  imageUrl: optionalText(2000),
  span: z.enum(["sm", "md", "lg"]).default("md"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  nicheId: z.number().int().nullable().default(null),
  projectId: z.number().int().nullable().default(null),
});

const projectPreview = {
  select: { slug: true, name: true, icon: true, color: true },
  orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
};

export const catalogRouter = createTRPCRouter({
  /* ===================== Nichos ===================== */

  niches: publicProcedure.query(({ ctx }) => {
    return ctx.db.niche.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        _count: { select: { projects: true } },
        projects: projectPreview,
      },
    });
  }),

  nicheBySlug: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const niche = await ctx.db.niche.findUnique({
        where: { slug: input.slug },
        include: {
          projects: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            include: { niche: { select: { slug: true, name: true, nameEn: true } } },
          },
          blocks: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        },
      });
      if (!niche) throw new TRPCError({ code: "NOT_FOUND" });
      return niche;
    }),

  createNiche: adminProcedure.input(nicheInput).mutation(({ ctx, input }) => {
    return ctx.db.niche.create({ data: input });
  }),

  updateNiche: adminProcedure
    .input(nicheInput.extend({ id: z.number().int() }))
    .mutation(({ ctx, input: { id, ...data } }) => {
      return ctx.db.niche.update({ where: { id }, data });
    }),

  deleteNiche: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      // Los proyectos del nicho quedan sin nicho (SetNull); las tarjetas se borran (Cascade).
      return ctx.db.niche.delete({ where: { id: input.id } });
    }),

  /* ===================== Proyectos ===================== */

  projects: publicProcedure.query(({ ctx }) => {
    return ctx.db.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { niche: { select: { slug: true, name: true, nameEn: true } } },
    });
  }),

  featuredProjects: publicProcedure.query(({ ctx }) => {
    return ctx.db.project.findMany({
      where: { featured: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: 4,
      include: { niche: { select: { slug: true, name: true, nameEn: true } } },
    });
  }),

  createProject: adminProcedure.input(projectInput).mutation(({ ctx, input }) => {
    return ctx.db.project.create({ data: input });
  }),

  updateProject: adminProcedure
    .input(projectInput.extend({ id: z.number().int() }))
    .mutation(({ ctx, input: { id, ...data } }) => {
      return ctx.db.project.update({ where: { id }, data });
    }),

  deleteProject: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.delete({ where: { id: input.id } });
      // Las capturas del modal se referencian por slug: limpiarlas también.
      await ctx.db.projectSection.deleteMany({ where: { projectSlug: project.slug } });
      return project;
    }),

  /* ===================== Tarjetas de material ===================== */

  createBlock: adminProcedure.input(blockInput).mutation(({ ctx, input }) => {
    if (input.nicheId == null && input.projectId == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "La tarjeta debe pertenecer a un nicho o a un proyecto",
      });
    }
    return ctx.db.contentBlock.create({ data: input });
  }),

  updateBlock: adminProcedure
    .input(blockInput.omit({ nicheId: true, projectId: true }).extend({ id: z.number().int() }))
    .mutation(({ ctx, input: { id, ...data } }) => {
      return ctx.db.contentBlock.update({ where: { id }, data });
    }),

  deleteBlock: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.contentBlock.delete({ where: { id: input.id } });
    }),
});
