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
import { randomUUID } from 'node:crypto';
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
}

/**
 * Genera el ZIP del proyecto (en memoria) listo para subir a Railway.
 * Nunca lanza: devuelve { ok: false, error } en caso de fallo.
 */
export async function createProjectZip(
  options: CreateProjectZipOptions = {}
): Promise<ProjectZipSuccess | ProjectZipResult> {
  const tmpDir = path.join(os.tmpdir(), `dulce-zip-${randomUUID().slice(0, 8)}`);

  try {
    await fs.mkdir(tmpDir, { recursive: true });

    // 1. Copiar whitelist
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

    // 4. Manifest opcional
    if (options.manifest) {
      try {
        await fs.writeFile(
          path.join(tmpDir, 'DOWNLOAD-MANIFEST.json'),
          JSON.stringify(options.manifest, null, 2),
          'utf-8'
        );
      } catch {
        // best-effort
      }
    }

    // 5. Recolectar y comprimir (writer JS puro — sin binario zip)
    const entries = await collectFiles(tmpDir);
    if (entries.length === 0) {
      return { ok: false, error: 'El empaquetado no produjo ningún archivo.' };
    }
    const buffer = buildZipBuffer(entries);

    // 6. Nombre con timestamp
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const prefix = options.filenamePrefix || 'dulce-encanto';
    const filename = `${prefix}-${dateStr}.zip`;

    return { ok: true, buffer, fileCount: entries.length, filename };
  } catch (err) {
    console.error('[project-zip] error:', err);
    return { ok: false, error: `Error al generar el paquete: ${(err as Error).message}` };
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
