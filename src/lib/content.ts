import type { IconName } from "~/components/geist/icons-data";

/* =====================================================================
   Contenido del sitio (ES / EN) — textos de UI. Los proyectos, nichos y
   tarjetas de material viven en la base y se editan desde /admin.
   ===================================================================== */

export type Lang = "es" | "en";

export interface SocialLink {
  k: string;
  icon: IconName;
  label: string;
  handle: string;
  href: string;
}

export interface Content {
  nav: {
    home: string;
    projects: string;
    niches: string;
    about: string;
    contact: string;
    cta: string;
  };
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
    viewSite: string;
    openLive: string;
    code: string;
    filterAll: string;
    empty: string;
  };
  niches: {
    eyebrow: string;
    title: string;
    pageLead: string;
    homeSub: string;
    all: string;
    view: string;
    one: string;
    many: string;
    projectsTitle: string;
    materialTitle: string;
    materialEmpty: string;
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
}

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

const es: Content = {
  nav: {
    home: "Inicio",
    projects: "Proyectos",
    niches: "Nichos",
    about: "Sobre mí",
    contact: "Contacto",
    cta: "Trabajemos juntos",
  },
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
    viewSite: "Ver sitio",
    openLive: "Abrir en vivo",
    code: "Código",
    filterAll: "Todos",
    empty: "Todavía no hay proyectos para mostrar.",
  },
  niches: {
    eyebrow: "Dónde trabajo",
    title: "Nichos",
    pageLead: "Cada nicho reúne los proyectos, aprendizajes y material de un mismo terreno.",
    homeSub: "Los mundos donde ya construí y sigo construyendo.",
    all: "Ver todos",
    view: "Ver nicho",
    one: "proyecto",
    many: "proyectos",
    projectsTitle: "Proyectos",
    materialTitle: "Material",
    materialEmpty: "Todavía no hay material en este nicho.",
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
};

const en: Content = {
  ...es,
  nav: {
    home: "Home",
    projects: "Projects",
    niches: "Niches",
    about: "About",
    contact: "Contact",
    cta: "Let's work together",
  },
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
    viewSite: "View site",
    openLive: "Open live",
    code: "Code",
    filterAll: "All",
    empty: "No projects to show yet.",
  },
  niches: {
    eyebrow: "Where I work",
    title: "Niches",
    pageLead: "Each niche gathers the projects, learnings and material from the same terrain.",
    homeSub: "The worlds where I've already built — and keep building.",
    all: "View all",
    view: "View niche",
    one: "project",
    many: "projects",
    projectsTitle: "Projects",
    materialTitle: "Material",
    materialEmpty: "No material in this niche yet.",
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
};

export const CONTENT: Record<Lang, Content> = { es, en };
