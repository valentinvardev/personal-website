// Seed idempotente: nichos, proyectos (los 4 originales de content.ts) y
// tarjetas de material de ejemplo. Ejecutar con `npm run db:seed`.
import { PrismaClient } from "../generated/prisma/index.js";

const db = new PrismaClient();

const NICHES = [
  {
    slug: "fotografia-eventos",
    name: "Fotografía y eventos",
    nameEn: "Photography & events",
    tagline:
      "Plataformas para que fotógrafos vendan más rápido: búsqueda por dorsal, reconocimiento facial y galerías veloces.",
    taglineEn:
      "Platforms that help photographers sell faster: bib-number search, facial recognition and fast galleries.",
    icon: "camera",
    color: "blue",
    sortOrder: 0,
  },
  {
    slug: "e-commerce",
    name: "E-commerce",
    nameEn: "E-commerce",
    tagline: "Tiendas que cargan rápido, convierten y son fáciles de administrar.",
    taglineEn: "Stores that load fast, convert and are easy to run.",
    icon: "shopping-bag",
    color: "purple",
    sortOrder: 1,
  },
  {
    slug: "ia-herramientas",
    name: "IA y herramientas",
    nameEn: "AI & tools",
    tagline:
      "Productos que usan IA para automatizar trabajo real: generación de contenido y visión por computadora.",
    taglineEn:
      "Products that use AI to automate real work: content generation and computer vision.",
    icon: "sparkles",
    color: "teal",
    sortOrder: 2,
  },
];

const PROJECTS = [
  {
    slug: "media-seller-platform",
    name: "Media Seller Platform",
    icon: "camera",
    color: "blue",
    role: "Diseño de producto + full-stack",
    roleEn: "Product design + full-stack",
    statusColor: "green",
    statusLabel: "En producción",
    statusLabelEn: "In production",
    short: "Los fotógrafos de eventos deportivos venden sus fotos buscadas por número de dorsal.",
    shortEn: "Sports-event photographers sell their photos searched by bib number.",
    long: "Plataforma donde los fotógrafos suben las fotos de una carrera y cada corredor encuentra las suyas buscando por su número de dorsal. Previews con marca de agua, pago con MercadoPago y descarga con token temporal.",
    longEn:
      "A platform where photographers upload a race's photos and each runner finds theirs by searching their bib number. Watermarked previews, MercadoPago payments and temporary download tokens.",
    stack: ["Next.js 15", "tRPC", "Prisma", "Supabase", "MercadoPago", "TypeScript"],
    features: [
      "Búsqueda de fotos por número de dorsal",
      "Previews con marca de agua automática",
      "Pagos con MercadoPago",
      "Tokens de descarga de 72 horas",
      "Galería lightbox de alto rendimiento",
    ],
    featuresEn: [
      "Photo search by bib number",
      "Automatic watermarked previews",
      "MercadoPago payments",
      "72-hour download tokens",
      "High-performance lightbox gallery",
    ],
    featured: true,
    sortOrder: 0,
    nicheSlug: "fotografia-eventos",
  },
  {
    slug: "online-store",
    name: "Online Store",
    icon: "shopping-bag",
    color: "purple",
    role: "Full-stack",
    roleEn: "Full-stack",
    statusColor: "green",
    statusLabel: "En producción",
    statusLabelEn: "In production",
    short: "Tienda online moderna con catálogo, carrito, checkout y panel de administración.",
    shortEn: "Modern online store with catalog, cart, checkout and admin panel.",
    long: "E-commerce completo sobre el stack T3: catálogo con búsqueda, carrito, checkout con pagos integrados y un panel de administración pensado para escalar sin fricción.",
    longEn:
      "A full e-commerce on the T3 stack: searchable catalog, cart, checkout with integrated payments and an admin panel built to scale without friction.",
    stack: ["Next.js", "T3 Stack", "tRPC", "Prisma", "PostgreSQL", "Tailwind"],
    features: [
      "Catálogo con búsqueda y filtros",
      "Carrito y checkout integrados",
      "Panel de administración",
      "Pagos y gestión de pedidos",
    ],
    featuresEn: [
      "Catalog with search and filters",
      "Integrated cart and checkout",
      "Admin panel",
      "Payments and order management",
    ],
    featured: true,
    sortOrder: 1,
    nicheSlug: "e-commerce",
  },
  {
    slug: "sinchi",
    name: "Sinchi",
    icon: "brain",
    color: "teal",
    role: "Fundador · producto + ingeniería",
    roleEn: "Founder · product + engineering",
    statusColor: "amber",
    statusLabel: "En beta",
    statusLabelEn: "In beta",
    short: "SaaS de reconocimiento facial: encontrá tus fotos de un evento con una selfie.",
    shortEn: "Facial-recognition SaaS: find your event photos with a selfie.",
    long: "Producto SaaS que usa reconocimiento facial para que, en un evento con miles de fotos, cada persona encuentre las suyas con solo una selfie. Pensado para fotógrafos y organizadores que quieren vender más rápido.",
    longEn:
      "A SaaS product that uses facial recognition so that, at an event with thousands of photos, each person finds theirs with just a selfie. Built for photographers and organizers who want to sell faster.",
    stack: ["Next.js", "Python", "Face Recognition", "AWS", "Supabase"],
    features: [
      "Reconocimiento facial a partir de una selfie",
      "Indexado de miles de imágenes",
      "Panel para fotógrafos y organizadores",
      "Venta y descarga integradas",
    ],
    featuresEn: [
      "Facial recognition from a selfie",
      "Indexing of thousands of images",
      "Dashboard for photographers and organizers",
      "Integrated sales and downloads",
    ],
    featured: true,
    sortOrder: 2,
    nicheSlug: "fotografia-eventos",
  },
  {
    slug: "landing-page-generator",
    name: "Landing Page Generator",
    icon: "layers",
    color: "amber",
    role: "Full-stack",
    roleEn: "Full-stack",
    statusColor: "blue",
    statusLabel: "Activo",
    statusLabelEn: "Active",
    short: "Herramienta de marketing de afiliados: describís una landing y se genera al instante.",
    shortEn: "Affiliate marketing tool: describe a landing page and generate it instantly.",
    long: "Generador de landing pages para campañas de afiliados: describís lo que querés y obtenés una página lista al instante, con CMS de campañas, analytics de conversión y deploy en un clic.",
    longEn:
      "A landing-page generator for affiliate campaigns: describe what you want and get a ready page instantly, with a campaign CMS, conversion analytics and one-click deploy.",
    stack: ["Next.js", "Anthropic API", "tRPC", "Prisma", "Tailwind"],
    features: [
      "Generación instantánea de landings",
      "CMS para campañas de afiliados",
      "Analytics de conversión",
      "Deploy con un clic",
    ],
    featuresEn: [
      "Instant landing-page generation",
      "CMS for affiliate campaigns",
      "Conversion analytics",
      "One-click deploy",
    ],
    featured: false,
    sortOrder: 3,
    nicheSlug: "ia-herramientas",
  },
];

const BLOCKS = [
  {
    nicheSlug: "fotografia-eventos",
    kind: "text",
    span: "lg",
    sortOrder: 0,
    title: "Por qué este nicho",
    titleEn: "Why this niche",
    body: "Un evento deportivo produce miles de fotos y cada corredor busca solo las suyas. Construí dos plataformas que resuelven esa búsqueda —por número de dorsal y por reconocimiento facial— y el patrón se repite: ingesta masiva, indexado rápido y venta directa sin fricción.",
    bodyEn:
      "A sports event produces thousands of photos and every runner is looking for just theirs. I built two platforms that solve that search —by bib number and by facial recognition— and the pattern repeats: massive ingestion, fast indexing and frictionless direct sales.",
  },
  {
    nicheSlug: "fotografia-eventos",
    kind: "text",
    span: "md",
    sortOrder: 1,
    title: "Lo que aprendí",
    titleEn: "What I learned",
    body: "Indexar miles de imágenes exige colas y procesamiento por lotes. Y la galería tiene que sentirse instantánea aunque cada archivo pese: previews progresivos, marcas de agua generadas al vuelo y descargas con token temporal.",
    bodyEn:
      "Indexing thousands of images demands queues and batch processing. And the gallery must feel instant even when files are heavy: progressive previews, on-the-fly watermarks and token-based downloads.",
  },
  {
    nicheSlug: "e-commerce",
    kind: "text",
    span: "md",
    sortOrder: 0,
    title: "Velocidad que convierte",
    titleEn: "Speed that converts",
    body: "En una tienda, cada segundo de carga cuesta ventas. Trabajo con render en el servidor, imágenes optimizadas y checkouts de un paso para que el catálogo se sienta inmediato en cualquier conexión.",
    bodyEn:
      "In a store, every second of load time costs sales. I use server rendering, optimized images and one-step checkouts so the catalog feels instant on any connection.",
  },
  {
    nicheSlug: "ia-herramientas",
    kind: "text",
    span: "md",
    sortOrder: 0,
    title: "IA aplicada, no demos",
    titleEn: "Applied AI, not demos",
    body: "Me interesa la IA que ahorra trabajo real: generar una landing completa a partir de una descripción, o encontrar una cara entre miles de fotos. Modelos en producción, con costos y latencias medidos.",
    bodyEn:
      "I care about AI that saves real work: generating a full landing page from a description, or finding one face among thousands of photos. Models in production, with measured costs and latency.",
  },
];

async function main() {
  const nicheIds = {};
  for (const n of NICHES) {
    const row = await db.niche.upsert({
      where: { slug: n.slug },
      create: n,
      update: n,
    });
    nicheIds[n.slug] = row.id;
  }

  for (const { nicheSlug, ...p } of PROJECTS) {
    await db.project.upsert({
      where: { slug: p.slug },
      create: { ...p, nicheId: nicheIds[nicheSlug] },
      update: { ...p, nicheId: nicheIds[nicheSlug] },
    });
  }

  for (const { nicheSlug, ...b } of BLOCKS) {
    const nicheId = nicheIds[nicheSlug];
    const exists = await db.contentBlock.findFirst({
      where: { nicheId, title: b.title },
    });
    if (!exists) await db.contentBlock.create({ data: { ...b, nicheId } });
  }

  const counts = await Promise.all([db.niche.count(), db.project.count(), db.contentBlock.count()]);
  console.log(`Seed OK — nichos: ${counts[0]}, proyectos: ${counts[1]}, tarjetas: ${counts[2]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
