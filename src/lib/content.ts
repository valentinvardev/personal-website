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
    writing: string;
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
    captures: string;
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
    pageLead: string;
    empty: string;
    readMore: string;
    readLess: string;
    pinned: string;
    filesLabel: string;
    all: string;
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
    sendAnother: string;
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
  {
    k: "whatsapp",
    icon: "whatsapp",
    label: "WhatsApp",
    handle: "+54 9 3541 57-8953",
    href: "https://wa.me/5493541578953",
  },
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
    writing: "Escritos",
    about: "Sobre mí",
    contact: "Contacto",
    cta: "Trabajemos juntos",
  },
  hero: {
    badge: "Disponible para un diagnóstico",
    title: "Forward Deployed Engineer.",
    sub: "Entro a tu empresa, miro cómo opera de verdad, encuentro dónde se pierde tiempo, plata o clientes, y construyo la solución. Automatizaciones, sistemas a medida e integraciones.",
    ctaPrimary: "Ver proyectos",
    ctaSecondary: "Pedir un diagnóstico",
    stats: [
      { v: "3", k: "Mejoras en cada diagnóstico" },
      { v: "5+", k: "Años construyendo sistemas" },
      { v: "24h", k: "Tiempo de respuesta" },
    ],
  },
  services: {
    eyebrow: "Cómo trabajo",
    title: "Lo que hago adentro de una empresa",
    sub: "No vendo páginas web ni me presento como agencia. Vendo operaciones que funcionan mejor.",
    items: [
      { icon: "search", title: "Diagnóstico", desc: "Miro cómo opera tu empresa de verdad y te dejo tres mejoras concretas con su impacto estimado. Es la puerta de entrada." },
      { icon: "zap", title: "Automatizaciones", desc: "Lo que alguien hace a mano todos los días y no debería: cobros, avisos, carga de datos, seguimiento." },
      { icon: "layers", title: "Sistemas a medida", desc: "Cuando la planilla ya no alcanza y ningún producto de estante encaja con cómo trabajás de verdad." },
      { icon: "git-branch", title: "Integraciones", desc: "Que tus herramientas se hablen entre ellas, en vez de que alguien copie y pegue de una a la otra." },
    ],
  },
  projects: {
    eyebrow: "Trabajo seleccionado",
    title: "Proyectos destacados",
    all: "Ver todos",
    view: "Ver caso",
    pageTitle: "Proyectos",
    pageLead: "Sistemas que construí adentro de operaciones reales, con el problema que cada uno resolvía.",
    highlights: "Lo destacado",
    stackLabel: "Stack",
    viewSite: "Ver sitio",
    captures: "Ver capturas",
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
    pageLead: "Apuntes en tiempo real: lo que estoy construyendo, decisiones que tomé y lo que voy aprendiendo en el camino.",
    empty: "Todavía no hay publicaciones.",
    readMore: "Leer más",
    readLess: "Mostrar menos",
    pinned: "Fijado",
    filesLabel: "Recursos",
    all: "Ver todos",
  },
  cta: {
    title: "¿Dónde se te va el tiempo?",
    sub: "Contame cómo trabaja tu empresa hoy y te vuelvo con tres mejoras concretas y el impacto que estimo para cada una.",
    button: "Pedir un diagnóstico",
  },
  about: {
    eyebrow: "Sobre mí",
    title: "Valentín Varela",
    bio: [
      "Soy Forward Deployed Engineer. Trabajo adentro de la operación: miro cómo funciona una empresa de verdad, no cómo está escrito que funciona, y construyo lo que le falta para que deje de perder tiempo, plata o clientes.",
      "Lo hago bajo SurCodia para empresas que ya facturan y no tienen equipo técnico propio, y como Forward Deployed Product Engineer en Stealth Seller, del lado de los usuarios de la plataforma.",
      "La puerta de entrada es siempre la misma: un diagnóstico corto, tres mejoras concretas y el impacto que estimo para cada una. Si después construimos, construimos sobre eso y no sobre una intuición.",
    ],
  },
  exp: {
    eyebrow: "Trayectoria",
    title: "Experiencia",
    items: [
      { role: "Forward Deployed Product Engineer", when: "ago 2026 - hoy", org: "Stealth Seller", desc: "Trabajo del lado de los usuarios de la plataforma: escucho el problema real, lo convierto en producto y lo llevo a producción de punta a punta." },
      { role: "Forward Deployed Engineer", when: "2023 - hoy", org: "SurCodia", desc: "Entro a empresas que ya facturan, encuentro dónde se les va el tiempo y la plata, y construyo la solución: automatizaciones, sistemas a medida e integraciones." },
      { role: "Full-stack developer", when: "2021 - 2023", org: "Proyectos propios", desc: "Lancé varias plataformas de fotografía y ventas online sobre el stack T3." },
      { role: "Primeros pasos", when: "2019 - 2021", org: "Autodidacta", desc: "Empecé combinando desarrollo web y diseño visual, mis dos obsesiones." },
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
      { label: "Cobros, correo y visión", items: ["Mercado Pago", "Talo", "Stripe", "Resend", "Face Recognition"] },
    ],
  },
  testi: {
    eyebrow: "Referencias",
    title: "Lo que dicen",
    items: [
      { quote: "Valentín entendió el producto mejor que nosotros y lo entregó antes de tiempo.", name: "Organizador de eventos", role: "Fotografía deportiva" },
      { quote: "La tienda quedó impecable y rapidísima. Muy recomendable.", name: "Dueño de tienda", role: "E-commerce" },
    ],
    note: "Testimonios de muestra. Se reemplazan con reales cuando estén disponibles.",
  },
  contact: {
    eyebrow: "Contacto",
    title: "Hablemos de cómo trabaja tu empresa.",
    lead: "Contame cómo opera hoy y dónde sentís que se pierde. Respondo consultas en el día.",
    available: "Disponible para un diagnóstico",
    sentLabel: "Mensaje enviado",
    sentBody: "Gracias por escribir. Te respondo a la brevedad.",
    sendAnother: "Enviar otro mensaje",
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
      msgPh: "Contame un poco sobre tu empresa y qué te está costando…",
      send: "Enviar mensaje",
    },
  },
  footer: {
    tag: "Forward Deployed Engineer. Entro a la operación, encuentro dónde se pierde y lo construyo.",
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
    writing: "Writing",
    about: "About",
    contact: "Contact",
    cta: "Let's work together",
  },
  hero: {
    badge: "Available for a diagnostic",
    title: "Forward Deployed Engineer.",
    sub: "I go into your company, see how it actually operates, find where time, money or customers are leaking, and build the fix. Automations, custom systems and integrations.",
    ctaPrimary: "View projects",
    ctaSecondary: "Request a diagnostic",
    stats: [
      { v: "3", k: "Improvements per diagnostic" },
      { v: "5+", k: "Years building systems" },
      { v: "24h", k: "Response time" },
    ],
  },
  services: {
    eyebrow: "How I work",
    title: "What I do inside a company",
    sub: "I don't sell websites and I'm not an agency. I sell operations that work better.",
    items: [
      { icon: "search", title: "Diagnostic", desc: "I look at how your company actually runs and leave you three concrete improvements with their estimated impact. That is the way in." },
      { icon: "zap", title: "Automations", desc: "The work someone does by hand every day and shouldn't: billing, notifications, data entry, follow-ups." },
      { icon: "layers", title: "Custom systems", desc: "For when the spreadsheet stops holding and no off-the-shelf product matches how you actually operate." },
      { icon: "git-branch", title: "Integrations", desc: "Getting your tools to talk to each other, instead of someone copying and pasting between them." },
    ],
  },
  projects: {
    eyebrow: "Selected work",
    title: "Featured projects",
    all: "View all",
    view: "View case",
    pageTitle: "Projects",
    pageLead: "Systems I built inside real operations, each with the problem it was solving.",
    highlights: "Highlights",
    stackLabel: "Stack",
    viewSite: "View site",
    captures: "View screenshots",
    code: "Code",
    filterAll: "All",
    empty: "No projects to show yet.",
  },
  niches: {
    eyebrow: "Where I work",
    title: "Niches",
    pageLead: "Each niche gathers the projects, learnings and material from the same terrain.",
    homeSub: "The worlds where I've already built, and keep building.",
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
    pageLead: "Field notes in real time: what I'm building, decisions I made and what I keep learning along the way.",
    empty: "No posts yet.",
    readMore: "Read more",
    readLess: "Show less",
    pinned: "Pinned",
    filesLabel: "Resources",
    all: "View all",
  },
  cta: {
    title: "Where is your time going?",
    sub: "Tell me how your company works today and I come back with three concrete improvements and the impact I estimate for each.",
    button: "Request a diagnostic",
  },
  about: {
    eyebrow: "About",
    title: "Valentín Varela",
    bio: [
      "I'm a Forward Deployed Engineer. I work inside the operation: I look at how a company actually runs, not how it is written down that it runs, and I build what it is missing so it stops losing time, money or customers.",
      "I do that under SurCodia for companies that already have revenue and no technical team of their own, and as Forward Deployed Product Engineer at Stealth Seller, on the users' side of the platform.",
      "The way in is always the same: a short diagnostic, three concrete improvements and the impact I estimate for each. If we build after that, we build on top of it and not on a hunch.",
    ],
  },
  exp: {
    eyebrow: "Track record",
    title: "Experience",
    items: [
      { role: "Forward Deployed Product Engineer", when: "Aug 2026 - now", org: "Stealth Seller", desc: "I work on the users' side of the platform: I listen to the real problem, turn it into product and ship it end to end." },
      { role: "Forward Deployed Engineer", when: "2023 - now", org: "SurCodia", desc: "I go into companies that already have revenue, find where their time and money is going, and build the fix: automations, custom systems and integrations." },
      { role: "Full-stack developer", when: "2021 - 2023", org: "Own projects", desc: "Launched several photography and online-sales platforms on the T3 stack." },
      { role: "Early days", when: "2019 - 2021", org: "Self-taught", desc: "Started by combining web development and visual design, my two obsessions." },
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
    note: "Sample testimonials. To be replaced with real ones.",
  },
  contact: {
    eyebrow: "Contact",
    title: "Let's talk about how your company works.",
    lead: "Tell me how it operates today and where you feel it leaking. I answer inquiries the same day.",
    available: "Available for a diagnostic",
    sentLabel: "Message sent",
    sentBody: "Thanks for reaching out. I'll get back to you shortly.",
    sendAnother: "Send another message",
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
      msgPh: "Tell me a bit about your company and what is costing you…",
      send: "Send message",
    },
  },
  footer: {
    tag: "Forward Deployed Engineer. I go into the operation, find where it leaks and build the fix.",
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
