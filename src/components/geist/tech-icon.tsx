import { TECH_ICONS, type TechIconSlug } from "./tech-icons-data";

export type { TechIconSlug };

/* Marcas casi negras: en dark mode pasan a tinta clara del tema. */
const ADAPTIVE = new Set<TechIconSlug>([
  "nextdotjs",
  "vercel",
  "github",
  "anthropic",
  "prisma",
]);

/* Etiqueta de stack (texto libre) → slug del icono. Se ignoran versiones
   al final ("Next.js 15" → next.js). Sin match → chip solo texto. */
const ALIASES: Record<string, TechIconSlug> = {
  "next.js": "nextdotjs",
  nextjs: "nextdotjs",
  react: "react",
  typescript: "typescript",
  javascript: "javascript",
  tailwind: "tailwindcss",
  tailwindcss: "tailwindcss",
  "tailwind css": "tailwindcss",
  prisma: "prisma",
  supabase: "supabase",
  postgresql: "postgresql",
  postgres: "postgresql",
  mysql: "mysql",
  python: "python",
  "node.js": "nodedotjs",
  nodejs: "nodedotjs",
  node: "nodedotjs",
  vercel: "vercel",
  geist: "vercel",
  trpc: "trpc",
  stripe: "stripe",
  mercadopago: "mercadopago",
  "mercado pago": "mercadopago",
  docker: "docker",
  github: "github",
  git: "git",
  figma: "figma",
  anthropic: "anthropic",
  "anthropic api": "anthropic",
  claude: "anthropic",
};

export function techSlugFor(label: string): TechIconSlug | undefined {
  const base = label
    .toLowerCase()
    .replace(/\s+\d+(\.\d+)*$/, "")
    .trim();
  return ALIASES[base];
}

export function TechIcon({ slug, size = 12 }: { slug: TechIconSlug; size?: number }) {
  const icon = TECH_ICONS[slug];
  const color = ADAPTIVE.has(slug) ? "var(--ds-gray-1000)" : icon.hex;
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", width: size, height: size, flex: "none", color }}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
}

/** Chip de tecnología con el logo colorizado de la marca (si existe). */
export function StackChip({ label, large = false }: { label: string; large?: boolean }) {
  const slug = techSlugFor(label);
  return (
    <span className={"chip" + (large ? " chip--lg" : "")}>
      {slug && <TechIcon slug={slug} size={large ? 14 : 12} />}
      {label}
    </span>
  );
}
