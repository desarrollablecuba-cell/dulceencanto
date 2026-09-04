/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PROJECT ZIP — Empaquetador del proyecto Dulce Encanto listo para Railway
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Usado por /api/download (público) y /api/admin/download (requiere admin).
 *
 *  Qué hace:
 *   1. Copia solo el código fuente del proyecto (whitelist), nunca
 *      node_modules, .next, .git, upload/, download/, skills/, etc.
 *   2. Convierte imágenes PNG/JPG/JPEG/GIF de public/ a WebP con sharp
 *      (~70% más liviano) y actualiza las referencias en el código.
 *   3. FUERZA el schema de Prisma a MySQL (schema.mysql.prisma →
 *      schema.prisma) para que el ZIP siempre esté listo para Railway,
 *      sin importar el modo (sqlite/mysql) en que esté corriendo el server.
 *   4. Incluye TODOS los archivos de deploy: railway.json, Procfile,
 *      nixpacks.toml, scripts/start-railway.mjs, DEPLOY-RAILWAY.md, etc.
 *   5. Comprime con un writer ZIP puro en JS (zlib deflate) — no depende
 *      del binario `zip` del sistema (que no existe en el contenedor de
 *      Railway) y funciona igual en Node, Bun y Windows.
 */

import { deflateRawSync } from 'node:zlib';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';

// ─── Configuración del empaquetado ─────────────────────────────────────────

const PROJECT_ROOT = process.cwd();

/** Whitelist de archivos/directorios incluidos en el ZIP. */
const INCLUDE_PATHS = [
  // Código fuente
  'src',
  'prisma', // schema.mysql.prisma, schema.sqlite.prisma, migrations/
  'public', // assets estáticos e imágenes
  'data', // seeds JSON — db-setup.mjs lee data/scraped-products.json en Railway
  'scripts', // start-railway.mjs, db-setup.mjs, seeds, postbuild…
  // Configs de la app
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'components.json',
  'eslint.config.mjs',
  // Deploy Railway (CRÍTICOS para "Application failed to respond")
  'railway.json',
  'Procfile',
  'nixpacks.toml',
  'DEPLOY-RAILWAY.md',
  'README.md',
  '.env.example',
  '.gitignore',
  'bun.lock',
  'Caddyfile',
];

/** Extensiones de imagen que se convierten a WebP.
 *  IMPORTANTE: NUNCA incluir '.webp' aquí (sharp no puede usar el mismo
 *  archivo como entrada y salida). Este array se corrompió en versiones
 *  anteriores porque updateImageReferences reescribía sus propios literales
 *  de código — el regex ahora exige un carácter de nombre de archivo antes
 *  del punto, así que `'.png'` (literal de extensión) ya no coincide.
 */
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif'];
const WEBP_QUALITY = 80;

/** Extensiones de texto donde se actualizan referencias de imagen. */
const TEXT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.md'];

/** Archivos basura que nunca deben entrar al ZIP. */
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

export interface ProjectZipResult {
  ok: boolean;
  buffer?: Buffer;
  fileCount?: number;
  error?: string;
  version?: string;
}

// ─── Versionado V50+ (persistente, +1 por descarga) ─────────────────────
//
// El usuario pidió: "ponle V50 a partir de ahora a este .zip y luego vas
// aumentando con cada descarga". El contador vive en db/download-version.json
// (db/ NUNCA entra al ZIP ni al repo) y sobrevive a reinicios del server.

const VERSION_FILE = path.join(PROJECT_ROOT, 'db', 'download-version.json');
const VERSION_INICIAL = 50;
const HISTORIAL_MAX = 30;

interface VersionState {
  next: number;
  historial: { version: number; fecha: string; archivos: number; bytesZip: number }[];
}

async function readVersionState(): Promise<VersionState> {
  try {
    const st = JSON.parse(await fs.readFile(VERSION_FILE, 'utf-8'));
    if (typeof st.next === 'number' && st.next >= VERSION_INICIAL) return st as VersionState;
  } catch {
    // primera vez o archivo corrupto → empezar en V50
  }
  return { next: VERSION_INICIAL, historial: [] };
}

async function writeVersionState(st: VersionState): Promise<void> {
  await fs.mkdir(path.dirname(VERSION_FILE), { recursive: true });
  await fs.writeFile(VERSION_FILE, JSON.stringify(st, null, 2), 'utf-8');
}

// Serializa las descargas: cada una recibe SU número (V50, V51, …) sin carreras.
let downloadLock: Promise<unknown> = Promise.resolve();

/**
 * Estadísticas de descargas para el panel admin (V52.3):
 * próxima versión pendiente + historial de paquetes servidos.
 * Solo lectura — no consume versiones ni toca el lock.
 */
export async function readDownloadStats(): Promise<{
  pendingVersion: number;
  totalDownloads: number;
  lastDownloadAt: string | null;
  history: { version: number; fecha: string; archivos: number; bytesZip: number }[];
}> {
  const st = await readVersionState();
  return {
    pendingVersion: st.next,
    totalDownloads: st.historial.length,
    lastDownloadAt: st.historial.length > 0 ? st.historial[0].fecha : null,
    history: st.historial.slice(0, 12),
  };
}

// ─── Writer ZIP puro en JavaScript (deflate) ────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string; // ruta POSIX relativa
  data: Buffer;
  mtime: Date;
}

function dosDateTime(d: Date): { time: number; date: number } {
  const time =
    (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const year = Math.max(d.getFullYear(), 1980);
  const date = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/**
 * Construye un archivo ZIP en memoria (method 8 = deflate, con fallback a
 * store si deflate no reduce). Soporta nombres UTF-8 y hasta 65535 archivos.
 */
export function buildZipBuffer(entries: ZipEntry[]): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf-8');
    const crc = crc32(entry.data);
    const deflated = deflateRawSync(entry.data, { level: 9 });
    const useDeflate = deflated.length < entry.data.length;
    const payload = useDeflate ? deflated : entry.data;
    const method = useDeflate ? 8 : 0;
    const { time, date } = dosDateTime(entry.mtime);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18); // compressed size
    local.writeUInt32LE(entry.data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    localChunks.push(local, nameBuf, payload);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0x0800, 8); // flags: UTF-8
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(entry.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra length
    cd.writeUInt16LE(0, 32); // comment length
    cd.writeUInt16LE(0, 34); // disk number start
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attrs: file 0644
    cd.writeUInt32LE(offset, 42); // local header offset
    centralChunks.push(cd, nameBuf);

    offset += 30 + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16); // central dir offset
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localChunks, centralBuf, eocd]);
}

// ─── Helpers de empaquetado ────────────────────────────────────────────────

/** Copia recursiva multiplataforma (sin cp -r de shell). */
async function copyPath(rel: string, tmpDir: string): Promise<boolean> {
  const srcPath = path.join(PROJECT_ROOT, rel);
  const destPath = path.join(tmpDir, rel);
  try {
    await fs.access(srcPath);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.cp(srcPath, destPath, { recursive: true, force: true });
    return true;
  } catch {
    return false; // el path no existe → se omite
  }
}

/** Convierte recursivamente PNG/JPG/JPEG/GIF → WebP y borra el original. */
async function convertImagesToWebp(dir: string): Promise<number> {
  let converted = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      converted += await convertImagesToWebp(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) continue;

    // Un .webp ya convertido nunca debe tocarse (evita sobrescribirse a sí mismo)
    const webpPath = fullPath.slice(0, -ext.length) + '.webp';
    if (webpPath === fullPath) continue; // defensa extra
    try {
      await sharp(fullPath).webp({ quality: WEBP_QUALITY }).toFile(webpPath);
      if (webpPath !== fullPath) await fs.unlink(fullPath);
      converted++;
    } catch (err) {
      // Si falla la conversión, conservar el original
      console.error(`[project-zip] No se pudo convertir ${entry.name}:`, err);
    }
  }
  return converted;
}

/** Actualiza referencias de imagen .png/.jpg/.jpeg/.gif → .webp en archivos de texto.
 *
 *  ⚠️ REGEX BLINDADO: exige un carácter de nombre de archivo ANTES del punto
 *  (y usa \x60 para el backtick), de modo que los literales de extensión del
 *  propio código (como '.png' dentro de IMAGE_EXTENSIONS) NUNCA se
 *  reescriban. En versiones anteriores el regex aceptaba el punto en
 *  cualquier posición, coincidía con el literal de extensión y corrompía
 *  este mismo archivo al empaquetarlo (IMAGE_EXTENSIONS terminó lleno de
 *  '.webp' en los ZIP V51/V52, matando la conversión PNG/JPG→WebP).
 */
async function updateImageReferences(dir: string): Promise<number> {
  let updated = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      updated += await updateImageReferences(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;

    // Nunca reescribir este archivo (autocorrupción histórica)
    if (entry.name === 'project-zip.ts') continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.includes(ext)) continue;

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      // El grupo 1 exige un carácter de filename antes del punto: "foto.png'"
      // sí coincide, pero el literal "'.png'" no (antes del punto hay una comilla).
      // (\x60 = backtick: evita confusiones con template literals)
      const next = content.replace(
        /([A-Za-z0-9_\-\/])\.(png|jpe?g|gif)(['"\x60)])/gi,
        '$1.webp$3'
      );
      if (next !== content) {
        await fs.writeFile(fullPath, next, 'utf-8');
        updated++;
      }
    } catch {
      // binario o ilegible → ignorar
    }
  }
  return updated;
}

/**
 * FUERZA el schema Prisma del ZIP al modo MySQL (listo para Railway).
 * Así el ZIP sirve aunque el server esté corriendo en modo SQLite.
 */
async function forceMysqlSchema(tmpDir: string): Promise<boolean> {
  const mysqlSchema = path.join(tmpDir, 'prisma', 'schema.mysql.prisma');
  const target = path.join(tmpDir, 'prisma', 'schema.prisma');
  try {
    const content = await fs.readFile(mysqlSchema, 'utf-8');
    await fs.writeFile(target, content, 'utf-8');
    return true;
  } catch {
    // schema.mysql.prisma no existe (deploy histórico) → dejar el actual
    return false;
  }
}

/** Recolecta recursivamente todos los archivos del directorio temporal. */
async function collectFiles(
  dir: string,
  baseDir: string = dir
): Promise<ZipEntry[]> {
  const out: ZipEntry[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (SKIP_FILES.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(fullPath, baseDir)));
    } else if (entry.isFile()) {
      try {
        const data = await fs.readFile(fullPath);
        const rel = path.relative(baseDir, fullPath).split(path.sep).join('/');
        out.push({ name: rel, data, mtime: new Date() });
      } catch {
        // ilegible → omitir
      }
    }
  }
  return out;
}

// ─── Verificación anti-staleness (garantía de "código real de la última versión") ───
//
// Cada ZIP se autoverifica ANTES de servirse: si falta cualquiera de estos
// archivos (o el contenido esperado), la descarga FALLA con error claro en
// vez de entregar un paquete viejo incompleto.

const REQUIRED_LATEST: [string, RegExp?][] = [
  // V52.9 — Editor de Servicios dos vistas (lista con preview + detalle) + Galería sección propia
  ['src/components/ecommerce/admin/ServicesCatalog.tsx', /ServicesCatalog/],
  ['src/components/ecommerce/admin/ServicesCatalog.tsx', /Vista en tienda/],
  ['src/components/ecommerce/admin/GalleryTab.tsx', /GalleryTab/],
  ['src/components/ecommerce/admin/GalleryTab.tsx', /Fotos de eventos reales/],
  ['src/components/ecommerce/AdminPanel.tsx', /case 'gallery': return <GalleryTab \/>/],
  ['src/components/ecommerce/AdminPanel.tsx', /goGallery/],
  ['scripts/seed-gallery-v529.ts', /seed-gallery-v529|gal-15anos-1/],
  ['public/gallery/gal-15anos-1.webp'],
  ['public/gallery/gal-ninos-1.webp'],
  ['public/gallery/gal-bodas-1.webp'],
  // V52.8 — Moneda fija por canal (USD reservables / CUP directa) + buffet por docena
  // + Servicios como sección propia del admin + reserva de eventos ampliada
  ['src/store/currency-store.ts', /isDirectSaleProduct\(_p\)\s*\?\s*'CUP'\s*:\s*'USD'/],
  ['src/components/ecommerce/CatalogView.tsx', /moneda fija por canal/],
  ['src/components/ecommerce/CatalogView.tsx', /buffetPriceUsd/],
  ['src/components/ecommerce/ProductDetail.tsx', /isBuffetMode/],
  ['src/components/ecommerce/EventReservationModal.tsx', /buffetUsd/],
  ['src/components/ecommerce/EventReservationModal.tsx', /Tu evento/],
  ['src/components/ecommerce/AdminPanel.tsx', /function ServicesTab/],
  ['src/components/ecommerce/AdminPanel.tsx', /buffetPriceUsd/],
  ['src/components/ecommerce/AdminPanel.tsx', /formIsDirect/],
  ['src/app/api/admin/products/route.ts', /buffetPriceUsd/],
  ['src/app/api/admin/products/[id]/route.ts', /buffetPriceUsd/],
  ['scripts/schema-mysql.sql', /`buffetPriceUsd` DOUBLE NOT NULL DEFAULT 30/],
  ['scripts/db-setup.mjs', /buffetPriceUsd/],
  ['src/components/ecommerce/AIAssistant.tsx', /bottom-\[88px\]/],
  ['src/app/globals.css', /bottom: 152px/],
  // V52.7 — Carrito USD + no mezclar canales + admin stock + reservas con antelación + tickets
  ['src/store/cart-store.ts', /saleMode/],
  ['src/store/cart-store.ts', /cartCurrency/],
  ['src/components/ecommerce/CartSidebar.tsx', /Pedido RESERVABLE/],
  ['src/components/ecommerce/CheckoutForm.tsx', /cartCurrency/],
  ['src/components/ecommerce/ProductDetail.tsx', /productSaleMode/],
  ['src/components/ecommerce/CatalogView.tsx', /saleMode/],
  ['src/components/ecommerce/AdminPanel.tsx', /Venta Directa — Control de Stock/],
  ['src/components/ecommerce/AdminPanel.tsx', /saveStock/],
  ['src/components/ecommerce/EventReservationModal.tsx', /maxLeadDays/],
  ['src/components/ecommerce/EventReservationModal.tsx', /ProductPickerGrid/],
  ['src/app/api/event-reservations/route.ts', /maxLeadDaysFor/],
  ['src/app/api/event-reservations/[id]/route.ts', /PATCH/],
  ['src/components/ecommerce/admin/EventReservationsTab.tsx', /printTicket/],
  ['src/components/ecommerce/admin/EventReservationsTab.tsx', /Ticket80mm/],
  ['src/components/ecommerce/admin/EventReservationsTab.tsx', /TicketCarta/],
  ['scripts/db-setup.mjs', /migrarV527RenombrarCategoria/],
  ['scripts/schema-mysql.sql', /`leadDays` INTEGER NOT NULL DEFAULT 0/],
  ['scripts/schema-mysql.sql', /EventReservationItem[\s\S]*`image` LONGTEXT/],
  // V52.6 — Buffet para Repartir (canales de venta por producto) + Por Docena
  ['src/app/api/products/route.ts', /buffetEnabled/],
  ['src/components/ecommerce/CatalogView.tsx', /Buffet para Repartir/],
  ['src/components/ecommerce/CatalogView.tsx', /Por Docena/],
  ['src/components/ecommerce/ProductCard.tsx', /Por Docena/],
  ['src/components/ecommerce/ProductDetail.tsx', /Precio por docena/],
  ['src/components/ecommerce/AdminPanel.tsx', /buffetEnabled/],
  ['src/app/api/admin/products/route.ts', /directSaleEnabled/],
  ['src/components/ecommerce/MobileNavDock.tsx', /SIEMPRE visible/],
  ['src/components/ecommerce/Header.tsx', /Secciones de la tienda/],
  ['scripts/db-setup.mjs', /migrarV526Canales/],
  ['scripts/schema-mysql.sql', /`buffetEnabled` BOOLEAN NOT NULL DEFAULT false/],
  // V52.5 — Compresión de imágenes EN EL CLIENTE (fix del 502 con fotos 8MB+)
  ['src/lib/compress-image.ts', /compressImageFile/],
  ['src/lib/image-upload.ts', /compressImageFile/],
  ['src/components/ecommerce/SectionManagers.tsx', /compressImageFile/],
  // V52.5 — Variantes de servicios (schema + lib + admin + tienda + reservas)
  ['src/lib/service-variants.ts', /parseServiceVariants/],
  ['src/app/api/services/route.ts', /parseServiceVariants/],
  ['src/app/api/admin/services/route.ts', /serializeServiceVariants/],
  ['src/components/ecommerce/ServicesSection.tsx', /selVariantId/],
  ['src/components/ecommerce/EventReservationModal.tsx', /selectedVariants/],
  ['public/services/srv-munecos-real.webp'],
  ['public/services/srv-canon-real.webp'],
  ['public/services/srv-vela-real.webp'],
  ['public/services/srv-sublimacion-real.webp'],
  ['public/services/srv-jarras-real.webp'],
  ['public/services/srv-vari-conejo-chispa.webp'],
  ['public/services/srv-vari-coneja-maricusa.webp'],
  // V52.5 — PWA prompt solo en móvil
  ['src/components/ecommerce/PWAInstallPrompt.tsx', /isMobileDevice/],
  // V52.4 — Rutas de subida de imágenes RECONSTRUIDAS (se perdieron del V51):
  // helper compartido con sharp → WebP + espejo standalone para Railway
  ['src/lib/admin-upload.ts', /handleAdminImageUpload/],
  ['src/app/api/admin/products/upload/route.ts', /handleAdminImageUpload/],
  ['src/app/api/admin/categories/upload/route.ts', /handleAdminImageUpload/],
  ['src/app/api/admin/gallery/upload/route.ts', /handleAdminImageUpload/],
  ['src/app/api/admin/sections/upload/route.ts', /handleAdminImageUpload/],
  ['src/app/api/admin/services/upload/route.ts', /handleAdminImageUpload/],
  // V52.3 — Centro de descargas del admin (stats API + card del Dashboard)
  ['src/app/api/admin/download/stats/route.ts', /readDownloadStats/],
  // V52.3 — Botón flotante "volver arriba" + scrollbar elegante
  ['src/components/ecommerce/ScrollToTop.tsx', /scroll-top-fab/],
  ['src/app/globals.css', /\.nice-scroll/],
  // V52 — Servicios con foto protagonista (cards verticales)
  ['src/components/ecommerce/ServicesSection.tsx', /aspectRatio[^,]*3[^,]*4/],
  ['src/app/api/admin/services/route.ts'],
  ['scripts/seed-extras.ts', /\/services\/srv-/],
  ['public/services/srv-sublimacion.webp'],
  ['public/services/srv-munecos.webp'],
  ['data/seed-special-dates.json', /"combos"/],
  // V52 — Promociones: card de promoción con combos multi-producto dentro
  ['src/components/ecommerce/PromotionsSection.tsx', /SpecialDateComboCfg/],
  ['src/lib/special-dates.ts', /SpecialDateCombo/],
  // Galería v2 (portadas + carrusel + lightbox) — API y frontend
  ['src/components/ecommerce/GallerySection.tsx'],
  ['src/app/api/admin/gallery/route.ts'],
  ['src/app/api/admin/gallery/photos/route.ts'],
  ['scripts/seed-gallery.ts'],
  ['prisma/migrations/20260903000001_gallery_categories/migration.sql'],
  // Secciones con imagen configurable
  ['src/lib/section-images.ts'],
  // Dock móvil + fixes de consola
  ['src/components/ecommerce/MobileNavDock.tsx'],
  ['src/components/ServiceWorkerCleaner.tsx'],
  // Diagnóstico Railway
  ['src/app/api/health/route.ts'],
  // Deploy
  ['scripts/db-setup.mjs', /verificarColumnasCriticas/],
  ['scripts/db-setup.mjs', /sembrarV52Combos/],
  ['scripts/start-railway.mjs'],
  ['scripts/schema-mysql.sql', /ADD COLUMN `section` VARCHAR\(191\)/],
  ['prisma/migrations/20260903000000_add_category_section/migration.sql'],
  ['data/scraped-products.json'],
  ['data/seed-siteconfig.json'],
  ['railway.json'],
  ['nixpacks.toml'],
  ['Procfile'],
  ['DEPLOY-RAILWAY.md'],
];

/** Verifica que las entradas del ZIP contengan el código de la última versión. */
function verifyLatestCode(entries: ZipEntry[], versionNumber: number): string[] {
  const map = new Map(entries.map((e) => [e.name, e.data]));
  const problems: string[] = [];

  for (const [name, re] of REQUIRED_LATEST) {
    const data = map.get(name);
    if (!data) {
      problems.push(`falta ${name}`);
      continue;
    }
    if (re && !re.test(data.toString('utf-8'))) {
      problems.push(`${name} no contiene el código esperado (¿versión vieja?)`);
    }
  }

  // El schema embebido debe ser el MySQL COMPLETO (galería v2 + secciones + variantes V52.5 + canales V52.6)
  const schema = map.get('prisma/schema.prisma')?.toString('utf-8') ?? '';
  const schemaChecks: [string, RegExp][] = [
    ['model GalleryCategory', /model\s+GalleryCategory\s*\{/],
    ['model GalleryPhoto', /model\s+GalleryPhoto\s*\{/],
    ['sectionImages (SiteConfig)', /sectionImages\s+String\s+@db\.LongText/],
    ['section (Category)', /section\s+String\s+@default\("ambas"\)/],
    ['variants (Service V52.5)', /variants\s+String\s+@db\.LongText\s+@default\("\[\]"\)/],
    ['buffetEnabled (Product V52.6)', /buffetEnabled\s+Boolean\s+@default\(false\)/],
    ['directSaleEnabled (Product V52.6)', /directSaleEnabled\s+Boolean\s+@default\(true\)/],
    ['buffetPriceUsd (Product V52.8)', /buffetPriceUsd\s+Float\s+@default\(30\)/],
    ['leadDays (EventReservation V52.7)', /leadDays\s+Int\s+@default\(0\)/],
    ['image (EventReservationItem V52.7)', /image\s+String\s+@db\.LongText\s+@default\(""\)/],
  ];
  for (const [label, re] of schemaChecks) {
    if (!re.test(schema)) problems.push(`prisma/schema.prisma sin ${label}`);
  }

  // El DDL debe reparar BDs antiguas y NO tener LONGTEXT con default sin paréntesis
  const ddl = map.get('scripts/schema-mysql.sql')?.toString('utf-8') ?? '';
  if (ddl && !ddl.includes("`sectionImages` LONGTEXT NOT NULL DEFAULT ('')")) {
    problems.push('schema-mysql.sql sin sectionImages en CREATE SiteConfig (DEFAULT parentizado)');
  }
  if (ddl && /LONGTEXT[^,\n]*DEFAULT\s+'[^']*'\s*(?=[,\n])/.test(ddl)) {
    problems.push('schema-mysql.sql con LONGTEXT DEFAULT sin paréntesis (error 1101 en MySQL 8)');
  }

  // package.json debe llevar la versión del paquete (la muestra /api/health)
  try {
    const pkg = JSON.parse(map.get('package.json')?.toString('utf-8') || '{}');
    if (pkg.version !== `${versionNumber}.0.0`) {
      problems.push(`package.json version=${pkg.version} != ${versionNumber}.0.0`);
    }
  } catch {
    problems.push('package.json ilegible en el paquete');
  }

  return problems;
}

function fingerprintOf(entries: ZipEntry[]): string {
  const hash = createHash('sha256');
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  for (const e of sorted) hash.update(`${e.name}:${e.data.length}\n`);
  return hash.digest('hex');
}

// ─── API principal ─────────────────────────────────────────────────────────

export interface CreateProjectZipOptions {
  /** Objeto JSON que se incrusta como DOWNLOAD-MANIFEST.json dentro del ZIP. */
  manifest?: Record<string, unknown>;
  /** Prefijo del nombre sugerido del archivo. Default: dulce-encanto */
  filenamePrefix?: string;
  /** Si es false, genera el paquete SIN consumir el número de versión
   *  (para sondeos/QA: /api/download?dryRun=1). El ZIP usa el número que
   *  tocaría, pero el contador no avanza ni se registra en el historial. */
  consumeVersion?: boolean;
}

export interface ProjectZipSuccess extends ProjectZipResult {
  buffer: Buffer;
  fileCount: number;
  filename: string;
  version: string;
  versionNumber: number;
}

/**
 * Genera el ZIP del proyecto (en memoria) listo para subir a Railway.
 * Nunca lanza: devuelve { ok: false, error } en caso de fallo.
 *
 * Cada llamada recibe un número de versión correlativo (V50, V51, …) y el
 * paquete se AUTOVERIFICA antes de servirse (verifyLatestCode), de modo que
 * es imposible entregar un paquete sin el código de la última versión.
 */
export async function createProjectZip(
  options: CreateProjectZipOptions = {}
): Promise<ProjectZipSuccess | ProjectZipResult> {
  // Serializa descargas concurrentes para que cada una reciba su V única.
  const run = downloadLock.then(() => buildProjectZip(options));
  downloadLock = run.catch(() => {});
  return run;
}

async function buildProjectZip(
  options: CreateProjectZipOptions
): Promise<ProjectZipSuccess | ProjectZipResult> {
  const state = await readVersionState();
  const versionNumber = state.next;
  const version = `V${versionNumber}`;
  const tmpDir = path.join(os.tmpdir(), `dulce-zip-${randomUUID().slice(0, 8)}`);

  try {
    await fs.mkdir(tmpDir, { recursive: true });

    const consume = options.consumeVersion !== false; // default: true

    // 1. Copiar whitelist (código REAL del proyecto en este instante)
    let copied = 0;
    for (const p of INCLUDE_PATHS) {
      if (await copyPath(p, tmpDir)) copied++;
    }
    if (copied === 0) {
      return { ok: false, error: 'No se encontró ningún archivo del proyecto para empaquetar.' };
    }

    // 2. Convertir imágenes pesadas a WebP + actualizar referencias
    try {
      const publicTmp = path.join(tmpDir, 'public');
      await fs.access(publicTmp);
      const imgCount = await convertImagesToWebp(publicTmp);
      if (imgCount > 0) {
        console.log(`[project-zip] ${imgCount} imágenes convertidas a WebP`);
        for (const dir of ['src', 'data', 'scripts']) {
          await updateImageReferences(path.join(tmpDir, dir));
        }
      }
    } catch {
      // best-effort
    }

    // 3. Forzar schema Prisma → MySQL (deploy Railway)
    const schemaForced = await forceMysqlSchema(tmpDir);
    console.log(
      `[project-zip] Schema Prisma en el ZIP: ${schemaForced ? 'MySQL (forzado para Railway)' : 'el presente en el servidor'}`
    );

    // 4. Estampar la versión en package.json del paquete (la muestra /api/health)
    try {
      const pkgPath = path.join(tmpDir, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      pkg.version = `${versionNumber}.0.0`;
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
    } catch {
      // best-effort (la verificación final lo detectaría)
    }

    // 5. Recolectar y comprimir (writer JS puro — sin binario zip)
    const codeEntries = await collectFiles(tmpDir);
    if (codeEntries.length === 0) {
      return { ok: false, error: 'El empaquetado no produjo ningún archivo.' };
    }

    // 6. Fingerprint + VERSION.txt + DOWNLOAD-MANIFEST.json como entradas extra
    const fingerprint = fingerprintOf(codeEntries);
    const generatedAt = new Date().toISOString();
    const uncompressedBytes = codeEntries.reduce((n, e) => n + e.data.length, 0);

    const manifest = {
      ...(options.manifest ?? {}),
      project: 'dulce-encanto',
      packageVersion: version,
      appVersion: `${versionNumber}.0.0`,
      generatedAt,
      fileCount: codeEntries.length,
      uncompressedBytes,
      sha256Fingerprint: fingerprint,
      source: 'Código REAL del sandbox en el momento de la descarga (sin caché)',
      verifyInDeploy: `Abre /api/health en Railway → appVersion debe ser "${versionNumber}.0.0"`,
    };

    const versionTxt = [
      '════════════════════════════════════════════════════════════',
      ' DULCE ENCANTO — PAQUETE DE DESPLIEGUE (Railway MySQL)',
      '════════════════════════════════════════════════════════════',
      `Versión del paquete : ${version}`,
      `Versión de la app   : ${versionNumber}.0.0 (package.json)`,
      `Generado            : ${generatedAt} (UTC)`,
      `Archivos incluidos  : ${codeEntries.length}`,
      `Tamaño (sin comprimir): ${(uncompressedBytes / 1024 / 1024).toFixed(1)} MB`,
      `Fingerprint SHA-256 : ${fingerprint}`,
      'Fuente              : código REAL del proyecto al generar el ZIP',
      '',
      'CÓMO COMPROBAR QUE DEPLOYASTE ESTA VERSIÓN',
      ' 1. Abre  https://TU-APP.up.railway.app/api/health',
      ` 2. Debe mostrar  "appVersion": "${versionNumber}.0.0"  y  "status": "ok"`,
      ' 3. Si los counts de tables salen en 0 o status=error, lee el campo',
      '    "hint" del JSON y los logs de arranque en Railway',
      '    ([ddl]/[dulce]/[config]/[catalogo]/[galeria]).',
      '',
      'ESTE PAQUETE INCLUYE LA ÚLTIMA VERSIÓN DEL CÓDIGO (V52):',
      ' - NUEVO (V52.9) ⭐ EDITOR DE SERVICIOS RENOVADO (dos vistas, como',
      '   Productos): la sección “✨ Servicios” lista cada servicio en CARDS',
      '   con su FOTO real + detalles principales (categoría, precio USD,',
      '   variantes, estado, orden) y buscador con filtros por categoría.',
      '   Al entrar en un servicio se abre el EDITOR DETALLADO a pantalla',
      '   completa: pestañas Información / Variantes / «Vista en tienda»',
      '   (previsualiza la card pública tal y como la ve el cliente), barra',
      '   superior con Volver·Cancelar·Guardar y foto protagonista grande',
      '   con subida comprimida (8MB sin error 502).',
      ' - NUEVO (V52.9) ⭐ GALERÍA DE EVENTOS = SECCIÓN PROPIA DEL ADMIN:',
      '   el menú lateral tiene “🖼️ Galería” al nivel de Productos/Servicios',
      '   (antes estaba escondida en Ajustes → Secciones). Lista de',
      '   categorías con portada + nº de fotos y, al entrar en una, editor',
      '   completo: datos de la categoría (nombre, icono, descripción,',
      '   portada, visibilidad) y gestor de FOTOS con agregar varias de',
      '   golpe (con barra de progreso), EDITAR título y descripción,',
      '   REEMPLAZAR la imagen, ocultar sin borrar, reordenar y eliminar.',
      '   Incluye 12 fotos realistas de demo (fiestas de 15, cumpleaños',
      '   infantiles, de adultos y bodas) sembradas con',
      '   scripts/seed-gallery-v529.ts — bórralas desde el admin y sube las',
      '   tuyas reales.',
      ' - NUEVO (V52.8) ⭐ PRECIOS EN USD EN TODAS PARTES (excepto Venta',
      '   Directa en CUP): los productos RESERVABLES se muestran SIEMPRE en',
      '   $ USD (admin, catálogo, buscador, más vendidos y carrito), sin',
      '   importar el toggle de moneda. En el ADMIN, el editor de productos',
      '   carga/guarda el precio en la MONEDA DEL CANAL: los reservables se',
      '   editan en USD (badge morado “📅 Por reserva: precios en $ USD” +',
      '   conversión ≈ CUP en vivo) y los de venta directa en ₡ CUP (badge',
      '   verde). Los pedidos del admin se muestran en ₡ CUP (como se',
      '   guardan en BD). FIX: la flecha “volver arriba” ya NO se solapa con',
      '   el botón de WhatsApp (quedaron apilados en ambos tamaños).',
      ' - NUEVO (V52.8) ⭐ BUFFET PARA REPARTIR POR DOCENA: el buffet se',
      '   vende POR DOCENA en $USD igual que los dulces finos. Precio por',
      '   defecto: 30 USD la docena (columna buffetPriceUsd, se ajusta por',
      '   producto en el admin → pestaña Disponibilidad → “Precio del',
      '   Buffet — por docena”). En Reservas, la card y el detalle muestran',
      '   $30.00/docena con la etiqueta 🍬 y el ítem entra al carrito como',
      '   “— Docena”. La reserva de eventos también lo cotiza por docena.',
      ' - NUEVO (V52.8) ⭐ SERVICIOS = SECCIÓN PROPIA DEL ADMIN: el menú',
      '   lateral tiene “✨ Servicios” al nivel de Productos (antes estaba',
      '   escondido en Ajustes → Secciones). Página con encabezado, chips',
      '   informativos y el CRUD completo con variantes y fotos.',
      ' - NUEVO (V52.8) ⭐ RESERVA DE EVENTOS RE-DISEÑADA: modal ENORME',
      '   (max-w-6xl, casi pantalla completa) que APROVECHA las pantallas:',
      '   en desktop, panel lateral “Tu evento” SIEMPRE visible con las',
      '   miniaturas, cantidades, antelación y total en vivo; los SERVICIOS',
      '   se eligen con su FOTO REAL en cards visuales (antes solo emoji);',
      '   el buffet cotiza por docena; en móvil, mini-resumen en vivo en el',
      '   pie. Flujo mucho más fácil para los clientes.',
      ' - NUEVO (V52.7) ⭐ CARRITO EN USD (excepto Venta Directa en CUP): los',
      '   productos RESERVABLES se muestran y venden en $ USD; los de VENTA',
      '   DIRECTA siempre en ₡ CUP. El carrito muestra un banner del canal y',
      '   NO permite mezclar venta directa con reservables en un mismo',
      '   pedido (aviso claro al intentarlo, en todas las vías de compra).',
      ' - NUEVO (V52.7) ⭐ ADMIN — CATEGORÍA “VENTA DIRECTA” CON CONTROL DE',
      '   STOCK: en Productos hay un segmento 🛒 Venta Directa (stock ₡) que',
      '   abre la tabla de stock con edición INLINE (−/+ e input, se guarda',
      '   con Enter/al salir, feedback verde). El segmento 📅 Por Reserva',
      '   muestra el catálogo reservable en cards con su antelación. El',
      '   resto de las categorías son POR RESERVA por definición.',
      ' - NUEVO (V52.7) La categoría “Dulces Finos y Buffet” se llama ahora',
      '   SOLO “Buffet para Repartir” (los dulces finos van en su categoría',
      '   aparte). La migración v52.7 la renombra una sola vez en Railway.',
      ' - NUEVO (V52.7) ⭐ RESERVA DE EVENTOS COMPLETA: al reservar un evento',
      '   el cliente elige TODOS los productos y servicios RESERVABLES',
      '   (tortas, pasteles, cakes, dulces finos y el Buffet para Repartir)',
      '   con buscador, chips por categoría y grid visual con fotos. La',
      '   FECHA respeta la ANTELACIÓN: la más cercana disponible se calcula',
      '   desde hoy + el MAYOR tiempo de antelación de los productos del',
      '   pedido (ej: pastel de 2 pisos 7 días + dulces finos 2 días →',
      '   mínimo 7 días). El servidor valida la antelación al recibir la',
      '   reserva (error 400 si no cumple).',
      ' - NUEVO (V52.7) ⭐ VISTA AMPLIADA DE EVENTOS EN EL CALENDARIO DEL',
      '   ADMIN: el detalle muestra todos los productos y servicios con',
      '   MINIATURAS de foto (de cada servicio, producto o su variante),',
      '   datos completos, notas y totales en USD. El estado ahora SÍ se',
      '   persiste (PATCH /api/event-reservations/:id: confirmar/completar/',
      '   cancelar) y hay botón de escribir al cliente por WhatsApp.',
      ' - NUEVO (V52.7) ⭐ TICKET IMPRIMIBLE DEL EVENTO en DOS formatos:',
      '   🧾 80mm (impresora térmica de recibos) y 📄 Hoja Carta (detallada',
      '   con miniaturas y firma). Botones dentro del detalle del evento.',
      ' - NUEVO (V52.6) ⭐ ETIQUETA “POR DOCENA” EN LOS DULCES FINOS: las',
      '   cards de los dulces finos muestran desde fuera la etiqueta',
      '   “🍬 Por Docena” (sobre la foto + “/ docena” junto al precio y',
      '   “Precio por docena (12 unidades)” en el detalle), para que quede',
      '   claro que el precio es por la docena.',
      ' - NUEVO (V52.6) ⭐ CATEGORÍA “BUFFET PARA REPARTIR” EN RESERVAS:',
      '   dentro de Reservas aparece el grupo destacado “Buffet para',
      '   Repartir” con LOS MISMOS PRODUCTOS de la Venta Directa (para',
      '   repartir en eventos). Al editar un producto en el admin, la',
      '   pestaña Disponibilidad tiene el selector “¿Dónde estará disponible',
      '   este producto?” con casillas 🛒 Venta Directa y 🍽️ Buffet para',
      '   Repartir. En BDs existentes la migración marca como buffet a los',
      '   productos que hoy se ven en Venta Directa (una sola vez, nunca',
      '   pisa cambios posteriores del admin).',
      ' - NUEVO (V52.6) La BARRA FLOTANTE MÓVIL ahora es SIEMPRE VISIBLE',
      '   (antes solo aparecía al final de la página): los clientes pueden',
      '   saltar de inmediato a Inicio, Venta Directa, Reservas, Servicios,',
      '   Promos o Galería desde cualquier punto. El MENÚ LATERAL (hamburguesa)',
      '   también incluye ahora las mismas secciones de la barra flotante,',
      '   agrupadas bajo “Secciones de la tienda” y con la sección activa',
      '   resaltada.',
      ' - NUEVO (V52.5) ⭐ VARIANTES DE SERVICIOS: cada servicio puede tener',
      '   variantes con FOTO y nombre propios (ej: Muñeco Sorpresa →',
      '   Payasita, Conejo Chispa, Coneja Maricusa). En el admin un toggle',
      '   “Servicio con variantes” activa el editor; en la tienda la card',
      '   muestra el badge “🎭 N variantes”, el modal tiene selector con',
      '   fotos y el modal de RESERVA deja elegir la variante al añadir el',
      '   servicio (el ítem de la reserva guarda “Servicio — Variante”).',
      ' - NUEVO (V52.5) ⭐ COMPRESIÓN DE IMÁGENES EN EL CLIENTE (fix del',
      '   error 502): las fotos de móvil modernas (8–12 MB) se comprimen',
      '   automáticamente EN EL NAVEGADOR antes de subir (borde 1600px,',
      '   WebP ~800KB, calidad adaptativa). Aplica a TODAS las subidas del',
      '   admin: servicios, variantes, galería, secciones, categorías y',
      '   productos. El límite del servidor subió a 25MB como red de',
      '   seguridad y ya NO se rechazan fotos por peso.',
      ' - NUEVO (V52.5) Precios de Servicios SOLO EN USD en el admin: el',
      '   peso (CUP) se calcula automáticamente (1 USD = 700 CUP) y la',
      '   tienda sigue mostrando ambas monedas como siempre.',
      ' - NUEVO (V52.5) Galería del admin: guía de uso visible, botón',
      '   “Añadir fotos al carrusel” con progreso “Subiendo 2/5…”, barra',
      '   de progreso y avisos por foto fallida (sin perder las que sí',
      '   subieron). El carrusel de cada categoría se llena expandiendo la',
      '   categoría y subiendo fotos (se comprimen automáticamente).',
      ' - FIX (V52.5) La notificación de “instalar app móvil” ya NO aparece',
      '   en PC/portátiles: solo se muestra en teléfonos y tablets.',
      ' - FOTOS REALES (V52.5): muñecos sorpresa (payasita humana), cañón',
      '   de confeti sobre pétalos, vela volcánica, pullover sublimado y',
      '   jarra personalizada con las fotos reales del negocio. En BDs',
      '   existentes se aplican SOLO si el servicio no tiene foto propia',
      '   del admin (nunca se pisan tus subidas).',
      ' - FIX CRÍTICO (V52.4): se reconstruyeron las 5 rutas de subida de',
      '   imágenes del admin (productos, categorías, galería, secciones y',
      '   servicios) que se habían PERDIDO del código fuente — el admin',
      '   vuelve a poder cambiar todas las fotos de la tienda. Convierten a',
      '   WebP con sharp y espejan en .next/standalone para Railway.',
      ' - NUEVO (V52.4) “Ver más” en Servicios: se muestran 8 cards y el',
      '   botón despliega el resto (útil al crecer el catálogo), contador',
      '   “Mostrando N de M” al filtrar/buscar y botón “Compartir',
      '   servicio” por WhatsApp en el modal de detalle.',
      ' - Servicios para Eventos: cards VERTICALES con foto protagonista',
      '   real (pullover personalizado, payasita humana, decoración, globos…)',
      '   + gestión completa desde el admin (crear/editar/ordenar/subir foto).',
      '   Filtros por categoría, modal “Ver detalle” con foto grande y',
      '   botón de consultar por WhatsApp, skeletons de carga y lightbox de',
      '   la foto a pantalla completa (clic en “Ampliar”).',
      '   NUEVO (V52.3): buscador de servicios por texto (nombre, descripción',
      '   o categoría) con botón de limpiar.',
      ' - Promociones v2: card de la promoción (ej: Día de las Madres) con',
      '   las cards de los COMBOS dentro — cada combo se conforma desde el',
      '   admin eligiendo MÁS DE UN producto (suma de precios + descuento).',
      '   El cliente puede pedir el combo completo de un clic o compartirlo',
      '   por WhatsApp. Chip “faltan N días” en el banner de la promo,',
      '   botón “Compartir” la promoción completa por WhatsApp y lightbox de',
      '   las fotos de los productos (teclado ←/→/Esc + miniaturas).',
      '   NUEVO (V52.3): vista previa EN VIVO del combo en el editor del',
      '   admin (mini-card espejo de la tienda: collage, precios, −%).',
      ' - NUEVO (V52.3) Centro de Descargas en el Dashboard del admin:',
      '   versión pendiente, historial de paquetes, botón de descarga y',
      '   verificación del paquete SIN gastar la versión (dryRun).',
      ' - NUEVO (V52.3) Botón flotante “volver arriba” en la tienda,',
      '   scrollbar vertical elegante en listas (carrito, wishlist, admin)',
      '   y anillos de foco accesibles en botones de cards.',
      ' - FIX empaquetado: el conversor PNG/JPG→WebP del ZIP volvió a',
      '   funcionar (IMAGE_EXTENSIONS se había corrompido) y el reescritor',
      '   de referencias ya no altera literales de código fuente.',
      ' - /api/download soporta ?dryRun=1 (sondeos sin consumir versión).',
      ' - Galería v2: portadas por categoría + carrusel + lightbox gigante',
      ' - Imágenes de secciones configurables (sembradas en BD + subida admin)',
      ' - Dock de navegación móvil + header compacto',
      ' - Dulces Finos (13 × 40 USD/docena) en sección Por Reserva',
      ' - Precios: pasteles 120/140 USD · tortas 30/40/60 USD',
      ' - Moneda USD por defecto; venta directa siempre en CUP',
      ' - Logo oficial + favicon sin fondo blanco',
      ' - Autorreparación de BD al arrancar (columnas/tablas faltantes',
      '   + fotos de servicios y specialDates con combos en BDs existentes)',
      ' - /api/health para diagnóstico del deploy',
      ' - /api/download genera este paquete con versionado incremental',
      '',
      'DESPLEGAR: ver DEPLOY-RAILWAY.md',
      '════════════════════════════════════════════════════════════',
      '',
    ].join('\n');

    const metaEntries: ZipEntry[] = [
      { name: 'VERSION.txt', data: Buffer.from(versionTxt, 'utf-8'), mtime: new Date() },
      {
        name: 'DOWNLOAD-MANIFEST.json',
        data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'),
        mtime: new Date(),
      },
    ];

    // 7. VERIFICACIÓN anti-staleness: sin el código de la última versión NO se sirve
    const allEntries = [...codeEntries, ...metaEntries];
    const problems = verifyLatestCode(allEntries, versionNumber);
    if (problems.length > 0) {
      console.error('[project-zip] verificación de última versión FALLIDA:', problems);
      return {
        ok: false,
        error: `El paquete no contiene el código de la última versión (${problems.slice(0, 5).join('; ')})`,
      };
    }

    const buffer = buildZipBuffer(allEntries);
    console.log(
      `[project-zip] ${version} generado: ${allEntries.length} archivos, ${(buffer.length / 1024 / 1024).toFixed(2)} MB zip, fingerprint ${fingerprint.slice(0, 12)}…`
    );

    // 8. Solo tras una construcción + verificación EXITOSA se consume la versión
    //    (dryRun: sondeos de QA/monitoreo sin avanzar el contador)
    if (consume) {
      state.next = versionNumber + 1;
      state.historial.unshift({
        version: versionNumber,
        fecha: generatedAt,
        archivos: allEntries.length,
        bytesZip: buffer.length,
      });
      if (state.historial.length > HISTORIAL_MAX) state.historial.length = HISTORIAL_MAX;
      await writeVersionState(state);
    } else {
      console.log(
        `[project-zip] ${version} (dryRun, sin consumir versión) — ${allEntries.length} archivos, fingerprint ${fingerprint.slice(0, 12)}…`
      );
    }

    const prefix = options.filenamePrefix || 'dulce-encanto';
    const filename = `${prefix}-${version}.zip`;

    return { ok: true, buffer, fileCount: allEntries.length, filename, version, versionNumber };
  } catch (err) {
    console.error('[project-zip] error:', err);
    return { ok: false, error: `Error al generar el paquete: ${(err as Error).message}` };
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
