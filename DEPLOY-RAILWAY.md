# 🚀 Despliegue en Railway con MySQL — Dulce Encanto

Guía paso a paso para subir este zip a Railway.

---

## Cómo funciona este deploy (importante)

- **Fase de BUILD**: solo compila la app. **NO toca la base de datos**
  (el contenedor de build de Railway no tiene acceso a la red privada,
  por eso las tablas NO se crean en el build).
- **Arranque del servidor** (`scripts/start-railway.mjs`): crea las
  tablas con `prisma db push` (con reintentos hasta ~75s esperando a que
  MySQL esté listo) y ejecuta los seeds. Luego levanta el servidor web.
  - Primer arranque: tarda **~1-2 minutos extra** — es normal que la URL
    muestre "Application failed to respond" durante ese rato.
  - Arranques siguientes: casi instantáneo (todo se auto-omite si ya está).
  - Los seeds solo siembran si la BD está **vacía** — los redeploys no
    borran pedidos ni datos reales.

---

## Paso 1: Subir el código a GitHub

1. Crea un repositorio nuevo en GitHub (puede ser privado).
2. Extrae este zip y sube **todo su contenido** a ese repositorio
   (desde la web de GitHub: *Add file → Upload files*, o con git).
3. Verifica que se subió el archivo `.env.example` y la carpeta `scripts/`
   (en especial `scripts/start-railway.mjs`).

> No subas nunca un archivo `.env` real con contraseñas a GitHub.

---

## Paso 2: Crear el proyecto en Railway

1. Entra a [railway.app](https://railway.app) e inicia sesión.
2. **New Project → Deploy from GitHub repo**.
3. Elige el repositorio. Railway crea el servicio **Web**.

---

## Paso 3: Agregar MySQL

1. En el proyecto, **+ Create → Database → Add MySQL**.
2. Railway crea el servicio MySQL con su `DATABASE_URL` interna.

---

## Paso 4: Conectar la base de datos al servicio Web (¡CRÍTICO!)

1. Haz clic en el servicio **Web**.
2. **Variables → New Variable**.
3. Nombre: `DATABASE_URL` → pulsa **"Reference variable"** y selecciona la
   `DATABASE_URL` (o `MYSQL_URL`) del servicio **MySQL**.
   - Queda como: `${{MySQL.DATABASE_URL}}`
   - También funciona pegada a mano:
     `mysql://root:PASS@mysql.railway.internal:3306/railway`
   - ⚠️ Si la pegas a mano y Railway rota la contraseña, se rompe.
     Con "Reference variable" se actualiza sola.

---

## Paso 5: Agregar las variables restantes

En el servicio Web → Variables:

| Variable  | Valor |
|-----------|-------|
| `JWT_SECRET` | Cadena aleatoria larga (https://generate-secret.com o `openssl rand -hex 32`) |
| `NODE_ENV` | `production` |

---

## Paso 6: Deploy

1. **Deployments → Deploy latest commit**.
2. El build (~5-8 min) instala dependencias y compila **sin tocar la BD**.
3. Al terminar, Railway arranca el servidor → aquí se crean las tablas y
   se siembran los datos (~1-2 min la primera vez).
4. **Settings → Networking → Generate Domain** para obtener la URL.

---

## Paso 7: Verificar que todo quedó bien

1. `https://tu-app.up.railway.app` → debe cargar la tienda.
2. `https://tu-app.up.railway.app/api/seed` → debe responder:
   `"products": 56, "categories": 5, "admins": 1, "siteConfig": "configured"`.
3. Admin: `https://tu-app.up.railway.app/admin`
   - Email: `admin@dulceencanto.com`
   - Password: `DulceAdmin2026!`

> ⚠️ **Cambia la contraseña del admin** tras el primer login, y configura
> el **correo de Zelle** desde el panel (pagos USD desde el exterior).

---

## 🔧 Solución de problemas

### "Application failed to respond"
1. **Deployments** → abre el deploy → **View Logs**.
   - Si el BUILD falló: verás el error en la pestaña de build (p.ej.
     dependencias). Corrige y re-deploya.
   - Si el build está OK: mira los **logs de runtime**. En el primer
     arranque verás `[db] Intento 1/15...` — espera ~2 min. Si ves
     `[db] ⚠️ No se pudo conectar a la BD`, el problema es `DATABASE_URL`.
2. Espera 2-3 minutos: el primer arranque prepara la BD.

### La BD sigue sin tablas
`DATABASE_URL` mal configurada en el servicio **Web**. Repite el Paso 4.
Verifica en los logs de runtime que no aparezca `Can't reach database
server`. Comprueba también que la URL empiece por `mysql://` (no `mysql+pooled`).

### Error P1001 "Can't reach database server" en los logs de arranque
El host debe ser `mysql.railway.internal` (red privada) o el host público
que muestra Railway en las variables del MySQL. Usa "Reference variable".

### Login admin da "Error interno del servidor"
Falta `JWT_SECRET` en el servicio Web (Paso 5).

### Necesito re-sembrar todo desde cero
Agrega la variable `FORCE_SEED=1`, redeploya, espera el arranque, y luego
**elimina la variable** y redeploya de nuevo.

### Imágenes subidas por el admin desaparecen tras un redeploy
El filesystem de Railway es efímero. Las imágenes del repo no se pierden;
solo las subidas por el panel después del deploy. Súbelas al repo en
`public/products/` para que duren.

---

## Variables de entorno (resumen)

| Variable | Dónde | Valor |
|----------|-------|-------|
| `DATABASE_URL` | Web (referenciada del MySQL) | `${{MySQL.DATABASE_URL}}` |
| `JWT_SECRET` | Web | aleatorio largo |
| `NODE_ENV` | Web | `production` |
| `FORCE_SEED` | Web (opcional) | `1` solo para re-sembrar |
