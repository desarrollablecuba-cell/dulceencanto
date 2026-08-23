# 🧁 Dulce Encanto — Repostería Artesanal

Tienda online de repostería artesanal en Ciego de Ávila, Cuba.

**Pagos**: Zelle en USD desde el exterior + pago local en CUP desde Cuba.

## 📦 Despliegue

| Guía | Archivo |
|------|---------|
| 🚀 Railway + MySQL | [`DEPLOY-RAILWAY.md`](./DEPLOY-RAILWAY.md) |
| 🖥️ Hostinger hPanel + MySQL | [`DEPLOY-HOSTINGER.md`](./DEPLOY-HOSTINGER.md) |

Resumen rápido:

### Railway
1. Sube el código a GitHub.
2. Railway → New Project → Deploy from GitHub repo.
3. Add Database → **MySQL**.
4. En el servicio Web, referencia la variable `DATABASE_URL` del MySQL
   (botón "Reference Variable").
5. Agrega `JWT_SECRET` y `NODE_ENV=production`.
6. Deploy — el build **solo compila** (sin tocar la BD: el contenedor de
   build no tiene acceso a la red privada). Las **tablas y datos se crean
   en el primer arranque** del servidor (`scripts/start-railway.mjs`,
   con reintentos hasta que MySQL esté listo). Primer arranque: ~1-2 min
   extra; los siguientes son casi instantáneos.

### Hostinger (hPanel)
1. hPanel → Bases de datos MySQL → crear BD.
2. Gestor de archivos → subir y extraer este zip.
3. Crear `.env` con `DATABASE_URL=mysql://usuario:clave@localhost:3306/bd`.
4. Terminal: `npm install && npx prisma db push && npm run seed:all && npm run build`.
5. App Node.js (hPanel → Avanzado → Node.js), startup file:
   `.next/standalone/server.js`.

## 🔐 Acceso al admin

- URL: `/admin`
- Email: `admin@dulceencanto.com`
- Password: `DulceAdmin2026!`

> ⚠️ Cambia estas credenciales tras el primer login.

## 🌱 Seeds (datos iniciales)

Los seeds solo siembran cuando la BD está **vacía** — los redeploys no
borran pedidos ni datos reales. Para forzar una resiembra completa:

```bash
FORCE_SEED=1 npm run seed:all   # o: bun run db:seed-all
```

## 🛠️ Desarrollo local (SQLite)

```bash
bash scripts/switch-schema.sh sqlite
echo "DATABASE_URL=file:./db/custom.db" > .env

bun install
bun run db:generate
bun run db:push
bun run db:seed-all

bun run dev
```

## 📁 Estructura

```
├── src/app/              # Rutas Next.js (App Router)
├── src/components/       # Componentes React (ecommerce + ui)
├── src/store/            # Zustand stores
├── src/lib/              # Auth, DB, utils
├── prisma/               # Schema Prisma (MySQL default)
├── public/               # Imágenes (WebP)
├── scripts/              # Seeds, postbuild y utilidades
├── nixpacks.toml         # Config Railway
├── DEPLOY-RAILWAY.md     # Guía Railway
└── DEPLOY-HOSTINGER.md   # Guía Hostinger
```

## 🔧 Stack
- Next.js 16 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui
- Prisma ORM (MySQL producción / SQLite desarrollo)
- Zustand + TanStack Query
- Bun (Railway) / npm (Hostinger)
