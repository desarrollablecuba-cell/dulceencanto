# 🧁 Dulce Encanto — Repostería Artesanal

Tienda online de repostería artesanal en Ciego de Ávila, Cuba. Vende tartas, pasteles, cupcakes, servicios para eventos y promociones.

## 🚀 Despliegue en Railway con MySQL

### 1. Crear proyecto en Railway
1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. **New Project** > **Deploy from GitHub repo** (sube este código a GitHub primero)
3. Selecciona el repositorio

### 2. Agregar MySQL
1. En el proyecto de Railway, click **+ Add**
2. Selecciona **Database** > **Add MySQL**
3. Railway creará automáticamente la variable `DATABASE_URL`

### 3. Configurar variables de entorno
En la pestaña **Variables** del servicio web, agrega:

```
JWT_SECRET=tu-secret-aqui-generado-con-openssl-rand-hex-32
NODE_ENV=production
```

> **Generar JWT_SECRET**: Ejecuta `openssl rand -hex 32` en tu terminal y copia el resultado.

### 4. Deploy
Railway detectará automáticamente el `nixpacks.toml` y:
1. Instalará dependencias (`bun install`)
2. Generará Prisma Client para MySQL
3. Creará las tablas (`db:push`)
4. Sembrará datos iniciales (categorías, productos, configuración)
5. Compilará Next.js para producción
6. Iniciará el servidor

El primer deploy tarda **~3-5 minutos**.

### 5. Acceder al admin
Una vez deployado, visita `https://tu-app.railway.app/admin`:
- **Email**: `admin@dulceencanto.com`
- **Password**: `DulceAdmin2026!`

> ⚠️ **Cambia estas credenciales** desde el panel de admin después del primer login.

## 🛠️ Desarrollo local (SQLite)

Para desarrollo local con SQLite:

```bash
# Cambiar a SQLite
bash scripts/switch-schema.sh sqlite

# Configurar .env
echo "DATABASE_URL=file:./db/custom.db" > .env

# Instalar dependencias
bun install

# Crear BD y sembrar datos
bun run db:push
bun run scripts/seed-dulce.ts
bun run scripts/seed-extras.ts
bun run scripts/seed-catalog.ts

# Iniciar dev server
bun run dev
```

## 📁 Estructura del proyecto

```
├── src/
│   ├── app/              # Rutas de Next.js (App Router)
│   ├── components/       # Componentes React
│   │   ├── ecommerce/    # Componentes de la tienda
│   │   └── ui/           # Componentes shadcn/ui
│   ├── store/            # Zustand stores (cart, currency, wishlist)
│   ├── lib/              # Utilidades (auth, db, themes)
│   └── hooks/            # Custom hooks
├── prisma/               # Schema de Prisma
│   ├── schema.prisma     # Schema MySQL (default)
│   ├── schema.sqlite.prisma # Schema SQLite (desarrollo local)
│   └── schema.mysql.prisma  # Schema MySQL (backup)
├── public/              # Imágenes y assets estáticos
├── scripts/             # Scripts de seed y utilidades
├── nixpacks.toml        # Config de Railway
├── Caddyfile            # Config del gateway
└── package.json
```

## 🔧 Tecnologías

- **Framework**: Next.js 16 (App Router, standalone output)
- **Lenguaje**: TypeScript 5
- **BD**: Prisma ORM (MySQL en producción, SQLite en desarrollo)
- **UI**: Tailwind CSS 4 + shadcn/ui + Lucide icons
- **Estado**: Zustand (cliente) + TanStack Query (servidor)
- **Runtime**: Bun
- **Auth**: JWT (admin) + NextAuth-ready (clientes)

## 📞 Soporte

Para problemas o preguntas, contacta al desarrollador.
