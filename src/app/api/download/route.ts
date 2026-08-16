import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/download
 *
 * Genera y sirve un .zip en tiempo real con todo el código fuente del
 * proyecto Dulce Encanto, optimizado para descarga:
 *
 *  1. Excluye directorios pesados no esenciales:
 *     - skills/ (61MB de documentación de skills)
 *     - examples/ (código de ejemplo)
 *     - mini-services/ (servicios auxiliares)
 *     - node_modules/, .next/, db/, .git/, download/, upload/
 *
 *  2. Convierte todas las imágenes PNG/JPG/JPEG a WebP usando sharp,
 *     reduciendo el tamaño ~70% sin pérdida visible de calidad.
 *     Las referencias .png/.jpg en el código fuente se actualizan a .webp.
 *
 *  3. Incluye:
 *     - src/ (código fuente)
 *     - prisma/ (schema)
 *     - public/ (imágenes convertidas a webp + assets estáticos)
 *     - data/ (datos seed JSON)
 *     - scripts/ (scripts de seed)
 *     - package.json, tsconfig.json, next.config.ts, etc.
 */

const PROJECT_ROOT = process.cwd();

// Directorios y archivos a incluir en el zip.
// Se excluyen skills/, examples/, mini-services/ por ser pesados y no
// formar parte del código del proyecto.
const INCLUDE_PATHS = [
  'src',
  'prisma',
  'public',
  'data',
  'scripts',
  'README.md',
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'components.json',
  'eslint.config.mjs',
  '.env.example',
  '.gitignore',
  'Caddyfile',
  'nixpacks.toml',
];

// Extensiones de imagen a convertir a webp
const IMAGE_EXTENSIONS = ['.webp', '.webp', '.webp', '.webp'];
const QUALITY = 80; // calidad webp (0-100), 80 es un buen balance

/**
 * Convierte recursivamente todas las imágenes de un directorio a WebP.
 * Borra el archivo original (.png/.webp) después de crear el .webp.
 */
async function convertImagesToWebp(dir: string): Promise<number> {
  let converted = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      converted += await convertImagesToWebp(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const webpPath = fullPath.replace(/\.(png|jpe?g|gif)$/i, '.webp');
        try {
          await sharp(fullPath)
            .webp({ quality: QUALITY })
            .toFile(webpPath);
          // Borrar el original
          await fs.unlink(fullPath);
          converted++;
        } catch (err) {
          // Si falla la conversión, mantener el original
          console.error(`[download] Failed to convert ${entry.name}:`, err);
        }
      }
    }
  }
  return converted;
}

/**
 * Actualiza las referencias de imagen .png/.jpg/.jpeg/.gif a .webp
 * en todos los archivos .ts, .tsx, .js, .jsx, .json, .md de un directorio.
 */
async function updateImageReferences(dir: string): Promise<number> {
  let updated = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const TEXT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.mjs'];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      updated += await updateImageReferences(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.includes(ext)) {
        try {
          let content = await fs.readFile(fullPath, 'utf-8');
          const original = content;
          // Reemplazar .png, .jpg, .jpeg, .gif con .webp (solo en strings de rutas)
          content = content.replace(/\.(png|jpe?g|gif)(['"`)])/gi, '.webp$2');
          if (content !== original) {
            await fs.writeFile(fullPath, content, 'utf-8');
            updated++;
          }
        } catch {
          // ignore
        }
      }
    }
  }
  return updated;
}

export async function GET() {
  let tmpDir: string | null = null;
  let tmpZipPath: string | null = null;

  try {
    // Crear directorio temporal único
    const sessionId = randomUUID().slice(0, 8);
    tmpDir = path.join(tmpdir(), `dulce-encanto-${sessionId}`);
    tmpZipPath = path.join(tmpdir(), `dulce-encanto-${sessionId}.zip`);

    // Crear el directorio temporal
    await fs.mkdir(tmpDir, { recursive: true });

    // Copiar los archivos/directorios incluidos al directorio temporal
    for (const p of INCLUDE_PATHS) {
      const srcPath = path.join(PROJECT_ROOT, p);
      const destPath = path.join(tmpDir, p);
      try {
        await fs.access(srcPath);
        // Copiar usando cp -r (sistema) para mayor velocidad
        execSync(`cp -r "${srcPath}" "${destPath}"`, { stdio: 'pipe' });
      } catch {
        // El path no existe, lo saltamos
      }
    }

    // Convertir imágenes a WebP en el directorio temporal
    const publicTmp = path.join(tmpDir, 'public');
    try {
      await fs.access(publicTmp);
      const imgCount = await convertImagesToWebp(publicTmp);
      console.log(`[download] Converted ${imgCount} images to webp`);
    } catch {
      // public/ no existe
    }

    // Actualizar referencias .png/.jpg a .webp en el código fuente
    const srcTmp = path.join(tmpDir, 'src');
    try {
      await fs.access(srcTmp);
      const refCount = await updateImageReferences(srcTmp);
      console.log(`[download] Updated ${refCount} files with webp references`);
    } catch {
      // src/ no existe
    }

    // También actualizar referencias en data/ y scripts/
    for (const dir of ['data', 'scripts']) {
      const dirTmp = path.join(tmpDir, dir);
      try {
        await fs.access(dirTmp);
        await updateImageReferences(dirTmp);
      } catch {
        // ignore
      }
    }

    // Generar el zip desde el directorio temporal
    const cmd = `cd "${tmpDir}" && zip -r -q "${tmpZipPath}" .`;
    try {
      execSync(cmd, {
        cwd: tmpDir,
        timeout: 120000,
        stdio: 'pipe',
        maxBuffer: 50 * 1024 * 1024,
      });
    } catch (zipErr) {
      console.error('[/api/download] zip command failed:', zipErr);
      return NextResponse.json(
        { error: 'Error al generar el archivo zip.' },
        { status: 500 }
      );
    }

    // Verificar que el zip se generó
    try {
      await fs.access(tmpZipPath);
    } catch {
      return NextResponse.json(
        { error: 'El archivo zip no se generó correctamente.' },
        { status: 500 }
      );
    }

    // Leer el zip
    const buffer = await fs.readFile(tmpZipPath);

    // Generar nombre con timestamp
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const downloadFilename = `dulce-encanto-${dateStr}.zip`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    headers.set('Content-Length', String(buffer.length));
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(buffer, { status: 200, headers });
  } catch (err) {
    console.error('[/api/download] error:', err);
    return NextResponse.json(
      { error: 'Error interno al generar el paquete.' },
      { status: 500 }
    );
  } finally {
    // Limpiar archivos temporales (en background, sin bloquear la response)
    const cleanup = async () => {
      if (tmpDir) {
        try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
      if (tmpZipPath) {
        try { await fs.unlink(tmpZipPath); } catch { /* ignore */ }
      }
    };
    cleanup();
  }
}
