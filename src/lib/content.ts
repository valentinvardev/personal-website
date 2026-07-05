import type { BadgeColor } from "~/components/geist/badge";
import type { IconName } from "~/components/geist/icons-data";

/* =====================================================================
   Contenido del sitio (ES / EN) — portado de _geist-design/personal-site.
   ===================================================================== */

export type Lang = "es" | "en";

export interface ProjectLink {
  label: string;
  icon: IconName;
  href?: string;
  primary?: boolean;
}

export interface Project {
  slug: string;
  name: string;
  role: string;
  status: { color: BadgeColor; label: string };
  stack: string[];
  short: string;
  long: string;
  features: string[];
  links: ProjectLink[];
}

export interface SocialLink {
  k: string;
  icon: IconName;
  label: string;
  handle: string;
  href: string;
}

export interface Content {
  nav: { home: string; projects: string; about: string; contact: string; cta: string };
  hero: {
    badge: string;
    title: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stats: { v: string; k: string }[];
  };
  services: {
    eyebrow: string;
    title: string;
    sub: string;
    items: { icon: IconName; title: string; desc: string }[];
  };
  projects: {
    eyebrow: string;
    title: string;
    all: string;
    view: string;
    pageTitle: string;
    pageLead: string;
    highlights: string;
    stackLabel: string;
  };
  writing: {
    eyebrow: string;
    title: string;
    posts: { date: string; cat: string; title: string }[];
  };
  cta: { title: string; sub: string; button: string };
  about: { eyebrow: string; title: string; bio: string[] };
  exp: {
    eyebrow: string;
    title: string;
    items: { role: string; when: string; org: string; desc: string }[];
  };
  stack: {
    eyebrow: string;
    title: string;
    sub: string;
    groups: { label: string; items: string[] }[];
  };
  testi: {
    eyebrow: string;
    title: string;
    items: { quote: string; name: string; role: string }[];
    note: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    lead: string;
    available: string;
    sentLabel: string;
    sentBody: string;
    errorLabel: string;
    errorBody: string;
    f: {
      name: string;
      namePh: string;
      email: string;
      emailPh: string;
      subject: string;
      subjectPh: string;
      msg: string;
      msgPh: string;
      send: string;
    };
  };
  footer: { tag: string; site: string; contact: string; built: string };
  preview: { empty: string; error: string };
  projectData: Project[];
}

const STACK = {
  msp: ["Next.js 15", "tRPC", "Prisma", "Supabase", "MercadoPago", "TypeScript"],
  store: ["Next.js", "T3 Stack", "tRPC", "Prisma", "PostgreSQL", "Tailwind"],
  sinchi: ["Next.js", "Python", "Face Recognition", "AWS", "Supabase"],
  lpg: ["Next.js", "Anthropic API", "tRPC", "Prisma", "Tailwind"],
};

export const LINKS: SocialLink[] = [
  { k: "whatsapp", icon: "whatsapp", label: "WhatsApp", handle: "+54 9 …", href: "https://wa.me/" },
  {
    k: "linkedin",
    icon: "linkedin",
    label: "LinkedIn",
    handle: "/in/valentinvarela",
    href: "https://linkedin.com/in/valentinvarela",
  },
  {
    k: "github",
    icon: "github",
    label: "GitHub",
    handle: "@valentinvardev",
    href: "https://github.com/valentinvardev",
  },
  {
    k: "email",
    icon: "mail",
    label: "Email",
    handle: "hola@valentinvarela.cloud",
    href: "mailto:hola@valentinvarela.cloud",
  },
];

export const PROJECT_ACCENT: Record<string, { icon: IconName; color: string }> = {
  "media-seller-platform": { icon: "camera", color: "var(--ds-blue-700)" },
  "online-store": { icon: "shopping-bag", color: "var(--ds-purple-700)" },
  sinchi: { icon: "brain", color: "var(--ds-teal-700)" },
  "landing-page-generator": { icon: "layers", color: "var(--ds-amber-600)" },
};

const es: Content = {
  nav: { home: "Inicio", projects: "Proyectos", about: "Sobre mí", contact: "Contacto", cta: "Trabajemos juntos" },
  hero: {
    badge: "Disponible para proyectos freelance",
    title: "Desarrollador de sistemas y diseñador visual.",
    sub: "Diseño y construyo plataformas web completas —de la base de datos al último pixel— para negocios que quieren lanzar rápido y crecer.",
    ctaPrimary: "Ver proyectos",
    ctaSecondary: "Hablemos",
    stats: [
      { v: "4", k: "Plataformas en producción" },
      { v: "5+", k: "Años construyendo" },
      { v: "24h", k: "Tiempo de respuesta" },
    ],
  },
  services: {
    eyebrow: "Qué hago",
    title: "Servicios",
    sub: "Del concepto al deploy, me encargo de todo el ciclo del producto.",
    items: [
      { icon: "code", title: "Plataformas a medida", desc: "SaaS y aplicaciones web completas, del modelo de datos al deploy." },
      { icon: "shopping-bag", title: "Tiendas online", desc: "E-commerce que carga rápido, convierte y es fácil de administrar." },
      { icon: "brain", title: "Visión y reconocimiento", desc: "Reconocimiento facial e ingesta de imágenes a escala." },
      { icon: "sparkles", title: "Diseño de producto", desc: "Interfaces limpias y coherentes, con foco en la experiencia." },
    ],
  },
  projects: {
    eyebrow: "Trabajo seleccionado",
    title: "Proyectos destacados",
    all: "Ver todos",
    view: "Ver caso",
    pageTitle: "Proyectos",
    pageLead: "Una selección de plataformas que diseñé y construí de punta a punta.",
    highlights: "Lo destacado",
    stackLabel: "Stack",
  },
  writing: {
    eyebrow: "Escritos",
    title: "Notas y aprendizajes",
    posts: [
      { date: "Jun 2026", cat: "Ingeniería", title: "Cómo indexé miles de fotos para búsqueda facial en tiempo real" },
      { date: "May 2026", cat: "Producto", title: "Pagos con MercadoPago: lo que aprendí construyendo checkouts" },
      { date: "Abr 2026", cat: "Diseño", title: "Por qué elijo sistemas de diseño minimalistas" },
    ],
  },
  cta: {
    title: "¿Tenés una idea en mente?",
    sub: "Contame qué querés construir y te respondo en el día.",
    button: "Empecemos un proyecto",
  },
  about: {
    eyebrow: "Sobre mí",
    title: "Valentín Varela",
    bio: [
      "Soy desarrollador full-stack y diseñador. Combino ingeniería y diseño para llevar productos de una idea a producción, sin perder ni la solidez técnica ni el detalle visual.",
      "Trabajé sobre todo con plataformas de fotografía, e-commerce y sistemas de reconocimiento facial. Me obsesiona que las cosas carguen rápido, se sientan claras y sean fáciles de mantener.",
      "Trabajo de forma remota con clientes de toda Latinoamérica, y me gusta involucrarme desde la estrategia de producto hasta el deploy final.",
    ],
  },
  exp: {
    eyebrow: "Trayectoria",
    title: "Experiencia",
    items: [
      { role: "Desarrollador freelance", when: "2023 — hoy", org: "Independiente", desc: "Diseño y construyo plataformas para clientes: e-commerce, SaaS y sistemas de reconocimiento facial." },
      { role: "Full-stack developer", when: "2021 — 2023", org: "Proyectos propios", desc: "Lancé varias plataformas de fotografía y ventas online sobre el stack T3." },
      { role: "Primeros pasos", when: "2019 — 2021", org: "Autodidacta", desc: "Empecé combinando desarrollo web y diseño visual, mis dos obsesiones." },
    ],
  },
  stack: {
    eyebrow: "Herramientas",
    title: "Stack técnico",
    sub: "Las tecnologías con las que trabajo a diario.",
    groups: [
      { label: "Frontend", items: ["Next.js", "React", "TypeScript", "Tailwind", "Geist"] },
      { label: "Backend", items: ["tRPC", "Prisma", "Node.js", "Python"] },
      { label: "Datos e infra", items: ["PostgreSQL", "Supabase", "AWS", "Vercel"] },
      { label: "Pagos y visión", items: ["MercadoPago", "Stripe", "Face Recognition"] },
    ],
  },
  testi: {
    eyebrow: "Referencias",
    title: "Lo que dicen",
    items: [
      { quote: "Valentín entendió el producto mejor que nosotros y lo entregó antes de tiempo.", name: "Organizador de eventos", role: "Fotografía deportiva" },
      { quote: "La tienda quedó impecable y rapidísima. Muy recomendable.", name: "Dueño de tienda", role: "E-commerce" },
    ],
    note: "Testimonios de muestra — se reemplazan con reales cuando estén disponibles.",
  },
  contact: {
    eyebrow: "Contacto",
    title: "Hablemos de tu proyecto.",
    lead: "Contame qué querés construir. Respondo consultas en el día.",
    available: "Disponible para nuevos proyectos",
    sentLabel: "Mensaje enviado",
    sentBody: "Gracias por escribir. Te respondo a la brevedad.",
    errorLabel: "No se pudo enviar",
    errorBody: "Hubo un problema al enviar el mensaje. Probá de nuevo en un momento.",
    f: {
      name: "Nombre",
      namePh: "Tu nombre",
      email: "Email",
      emailPh: "tu@email.com",
      subject: "Asunto",
      subjectPh: "Sobre qué querés hablar",
      msg: "Mensaje",
      msgPh: "Contame un poco sobre tu proyecto…",
      send: "Enviar mensaje",
    },
  },
  footer: {
    tag: "Desarrollador de sistemas y diseñador visual. Construyendo la web, un deploy a la vez.",
    site: "Sitio",
    contact: "Contacto",
    built: "Construido con el sistema de diseño Geist",
  },
  preview: {
    empty: "Todavía no hay capturas de este proyecto.",
    error: "No se pudieron cargar las capturas. Probá de nuevo en un momento.",
  },
  projectData: [
    {
      slug: "media-seller-platform",
      name: "Media Seller Platform",
      role: "Diseño de producto + full-stack",
      status: { color: "green", label: "En producción" },
      stack: STACK.msp,
      short: "Los fotógrafos de eventos deportivos venden sus fotos buscadas por número de dorsal.",
      long: "Plataforma donde los fotógrafos suben las fotos de una carrera y cada corredor encuentra las suyas buscando por su número de dorsal. Previews con marca de agua, pago con MercadoPago y descarga con token temporal.",
      features: [
        "Búsqueda de fotos por número de dorsal",
        "Previews con marca de agua automática",
        "Pagos con MercadoPago",
        "Tokens de descarga de 72 horas",
        "Galería lightbox de alto rendimiento",
      ],
      links: [
        { label: "Ver sitio", icon: "globe", primary: true },
        { label: "Código", icon: "github" },
      ],
    },
    {
      slug: "online-store",
      name: "Online Store",
      role: "Full-stack",
      status: { color: "green", label: "En producción" },
      stack: STACK.store,
      short: "Tienda online moderna con catálogo, carrito, checkout y panel de administración.",
      long: "E-commerce completo sobre el stack T3: catálogo con búsqueda, carrito, checkout con pagos integrados y un panel de administración pensado para escalar sin fricción.",
      features: [
        "Catálogo con búsqueda y filtros",
        "Carrito y checkout integrados",
        "Panel de administración",
        "Pagos y gestión de pedidos",
      ],
      links: [
        { label: "Ver sitio", icon: "globe", primary: true },
        { label: "Código", icon: "github" },
      ],
    },
    {
      slug: "sinchi",
      name: "Sinchi",
      role: "Fundador · producto + ingeniería",
      status: { color: "amber", label: "En beta" },
      stack: STACK.sinchi,
      short: "SaaS de reconocimiento facial: encontrá tus fotos de un evento con una selfie.",
      long: "Producto SaaS que usa reconocimiento facial para que, en un evento con miles de fotos, cada persona encuentre las suyas con solo una selfie. Pensado para fotógrafos y organizadores que quieren vender más rápido.",
      features: [
        "Reconocimiento facial a partir de una selfie",
        "Indexado de miles de imágenes",
        "Panel para fotógrafos y organizadores",
        "Venta y descarga integradas",
      ],
      links: [{ label: "Sitio", icon: "globe", primary: true }],
    },
    {
      slug: "landing-page-generator",
      name: "Landing Page Generator",
      role: "Full-stack",
      status: { color: "blue", label: "Activo" },
      stack: STACK.lpg,
      short: "Herramienta de marketing de afiliados: describís una landing y se genera al instante.",
      long: "Generador de landing pages para campañas de afiliados: describís lo que querés y obtenés una página lista al instante, con CMS de campañas, analytics de conversión y deploy en un clic.",
      features: [
        "Generación instantánea de landings",
        "CMS para campañas de afiliados",
        "Analytics de conversión",
        "Deploy con un clic",
      ],
      links: [
        { label: "Ver herramienta", icon: "globe", primary: true },
        { label: "Código", icon: "github" },
      ],
    },
  ],
};

const en: Content = {
  ...es,
  nav: { home: "Home", projects: "Projects", about: "About", contact: "Contact", cta: "Let's work together" },
  hero: {
    badge: "Available for freelance work",
    title: "Systems developer & visual designer.",
    sub: "I design and build complete web platforms —from the database to the last pixel— for businesses that want to launch fast and grow.",
    ctaPrimary: "View projects",
    ctaSecondary: "Let's talk",
    stats: [
      { v: "4", k: "Platforms in production" },
      { v: "5+", k: "Years building" },
      { v: "24h", k: "Response time" },
    ],
  },
  services: {
    eyebrow: "What I do",
    title: "Services",
    sub: "From concept to deploy, I own the full product cycle.",
    items: [
      { icon: "code", title: "Custom platforms", desc: "Full SaaS and web apps, from data model to deploy." },
      { icon: "shopping-bag", title: "Online stores", desc: "E-commerce that loads fast, converts and is easy to run." },
      { icon: "brain", title: "Vision & recognition", desc: "Face recognition and image ingestion at scale." },
      { icon: "sparkles", title: "Product design", desc: "Clean, consistent interfaces focused on experience." },
    ],
  },
  projects: {
    eyebrow: "Selected work",
    title: "Featured projects",
    all: "View all",
    view: "View case",
    pageTitle: "Projects",
    pageLead: "A selection of platforms I designed and built end to end.",
    highlights: "Highlights",
    stackLabel: "Stack",
  },
  writing: {
    eyebrow: "Writing",
    title: "Notes & learnings",
    posts: [
      { date: "Jun 2026", cat: "Engineering", title: "How I indexed thousands of photos for real-time facial search" },
      { date: "May 2026", cat: "Product", title: "MercadoPago payments: what I learned building checkouts" },
      { date: "Apr 2026", cat: "Design", title: "Why I choose minimal design systems" },
    ],
  },
  cta: {
    title: "Got an idea in mind?",
    sub: "Tell me what you want to build and I reply the same day.",
    button: "Let's start a project",
  },
  about: {
    eyebrow: "About",
    title: "Valentín Varela",
    bio: [
      "I'm a full-stack developer and designer. I blend engineering and design to take products from idea to production without losing technical rigor or visual detail.",
      "I've worked mostly with photography platforms, e-commerce and facial recognition systems. I'm obsessed with things that load fast, feel clear and stay easy to maintain.",
      "I work remotely with clients across Latin America, and I like being involved from product strategy through the final deploy.",
    ],
  },
  exp: {
    eyebrow: "Track record",
    title: "Experience",
    items: [
      { role: "Freelance developer", when: "2023 — now", org: "Independent", desc: "I design and build platforms for clients: e-commerce, SaaS and facial recognition systems." },
      { role: "Full-stack developer", when: "2021 — 2023", org: "Own projects", desc: "Launched several photography and online-sales platforms on the T3 stack." },
      { role: "Early days", when: "2019 — 2021", org: "Self-taught", desc: "Started by combining web development and visual design, my two obsessions." },
    ],
  },
  stack: {
    eyebrow: "Tools",
    title: "Tech stack",
    sub: "The technologies I work with every day.",
    groups: es.stack.groups,
  },
  testi: {
    eyebrow: "References",
    title: "What people say",
    items: [
      { quote: "Valentín understood the product better than we did and shipped ahead of schedule.", name: "Event organizer", role: "Sports photography" },
      { quote: "The store came out flawless and blazing fast. Highly recommended.", name: "Store owner", role: "E-commerce" },
    ],
    note: "Sample testimonials — to be replaced with real ones.",
  },
  contact: {
    eyebrow: "Contact",
    title: "Let's talk about your project.",
    lead: "Tell me what you want to build. I answer inquiries the same day.",
    available: "Available for new projects",
    sentLabel: "Message sent",
    sentBody: "Thanks for reaching out. I'll get back to you shortly.",
    errorLabel: "Message not sent",
    errorBody: "Something went wrong sending your message. Try again in a moment.",
    f: {
      name: "Name",
      namePh: "Your name",
      email: "Email",
      emailPh: "you@email.com",
      subject: "Subject",
      subjectPh: "What do you want to talk about",
      msg: "Message",
      msgPh: "Tell me a bit about your project…",
      send: "Send message",
    },
  },
  footer: {
    tag: "Systems developer & visual designer. Building the web, one deploy at a time.",
    site: "Site",
    contact: "Contact",
    built: "Built with the Geist design system",
  },
  preview: {
    empty: "No screenshots for this project yet.",
    error: "Screenshots could not be loaded. Try again in a moment.",
  },
  projectData: [
    {
      ...es.projectData[0]!,
      role: "Product design + full-stack",
      status: { color: "green", label: "In production" },
      short: "Sports-event photographers sell their photos searched by bib number.",
      long: "A platform where photographers upload a race's photos and each runner finds theirs by searching their bib number. Watermarked previews, MercadoPago payments and temporary download tokens.",
      features: [
        "Photo search by bib number",
        "Automatic watermarked previews",
        "MercadoPago payments",
        "72-hour download tokens",
        "High-performance lightbox gallery",
      ],
      links: [
        { label: "View site", icon: "globe", primary: true },
        { label: "Code", icon: "github" },
      ],
    },
    {
      ...es.projectData[1]!,
      role: "Full-stack",
      status: { color: "green", label: "In production" },
      short: "Modern online store with catalog, cart, checkout and admin panel.",
      long: "A full e-commerce on the T3 stack: searchable catalog, cart, checkout with integrated payments and an admin panel built to scale without friction.",
      features: [
        "Catalog with search and filters",
        "Integrated cart and checkout",
        "Admin panel",
        "Payments and order management",
      ],
      links: [
        { label: "View site", icon: "globe", primary: true },
        { label: "Code", icon: "github" },
      ],
    },
    {
      ...es.projectData[2]!,
      role: "Founder · product + engineering",
      status: { color: "amber", label: "In beta" },
      short: "Facial-recognition SaaS: find your event photos with a selfie.",
      long: "A SaaS product that uses facial recognition so that, at an event with thousands of photos, each person finds theirs with just a selfie. Built for photographers and organizers who want to sell faster.",
      features: [
        "Facial recognition from a selfie",
        "Indexing of thousands of images",
        "Dashboard for photographers and organizers",
        "Integrated sales and downloads",
      ],
      links: [{ label: "Site", icon: "globe", primary: true }],
    },
    {
      ...es.projectData[3]!,
      role: "Full-stack",
      status: { color: "blue", label: "Active" },
      short: "Affiliate marketing tool: describe a landing page and generate it instantly.",
      long: "A landing-page generator for affiliate campaigns: describe what you want and get a ready page instantly, with a campaign CMS, conversion analytics and one-click deploy.",
      features: [
        "Instant landing-page generation",
        "CMS for affiliate campaigns",
        "Conversion analytics",
        "One-click deploy",
      ],
      links: [
        { label: "View tool", icon: "globe", primary: true },
        { label: "Code", icon: "github" },
      ],
    },
  ],
};

export const CONTENT: Record<Lang, Content> = { es, en };
