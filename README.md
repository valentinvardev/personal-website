# valentinvarela.cloud

Sitio personal construido sobre el [T3 Stack](https://create.t3.gg/): **Next.js 15 (App Router) · TypeScript · tRPC · Prisma · Tailwind CSS 4 · PostgreSQL (Supabase)**, con el design system **Geist** (Vercel) portado desde el proyecto de Claude Design (`_geist-design/`).

## Qué incluye

- **Páginas**: Inicio, Proyectos (con drawer de detalle), Sobre mí y Contacto.
- **ES/EN** con auto-detección por `navigator.language` y switch en la nav.
- **Tema claro/oscuro** automático por horario (7–19 h claro), con toggle persistido en `localStorage` y script anti-flash en `<head>`.
- **Design system Geist**: tokens (`--ds-*`) en `src/styles/globals.css`, componentes tipados en `src/components/geist/` (Button, Badge, Card, Avatar, Note, Input, Textarea, Spinner, Tabs, Switch, Checkbox, Icon) e iconos Lucide embebidos.
- **Formulario de contacto** end-to-end: React → tRPC (`contact.send`, validado con Zod) → Prisma → Postgres (`ContactMessage`).
- **Modal "Ver sitio"**: cada proyecto abre un modal con tabs por sección y capturas de página completa scrolleables (tabla `ProjectSection`).
- **Panel `/admin`**: gestión de esas capturas (crear/editar/ordenar/eliminar por proyecto), protegido con `ADMIN_PASSWORD` (cookie httpOnly firmada; los procedimientos tRPC de escritura usan `adminProcedure`).

## Puesta en marcha

```bash
npm install
```

### Opción A — Postgres local (Docker/Podman)

```bash
./start-database.sh   # levanta un contenedor con las credenciales del .env
npm run db:push       # crea las tablas
npm run dev
```

### Base de datos: Supabase compartida

Este proyecto usa **la misma base de Supabase que el sistema de facturación**, pero aislado en su propio schema de Postgres: **`personal_site`**. Las tablas del otro proyecto viven en `public` y Prisma jamás las ve.

Reglas de convivencia:

- ⚠️ **Nunca quites `schema=personal_site`** de `DATABASE_URL` / `DIRECT_URL`. Sin ese parámetro, Prisma intentaría gestionar `public` y podría **borrar las tablas de facturación**.
- Usá **`npm run db:push`** para cambios de schema. Evitá `npm run db:generate` (`prisma migrate dev`) contra esta base compartida.
- Las tablas propias (`ContactMessage`, `ProjectSection`) se ven en el Table Editor de Supabase bajo el schema `personal_site`, o con `npm run db:studio`.

Para desarrollo sin tocar la base compartida existe la opción local: `./start-database.sh` (Docker) y las URLs locales de `.env.example`.

## Panel de admin

En `/admin` (no aparece en la navegación, `noindex`). La contraseña sale de `ADMIN_PASSWORD` en `.env` — cambiala antes de deployar; cambiar la contraseña invalida todas las sesiones.

Cada **sección** de un proyecto es un tab del modal "Ver sitio": nombre ES (y EN opcional), la URL de una captura de página completa y un número de orden. Las capturas pueden ser:
- archivos en `public/screenshots/…` (ruta relativa `/screenshots/foo.png`), o
- URLs públicas de Supabase Storage (recomendado en producción).

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Dev server con Turbopack |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Sincroniza el schema con la base (sin migraciones) |
| `npm run db:generate` | `prisma migrate dev` |
| `npm run db:studio` | Prisma Studio |

## Estructura

```
src/
  app/                  # rutas (App Router): /, /projects, /about, /contact
  components/geist/     # design system Geist portado a TSX
  components/site/      # nav, footer, drawer, prefs (tema + idioma)
  lib/content.ts        # contenido ES/EN tipado (proyectos, bio, servicios…)
  server/api/           # tRPC (router contact)
  styles/globals.css    # tokens --ds-* + estilos del sitio
prisma/schema.prisma    # ContactMessage (Postgres/Supabase)
```

## Deploy en el VPS (pm2 + nginx)

La base ya vive en Supabase, así que el VPS solo corre Next.js.

```bash
# 1. Código y dependencias (Node 20+)
cd ~/valentinvarela
git clone https://github.com/valentinvardev/personal-website.git .
nano .env                # DATABASE_URL, DIRECT_URL, ADMIN_PASSWORD fuerte,
                         # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
                         # SUPABASE_SECRET_KEY (mismos valores que en dev, salvo la contraseña)
npm ci                   # postinstall corre prisma generate

# 2. Build y proceso
npm run build
pm2 start ecosystem.config.cjs   # app "valentinvarela" en el puerto 3013
pm2 save
```

Para actualizar: `git pull && npm ci && npm run build && pm2 restart valentinvarela`.

### nginx (dominio → puerto interno)

```nginx
server {
    server_name valentinvarela.cloud www.valentinvarela.cloud;
    listen 80;

    location / {
        proxy_pass http://127.0.0.1:3013;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 60m;   # subidas del admin (hasta 50 MB)
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d valentinvarela.cloud -d www.valentinvarela.cloud
```

> Notas: el puerto interno es **3013** (los puertos < 1024, como el 13, requieren
> root y no se usan para apps Node). En producción la cookie del admin es
> `secure`: entrá a `/admin` siempre por **https** con el dominio (por
> `http://ip:3013` el login no persiste). El `client_max_body_size` es
> necesario para que nginx no corte las subidas de capturas y archivos.

## Design system

El diseño está basado en **Geist**, el design system open-source de Vercel, generado con Claude Design y portado a este repo (la carpeta de referencia `_geist-design/` con tokens, mockups y UI kits vive fuera del repo, en el workspace local). Si cambiás algo del sistema, mantené los nombres de tokens `--ds-*`.

> Notas del DS: el tema oscuro es una aproximación de alta confianza (no verificado contra `design.dark.md`), y los iconos son un subset de Lucide como sustituto documentado de Geist Icons.
