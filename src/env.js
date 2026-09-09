import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    ADMIN_PASSWORD: z.string().min(8),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    SUPABASE_SECRET_KEY: z.string().optional(),
    /**
     * Panel de medición (/panel). Vale "true" para encenderlo; con cualquier
     * otro valor, o ausente, la ruta devuelve 404 y no existe.
     *
     * ⚠️ Las variables del panel van SIEMPRE como `z.string().optional()`,
     * sin `.min()` ni `z.enum()`. Este archivo se importa desde
     * next.config.js, así que una variable MALFORMADA (no ausente: mal
     * escrita, tipo PANEL_ENABLED=TRUE contra un enum en minúscula) hace
     * fallar createEnv y el proceso Node no arranca. Ese proceso es el que
     * sirve el sitio público: un typo en el .env del VPS tiraría
     * valentinvarela.cloud, no el panel. La validación real vive en runtime,
     * en src/server/panel/config.ts.
     */
    PANEL_ENABLED: z.string().optional(),
    /** Secreto del webhook de GitHub. Mismo criterio: string opcional. */
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    PANEL_ENABLED: process.env.PANEL_ENABLED,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
