# 🖥️ Despliegue en Hostinger (hPanel) con MySQL — Dulce Encanto

Guía paso a paso para subir este zip a Hostinger desde el hPanel.

> **Requisito**: un plan Hostinger con soporte Node.js (Business/Premium con
> "Node.js" en hPanel, o Cloud/VPS). Los planes solo-PHP no pueden ejecutar
> esta app Next.js.

---

## Paso 1: Crear la base de datos MySQL

1. hPanel → **Bases de datos MySQL** (o *Bases de datos → Gestión*).
2. **Crear nueva base de datos**:
   - Nombre: `dulce_encanto` (Hostinger lo prefija, p.ej. `u123456789_dulce`)
   - Usuario: anótalo (p.ej. `u123456789_admin`)
   - Contraseña: **anótala** (guárdala sin espacios raros si puedes)
3. El host de la BD en Hostinger es **localhost**, puerto **3306**.

---

## Paso 2: Subir el código

1. hPanel → **Archivos → Gestor de archivos**.
2. Entra a la carpeta donde vivirás la app. Recomendado:
   `domains/tudominio.com/app` (o la carpeta que te indique el gestor de Node.js).
3. Botón **Subir** → selecciona este zip → **Extraer aquí**.
4. Verifica que dentro quedaron `package.json`, `src/`, `prisma/`, `public/`, etc.

---

## Paso 3: Crear el archivo .env

En el Gestor de archivos, crea un archivo llamado `.env` en la raíz de la app
(al lado de `package.json`) con este contenido (ajusta tus datos):

```env
DATABASE_URL=mysql://USUARIO:CONTRASEÑA@localhost:3306/NOMBRE_BD
JWT_SECRET=pega-aqui-un-texto-largo-y-aleatorio
NODE_ENV=production
```

Ejemplo real:

```env
DATABASE_URL=mysql://u123456789_admin:M1%40Clave@localhost:3306/u123456789_dulce
JWT_SECRET=f4a9c8b2e71d43569a0bb3c2d8e1f7a9c5b3d2e8f1a7c9b4d6e3f5a2c8b0d7e9
NODE_ENV=production
```

### ⚠️ Si tu contraseña tiene símbolos, van URL-encoded:

| Símbolo | Escribir |
|---------|----------|
| `@` | `%40` |
| `#` | `%23` |
| `/` | `%2F` |
| `?` | `%3F` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| espacio | `%20` |

---

## Paso 4: Crear la app Node.js en hPanel

1. hPanel → **Avanzado → Node.js** (según plan puede estar en "Sitio web →
   Node.js" o similar).
2. **Create application**:
   - **Versión de Node**: 20 o superior (recomendado 20 o 22).
   - **Application root**: la carpeta donde extrajiste el zip (Paso 2).
   - **Application startup file**: `scripts/start-railway.mjs`
     *(mejor que server.js directo: fuerza bind 0.0.0.0 y prepara la BD — se creará después de subir el código)*.
   - **Modo producción**.
3. Guarda. Aún NO funcionará: falta instalar y compilar.

---

## Paso 5: Instalar, crear tablas y compilar

Abre una **terminal** (hPanel → "Terminal" / "SSH", o el botón "Run NPM
command" del gestor Node.js si existe). Ve a la carpeta de la app y ejecuta
en orden (cada comando puede tardar minutos):

```bash
npm install

# Crea todas las tablas en MySQL
npx prisma db push

# Genera el cliente de Prisma
npx prisma generate

# Siembra catálogo, servicios, promociones, galería y admin
npm run seed:all

# Compila la app para producción
npm run build
```

✅ Al terminar verás `✅ Postbuild completado`.

---

## Paso 6: Iniciar / Reiniciar la app

1. En hPanel → Node.js → tu aplicación → **Restart** (o Run).
2. El startup file `scripts/start-railway.mjs` levanta el servidor
   (fuerza bind 0.0.0.0 — el server.js directo puede crashear si el
   gestor define HOSTNAME — y prepara la BD en paralelo).
3. Abre tu dominio: `https://tudominio.com`

- Tienda: `https://tudominio.com`
- Admin: `https://tudominio.com/admin`
  - Email: `admin@dulceencanto.com`
  - Password: `DulceAdmin2026!`

> ⚠️ **Cambia la contraseña del admin** después del primer login.
> Y configura el **correo de Zelle** desde el admin (la tienda acepta Zelle
> USD desde el exterior y pago local en CUP).

---

## Si prefieres usar PM2 (VPS/Cloud o SSH)

```bash
cd ~/ruta/de/tu/app
npm install -g pm2
pm2 start ".next/standalone/server.js" --name dulce-encanto
pm2 save && pm2 startup
```

Con variables de entorno: crea el `.env` como en el Paso 3 y ejecuta
`pm2 start env-file .env ".next/standalone/server.js" --name dulce-encanto`.

---

## 🔧 Solución de problemas

### `npm run build` falla por memoria (plan compartido)
Compila en tu PC (con Node 20+ instalado): sube el zip a tu PC, ejecuta
`npm install && npm run build` (en Windows: `npm run build:win` no es
necesario, el build ya es multiplataforma) y luego sube por FTP/Gestor de
archivos la carpeta `.next` completa generada. Después `npm run seed:all`
contra la BD de Hostinger y reinicia la app.

### Error "P1001: Can't reach database server"
La `DATABASE_URL` está mal. Verifica usuario/contraseña (URL-encoded) y que
el host sea `localhost`.

### La app no arranca (502/passenger)
Confirma que el **startup file** sea `scripts/start-railway.mjs` y que la
carpeta `.next/standalone` exista (Paso 5 terminó bien). Reinicia la app.

### Necesito re-sembrar los datos desde cero
```bash
FORCE_SEED=1 npm run seed:all
```
⚠️ Esto **borra** productos/pedidos/configuración y deja los datos iniciales.

---

## Variables de entorno (resumen)

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `mysql://usuario:clave@localhost:3306/basededatos` |
| `JWT_SECRET` | texto aleatorio largo |
| `NODE_ENV` | `production` |
| `FORCE_SEED` | `1` solo para re-sembrar (quitar después) |
| `PORT` | lo asigna Hostinger automáticamente |
