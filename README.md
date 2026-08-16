# 🧁 Dulce Encanto — Repostería Artesanal

Tienda online de repostería artesanal en Ciego de Ávila, Cuba.

## 🚀 Despliegue en Railway con MySQL

### Paso 1: Subir código a GitHub
Sube todo el contenido del zip a un repositorio de GitHub.

### Paso 2: Crear proyecto en Railway
1. Ve a [railway.app](https://railway.app) → **New Project**
2. Selecciona **Deploy from GitHub repo**
3. Elige tu repositorio

### Paso 3: Agregar MySQL (¡IMPORTANTE!)
1. En el proyecto de Railway, click **+** (abajo a la derecha)
2. Selecciona **Add Database** → **MySQL**
3. Railway creará un servicio MySQL con estas variables automáticas:
   - `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`
   - **`MYSQL_URL`** o **`DATABASE_URL`** (URL de conexión completa)

### Paso 4: Conectar DATABASE_URL al servicio Web (¡CRÍTICO!)
1. Click en tu servicio **Web** (la app Next.js)
2. Ve a la pestaña **Variables**
3. Click **New Variable**
4. Name: `DATABASE_URL`
5. Value: click en el botón **"Reference Variable"** y selecciona `DATABASE_URL` del servicio MySQL
   - O manualmente: `${{MySQL.DATABASE_URL}}`
   - El formato será algo como: `mysql://root:pass@host:port/railway`

### Paso 5: Agregar variables adicionales
En el mismo servicio Web → Variables:

| Variable | Valor |
|----------|-------|
| `JWT_SECRET` | (genera con: `openssl rand -hex 32`) |
| `NODE_ENV` | `production` |

### Paso 6: Deploy
Railway construirá automáticamente:
1. `bun install` — instala dependencias
2. `prisma generate` — genera el cliente de Prisma
3. `prisma db push` — **crea todas las tablas en MySQL**
4. Seeds — inserta productos, categorías y configuración inicial
5. `next build` — compila la app para producción
6. `node .next/standalone/server.js` — inicia el servidor

⏱️ El primer deploy tarda **~3-5 minutos**.

### Paso 7: Acceder al admin
- URL: `https://tu-app.railway.app/admin`
- Email: `admin@dulceencanto.com`
- Password: `DulceAdmin2026!`

> ⚠️ **Cambia estas credenciales** después del primer login.

---

## 🔧 Si la app no responde (troubleshooting)

### La BD está vacía / no hay tablas
**Problema:** `DATABASE_URL` no está conectada al servicio Web.
**Solución:** Repite el Paso 4 anterior. Debes ver `DATABASE_URL` en las variables del servicio Web (no solo en el MySQL).

### Error de conexión a MySQL
**Problema:** El formato de `DATABASE_URL` es incorrecto.
**Solución:** Debe ser: `mysql://user:password@host:port/database`

### La app arranca pero se ve sin estilos/imagenes
**Problema:** El build de standalone no copió los assets.
**Solución:** Re-deploya. Si persiste, verifica que `public/` existe en el repo.

---

## 🛠️ Desarrollo local (SQLite)

```bash
# Cambiar schema a SQLite
bash scripts/switch-schema.sh sqlite
echo "DATABASE_URL=file:./db/custom.db" > .env

# Instalar + setup
bun install
bun run db:generate
bun run db:push
bun run db:seed-all

# Iniciar
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
├── scripts/              # Seeds y utilidades
├── nixpacks.toml         # Config Railway
└── package.json
```

## 🔧 Stack
- Next.js 16 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui
- Prisma ORM (MySQL producción / SQLite desarrollo)
- Zustand + TanStack Query
- Bun runtime
