import { catalogRouter } from "~/server/api/routers/catalog";
import { contactRouter } from "~/server/api/routers/contact";
import { showcaseRouter } from "~/server/api/routers/showcase";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  catalog: catalogRouter,
  contact: contactRouter,
  showcase: showcaseRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.contact.send({ ... });
 */
export const createCaller = createCallerFactory(appRouter);
