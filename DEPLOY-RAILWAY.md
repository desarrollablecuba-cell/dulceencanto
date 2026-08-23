# 🚀 Despliegue en Railway con MySQL — Dulce Encanto

Guía paso a paso para subir este zip a Railway.

---

## Paso 1: Subir el código a GitHub

1. Crea un repositorio nuevo en GitHub (puede ser privado).
2. Extrae este zip y sube **todo su contenido** a ese repositorio
   (desde la web de GitHub: *Add file → Upload files*, o con git).
3. Asegúrate de que el archivo `.env.example` se subió (GitHub a veces
   oculta archivos que empiezan con punto — usa "Upload files" y verifica).

> No subas nunca un archivo `.env` real con contraseñas a GitHub.

---

## Paso 2: Crear el proyecto en Railway

1. Entra a [railway.app](https://railway.app) e inicia sesión.
2. **New Project → Deploy from GitHub repo**.
3. Autoriza Railway a acceder a tu cuenta de GitHub y elige el repositorio.
4. Railway creará un servicio **Web** con la app Next.js.

> El primer deploy FALLARÁ o quedará en espera hasta completar el Paso 4
> (falta la base de datos). Es normal.

---

## Paso 3: Agregar MySQL

1. En el proyecto de Railway, pulsa **+ Create** (o el botón + abajo a la derecha).
2. **Database → Add MySQL**.
3. Railway crea el servicio MySQL con su propia `DATABASE_URL` interna.

---

## Paso 4: Conectar la base de datos al servicio Web (¡CRÍTICO!)

1. Haz clic en el servicio **Web** (la app).
2. Pestaña **Variables → New Variable**.
3. Nombre: `DATABASE_URL` → en el valor, pulsa **"Reference variable"** y
   selecciona la `DATABASE_URL` del servicio **MySQL**.
   - Quedará algo como: `${{MySQL.DATABASE_URL}}`
   - El formato final es: `mysql://root:pass@host:port/railway`

---

## Paso 5: Agregar las variables restantes

En el mismo servicio Web → Variables, agrega:

| Variable  | Valor |
|-----------|-------|
| `JWT_SECRET` | Cadena aleatoria larga (puedes generarla en https://generate-secret.com o con `openssl rand -hex 32`) |
| `NODE_ENV` | `production` |

---

## Paso 6: Deploy

1. Pestaña **Settings** del servicio Web → verifica **Build** (Nixpacks).
2. **Deployments → Deploy latest commit**.
3. Railway ejecutará automáticamente:
   - `bun install` — instala dependencias
   - `prisma generate` — genera el cliente Prisma
   - `prisma db push` — **crea todas las tablas en MySQL**
   - Seeds — insertan catálogo, servicios, promociones, galería y admin
   - `next build` — compila la app
   - `node .next/standalone/server.js` — inicia el servidor

⏱️ El primer deploy tarda **~5-10 minutos**.

### Sobre los seeds (datos iniciales)
- Solo se siembran **la primera vez** (cuando la BD está vacía).
- Los redeploys **NO borran** pedidos ni datos reales.
- Si algún día quieres re-sembrar todo desde cero: agrega la variable
  `FORCE_SEED=1`, haz deploy, y luego **elimínala** y despliega de nuevo.

---

## Paso 7: Abrir la tienda

1. Servicio Web → **Settings → Networking → Generate Domain**
   (o añade tu dominio propio).
2. Tienda: `https://tu-app.up.railway.app`
3. Admin: `https://tu-app.up.railway.app/admin`
   - Email: `admin@dulceencanto.com`
   - Password: `DulceAdmin2026!`

> ⚠️ **Cambia la contraseña del admin** después del primer login.

---

## 🔧 Solución de problemas

### El deploy falla en `prisma db push`
`DATABASE_URL` no está conectada al servicio Web. Repite el Paso 4.

### La app arranca pero se ve vacía
Las tablas no se crearon o los seeds no corrieron. Verifica que
`DATABASE_URL` esté en el servicio **Web** (no solo en el MySQL) y
re-deploya. Puedes verificar visitando `https://tu-app.railway.app/api/seed`
(debe responder con conteos de productos/categorías/admins).

### Se ve sin estilos o sin imágenes
Re-deploya. El build copia `public/` y `.next/static` al servidor standalone.

### Imágenes subidas por el admin desaparecen tras un redeploy
El sistema de archivos de Railway es efímero. Las imágenes incluidas en el
repo no se pierden; solo las subidas desde el panel admin después del deploy.
Guárdalas y súbelas de nuevo, o súbelas al repo en `public/products/`.

---

## Variables de entorno (resumen)

| Variable | Dónde | Valor |
|----------|-------|-------|
| `DATABASE_URL` | Web (referenciada del MySQL) | `${{MySQL.DATABASE_URL}}` |
| `JWT_SECRET` | Web | aleatorio largo |
| `NODE_ENV` | Web | `production` |
| `FORCE_SEED` | Web (opcional) | `1` solo para re-sembrar |
