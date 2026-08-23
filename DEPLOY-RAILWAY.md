# 🚀 Despliegue en Railway con MySQL — Dulce Encanto

Guía paso a paso, con la causa raíz de "Application failed to respond"
explicada y resuelta de forma definitiva.

---

## ⚠️ Causa raíz de "Application failed to respond" (ya resuelta)

Railway **ya no usa Nixpacks** para servicios nuevos: su builder por defecto
es **Railpack**, que **IGNORA el archivo `nixpacks.toml`**. Railpack
auto-detecta Next.js y arranca la app con `next start`, que es
**incompatible** con `output: 'standalone'` (la configuración de este
proyecto) → el contenedor muere al instante → nada escucha en el puerto →
"Application failed to respond" y la BD jamás recibe tablas.

**La solución definitiva** (incluida en este zip, en 3 capas):

1. **`railway.json`** — config nativa de Railway: builder RAILPACK,
   `buildCommand` explícito y `startCommand` = `node scripts/start-railway.mjs`.
2. **`Procfile`** — `web: node scripts/start-railway.mjs` (convención estándar).
3. **`package.json` → `npm start`** — también ejecuta el script de arranque
   con preparación de BD (cubre cualquier builder que use `npm start`).

Y si Railway ignorara las tres capas, la capa 4 es manual e infalible
(30 segundos, ver Paso 6b): fijar el **Custom Start Command** en el panel.

El script `scripts/start-railway.mjs` al arrancar:
1. **Levanta el servidor Next.js INMEDIATAMENTE** (escucha el puerto en
   segundos → el healthcheck de Railway pasa al primer intento).
2. En PARALELO prepara la BD: crea tablas (`prisma db push` con reintentos
   y timeout por intento) y ejecuta los 3 seeds (solo si la BD está vacía;
   en redeploys se omiten). Un fallo de BD NO tumba la app: las APIs
   responden error hasta que la BD quede lista, pero el sitio vive.

Primer arranque: las APIs tardan ~1-2 min en quedar operativas (preparación
de BD en paralelo). Siguientes: casi instantáneos.

---

## Paso 1: Subir el código a GitHub

1. Crea un repositorio nuevo en GitHub (puede ser privado).
2. Extrae este zip y sube **todo su contenido** (web: *Add file → Upload files*).
3. Verifica que se subieron: `railway.json`, `Procfile`, `scripts/start-railway.mjs`,
   `.env.example` y `nixpacks.toml`.

> No subas nunca un `.env` real con contraseñas a GitHub.

## Paso 2: Crear el proyecto en Railway

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
2. Elige el repositorio. Railway crea el servicio **Web**.

## Paso 3: Agregar MySQL

En el proyecto: **+ Create → Database → Add MySQL**.

## Paso 4: Conectar la BD al servicio Web (¡CRÍTICO!)

1. Clic en el servicio **Web → Variables → New Variable**.
2. Nombre: `DATABASE_URL` → pulsa **"Reference variable"** → la `DATABASE_URL`
   del servicio **MySQL**. Queda `${{MySQL.DATABASE_URL}}`.
   - También vale pegada a mano:
     `mysql://root:PASS@mysql.railway.internal:3306/railway`
     (pero se rompe si Railway rota la contraseña).

## Paso 5: Variables restantes (servicio Web)

| Variable  | Valor |
|-----------|-------|
| `JWT_SECRET` | Cadena aleatoria larga |
| `NODE_ENV` | `production` |

## Paso 6: Deploy

1. **Deployments → Deploy latest commit**.
2. Build (~5-8 min): instala, genera Prisma y compila. **No toca la BD**.
3. Arranque: crea tablas + siembra (~1-2 min la primera vez).
4. **Settings → Networking → Generate Domain**.

### Paso 6b (INFALIBLE, 30 segundos): fijar el Start Command en el panel

Si tras el deploy siguieras viendo "Application failed to respond":

1. Servicio **Web → Settings** (Configuraciones).
2. Busca **Deploy → Custom Start Command** (Comando de inicio personalizado).
3. Pega exactamente:
   ```
   node scripts/start-railway.mjs
   ```
4. Guarda → redeploya. Esto **siempre** tiene prioridad sobre cualquier
   builder o archivo de config.

También en Settings puedes verificar el **Custom Build Command**:
```
npm install --include=dev --no-audit --no-fund && npx prisma generate && npm run build
```

## Paso 7: Verificar

1. `https://tu-app.up.railway.app` → carga la tienda.
2. `https://tu-app.up.railway.app/api/seed` → debe responder:
   `"products": 56, "categories": 5, "admins": 1, "siteConfig": "configured"`.
3. Admin: `/admin` → `admin@dulceencanto.com` / `DulceAdmin2026!`
   (cambia la contraseña y configura el correo de Zelle).

---

## 🔧 Solución de problemas

### "Application failed to respond"
1. Haz el **Paso 6b** (Custom Start Command manual).
2. **Deployments → abre el deploy → View Logs**:
   - Build falla → pega el error del log de build.
   - En runtime debes ver `🚀 DULCE ENCANTO — Arranque de producción` y
     `[db] ✓ Tablas verificadas/creadas`. Si no aparece, el start command
     no es el nuestro → Paso 6b.

### BD sin tablas
En los logs de runtime debe aparecer `[db] Intento 1/15: prisma db push...`.
- Si dice `Can't reach database server` 15 veces → revisa `DATABASE_URL`
  (Paso 4). El host debe ser `mysql.railway.internal`.
- Si ni siquiera aparece `[db]` → no está corriendo nuestro script → Paso 6b.

### Login admin: "Error interno del servidor"
Falta `JWT_SECRET` en el servicio Web.

### Re-sembrar todo desde cero
Agrega variable `FORCE_SEED=1` → redeploy → espera arranque → elimina la
variable → redeploy.

### Imágenes del admin se pierden al redeployar
Filesystem efímero de Railway. Súbelas al repo en `public/products/`.

---

## Variables de entorno (resumen)

| Variable | Dónde | Valor |
|----------|-------|-------|
| `DATABASE_URL` | Web (referenciada del MySQL) | `${{MySQL.DATABASE_URL}}` |
| `JWT_SECRET` | Web | aleatorio largo |
| `NODE_ENV` | Web | `production` |
| `FORCE_SEED` | Web (opcional) | `1` solo para re-sembrar |
