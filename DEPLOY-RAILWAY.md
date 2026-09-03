# 🚀 Despliegue en Railway con MySQL — Dulce Encanto

Guía paso a paso, con la causa raíz de "Application failed to respond"
explicada y resuelta de forma definitiva.

---

## 🏷️ Versiones del paquete (V50, V51, …)

Cada descarga desde `/api/download` genera un ZIP **correlativo y
autoverificado**: `dulce-encanto-V50.zip`, luego `V51`, etc. Dentro del ZIP
hay un **`VERSION.txt`** con la versión, fecha y fingerprint SHA-256 del
código. El paquete se autocomprueba antes de servirse: si faltara código de
la última versión, la descarga falla con error (no se entrega ZIP viejo).

**Cómo comprobar qué versión tienes desplegada en Railway:**

```
https://TU-APP.up.railway.app/api/health
```

El JSON muestra `"appVersion": "50.0.0"` (= V50), el estado de la conexión,
los conteos de cada tabla y si faltan columnas. Es el primer sitio que hay
que mirar ante cualquier sospecha.

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
2. En PARALELO ejecuta `scripts/db-setup.mjs` (Node puro, sin CLI de
   Prisma): crea las 21 tablas, **AUTORREPARA columnas faltantes** en BDs
   de deploys anteriores (information_schema → ALTER) y siembra todos los
   datos en bloques INDEPENDIENTES (si uno falla, los demás siguen).
   Un fallo de BD NO tumba la app, pero deja la web vacía: revisa
   `/api/health` y los logs si eso ocurre.

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

1. `https://tu-app.up.railway.app` → carga la tienda con hero, banner,
   catálogo y galería.
2. `https://tu-app.up.railway.app/api/health` → debe responder
   `"status": "ok"`, `"appVersion": "50.0.0"` (o superior) y conteos de
   tablas > 0 (productos: ~69, categorías: 6, galería: 4 categorías/16 fotos).
3. Admin: `/admin` → `admin@dulceencanto.com` / `DulceAdmin2026!`
   (cambia la contraseña y configura el correo de Zelle).

---

## 🔧 Solución de problemas

### "Application failed to respond"
1. Haz el **Paso 6b** (Custom Start Command manual).
2. **Deployments → abre el deploy → View Logs**:
   - Build falla → pega el error del log de build.
   - En runtime debes ver `🚀 DULCE ENCANTO — Arranque de producción` y
     `[ddl] ✓ 21 tablas verificadas`. Si no aparece, el start command
     no es el nuestro → Paso 6b.

### La web carga pero NO se ve NADA de la BD (ni hero, ni productos, ni galería)
Síntoma clásico de **BD vacía o sin columnas nuevas** (p. ej. deploys con
paquetes anteriores a V50). Diagnóstico en 10 segundos:

1. Abre `https://tu-app.up.railway.app/api/health`:
   - `"status": "degraded"` + counts en 0 → **BD vacía**: los seeds no
     corrieron. Mira los logs de arranque (`[ddl]`, `[dulce]`, `[config]`,
     `[catalogo]`, `[galeria]`); corrige la causa y **redeploya** — el
     arranque siembra solo.
   - `"missingColumns": [...]` → esta versión **las añade sola** al
     arrancar (autorreparación). Si persiste tras redeployar, añade
     `FORCE_SEED=1`, redeploya, y quítala después.
   - `"status": "error"` → revisa `DATABASE_URL` (Paso 4).
2. Verifica en el propio ZIP que desplegaste: abre `VERSION.txt` dentro
del paquete y comprueba que `appVersion` en `/api/health` coincide. Si no
coincide, Railway desplegó otro commit → fuerza redeploy del correcto.

En V50 el setup también arregla el fallo histórico de MySQL 8
(`sectionImages LONGTEXT DEFAULT ''` → error 1101) que dejaba la BD **sin
sembrar**: por eso en deploys anteriores no se veía nada de la BD.

### BD sin tablas
En los logs de runtime debe aparecer `node scripts/db-setup.mjs`.
- Si dice `Can't reach database server` → revisa `DATABASE_URL` (Paso 4).
  El host debe ser `mysql.railway.internal`.
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
