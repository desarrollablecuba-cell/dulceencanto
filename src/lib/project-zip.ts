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

/** Extensiones de imagen que se convierten a WebP. */
const IMAGE_EXTENSIONS = ['.webp', '.webp', '.webp', '.webp'];
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

/** Actualiza referencias .png/.jpg/.jpeg/.gif → .webp en archivos de texto. */
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

    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.includes(ext)) continue;

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const next = content.replace(/\.(png|jpe?g|gif)(['"`)])/gi, '.webp$2');
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
  // Galería v2 (portadas + carrusel + lightbox) — API y frontend
  ['src/components/ecommerce/GallerySection.tsx'],
  ['src/app/api/admin/gallery/route.ts'],
  ['src/app/api/admin/gallery/photos/route.ts'],
  ['src/app/api/admin/gallery/upload/route.ts'],
  ['scripts/seed-gallery.ts'],
  ['prisma/migrations/20260903000001_gallery_categories/migration.sql'],
  // Secciones con imagen configurable
  ['src/app/api/admin/sections/upload/route.ts'],
  ['src/lib/section-images.ts'],
  // Dock móvil + fixes de consola
  ['src/components/ecommerce/MobileNavDock.tsx'],
  ['src/components/ServiceWorkerCleaner.tsx'],
  // Subidas de imágenes (bug corregido)
  ['src/app/api/admin/categories/upload/route.ts'],
  ['src/app/api/admin/products/upload/route.ts'],
  // Diagnóstico Railway
  ['src/app/api/health/route.ts'],
  // Deploy
  ['scripts/db-setup.mjs', /verificarColumnasCriticas/],
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

  // El schema embebido debe ser el MySQL COMPLETO (galería v2 + secciones)
  const schema = map.get('prisma/schema.prisma')?.toString('utf-8') ?? '';
  const schemaChecks: [string, RegExp][] = [
    ['model GalleryCategory', /model\s+GalleryCategory\s*\{/],
    ['model GalleryPhoto', /model\s+GalleryPhoto\s*\{/],
    ['sectionImages (SiteConfig)', /sectionImages\s+String\s+@db\.LongText/],
    ['section (Category)', /section\s+String\s+@default\("ambas"\)/],
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
      'ESTE PAQUETE INCLUYE LA ÚLTIMA VERSIÓN DEL CÓDIGO:',
      ' - Galería v2: portadas por categoría + carrusel + lightbox gigante',
      ' - Imágenes de secciones configurables (sembradas en BD + subida admin)',
      ' - Dock de navegación móvil + header compacto',
      ' - Dulces Finos (13 × 40 USD/docena) en sección Por Reserva',
      ' - Precios: pasteles 120/140 USD · tortas 30/40/60 USD',
      ' - Moneda USD por defecto; venta directa siempre en CUP',
      ' - Logo oficial + favicon sin fondo blanco',
      ' - Autorreparación de BD al arrancar (columnas/tablas faltantes)',
      ' - /api/health para diagnóstico del deploy',
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
    state.next = versionNumber + 1;
    state.historial.unshift({
      version: versionNumber,
      fecha: generatedAt,
      archivos: allEntries.length,
      bytesZip: buffer.length,
    });
    if (state.historial.length > HISTORIAL_MAX) state.historial.length = HISTORIAL_MAX;
    await writeVersionState(state);

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
