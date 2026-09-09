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
| `npm test` | Guard del día lógico + tests con `node --test` (sin dependencias) |
| `npm run db:push` | Sincroniza el schema con la base (sin migraciones) |
| `npm run db:studio` | Prisma Studio |

> Los scripts `db:generate` (`prisma migrate dev`) y `db:migrate` (`prisma migrate deploy`)
> fueron **eliminados a propósito**. Esta base es compartida con la plataforma de la agencia,
> que tiene su propio historial de migraciones en `public._prisma_migrations` gestionado desde
> otro repo. `migrate dev` contra esta base puede intentar baselinear o resetear tablas ajenas.
> El único camino de DDL de este repo es `db:push`.

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

Para actualizar:

```bash
git pull && npm install && npm run build && pm2 restart valentinvarela
```

> ⚠️ **`npm install`, no `npm ci`.** `npm ci` borra `node_modules` **entero** antes de reinstalar,
> así que garantiza una ventana de caída y, si el install falla a mitad de camino, deja el servidor
> sin `next`: pm2 (con `autorestart: true`) entra en un bucle de arranques fallidos y nginx devuelve
> 502. Pasó el 2026-09-09 con una dependencia pesada. `npm install` es incremental y no borra nada
> hasta tener con qué reemplazarlo. Reservá `npm ci` para la instalación inicial en un servidor
> nuevo, donde no hay nada que tirar abajo.

### Si el sitio "está caído" (500 intermitentes o páginas que tardan 10 s)

Diagnóstico del 2026-08-29: el código estaba sano; el problema era `connection_limit=1`
en `DATABASE_URL`. Con una sola conexión a Supabase (~1 s por query desde el VPS), las
queries de todos los visitantes se serializan y la que espera más de `pool_timeout`
(10 s por defecto) falla con P2024 → Next responde **500** en el home. Un bot o un
segundo visitante alcanzan para dispararlo.

```bash
# en el VPS
nano .env    # en DATABASE_URL: connection_limit=10&pool_timeout=20 (ver .env.example)
pm2 restart valentinvarela --update-env
# verificar: 6 requests simultáneos deben dar 200 todos
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://valentinvarela.cloud/ & done; wait
```

Cómo comprobar desde afuera sin SSH: `curl -sk -H "Host: valentinvarela.cloud" https://<ip-del-vps>/`
(salteando Cloudflare) y <https://check-host.net> (chequeo HTTP desde varios países).

### Si los logos / favicon / foto dan 400

Todos los archivos de `public/` respondían `400 Bad Request` en producción. Next 15.5
normaliza a 400 **cualquier** error de lectura de un archivo estático que sí existía al
arrancar (`router-server.js`): típicamente **permisos** (EACCES: el usuario de pm2 no puede
leer el archivo) o el archivo desapareció después de arrancar (ENOENT). Revisar en el VPS:

```bash
ls -la public/            # deben ser -rw-r--r-- y legibles por el usuario de pm2
pm2 describe valentinvarela | grep -E "exec cwd|script path|uid|username"
chmod 644 public/* && pm2 restart valentinvarela
```

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

## Panel de medición (`/panel`)

Sistema personal de medición de productividad, hábitos y estado. **Privado**: comparte la sesión y
la contraseña de `/admin`. La especificación completa está en `sistema-medicion-personal-spec.md`,
en la raíz del workspace.

Vive en su propio schema de Postgres (`panel`), separado de `personal_site` (el portfolio) y de
`public` (la plataforma de la agencia, que este repo **no** gestiona).

### Encenderlo

Está apagado por defecto: sin `PANEL_ENABLED`, la ruta devuelve 404 y para el mundo no existe.

```bash
echo 'PANEL_ENABLED="true"' >> .env
pm2 restart valentinvarela
```

La base ya tiene el schema y las métricas sembradas. Si alguna vez hay que rehacerlo:

```bash
npm run db:plan     # muestra el SQL y RECHAZA el plan si toca un schema ajeno
npm run db:sync     # db push + reaplica prisma/panel-sql/ (CHECK y REVOKE)
node --env-file=.env prisma/seed-panel.mjs
```

### El día lógico

Todo el sistema cuelga de una sola decisión: **un día empieza a las 5:00 de Buenos Aires**, así que
lo que hacés a las 2 de la mañana cuenta para el día anterior.

`src/lib/panel/logical-date.ts` es el **único** lugar autorizado a decidir a qué día pertenece un
instante, y `scripts/guard-time.mjs` lo hace cumplir: prohíbe `getDate()`, `toLocaleDateString()` y
`new Intl.DateTimeFormat` en el resto del panel. Corre en `npm test` y en `prebuild`.

Cambiar el corte obliga a recomputar todo el histórico (`panel-job rollup --all`).

### El cron

```bash
node --env-file=.env scripts/panel-job.ts rollup --catchup    # lo que corre el cron
node --env-file=.env scripts/panel-job.ts rollup --last 7
node --env-file=.env scripts/panel-job.ts rollup --all        # rebuild completo
```

La línea para el crontab está en `deploy/crontab.txt`, comentada con el porqué de cada parte.
Corre **en otro proceso**, con su propio pool de 2 conexiones: el proceso de pm2 que sirve el sitio
tiene `max_memory_restart: 512M` y un rebuild grande ahí adentro reiniciaría el sitio público.

El dashboard no depende del cron para el día de hoy: ese se calcula al vuelo desde los eventos.

### Backup

El valor del sistema está en la serie histórica, que no se puede reconstruir.

```bash
npm run panel:export                                  # a backups/
npm run panel:restore -- backups/panel-....json       # dry run
npm run panel:restore -- backups/panel-....json --confirm
node --env-file=.env scripts/panel-job.ts rollup --all # recomputar los derivados
```

También hay una ruta HTTP (`/api/panel/export`) para bajarte los datos desde el navegador, pero el
backup de verdad es el CLI: uno que depende de que la web esté levantada no es un backup.

### Webhook de GitHub

Opcional. En el repo: Settings, Webhooks, con `application/json`, evento `push`, URL
`https://valentinvarela.cloud/api/ingest/github` y un secreto que va en `GITHUB_WEBHOOK_SECRET`.
Sin esa variable el endpoint devuelve 503.

Para probarlo sin hacer un push:

```bash
node --env-file=.env scripts/fake-github-delivery.ts --url http://localhost:3000
node --env-file=.env scripts/fake-github-delivery.ts --tamper   # debe dar 401
```

> Si Cloudflare devuelve un challenge HTML, la entrega figura fallida con un 403 que no aparece en
> ningún log del VPS. Ahí hace falta una regla de WAF de tipo Skip para esa ruta.
