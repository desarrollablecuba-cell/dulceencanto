import { NextResponse } from 'next/server';
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/uploads/<ruta>
 *
 * Sirve imágenes subidas por el admin (public/products/prod-*.webp).
 *
 * ¿Por qué esta ruta? El servidor standalone de Next.js NO sirve archivos
 * añadidos a public/ DESPUÉS de arrancar (usa una instantánea del boot),
 * por lo que las imágenes subidas daban 404 aunque existieran en disco.
 * Esta ruta lee el archivo del disco en cada petición — a prueba de
 * instantáneas — buscando en ambas ubicaciones (public/ del repo y
 * .next/standalone/public/).
 */
const MIME: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await ctx.params;

  // Sanitizar: solo caracteres seguros en nombres de archivo (sin ../)
  const rel = parts
    .map((p) => p.replace(/[^a-zA-Z0-9._-]/g, ''))
    .filter(Boolean)
    .join('/');
  if (!rel) return new NextResponse('Not found', { status: 404 });

  const root = process.cwd();
  const candidates = [
    path.join(root, 'public', rel),
    path.join(root, '.next', 'standalone', 'public', rel),
  ];

  for (const file of candidates) {
    if (existsSync(file)) {
      try {
        const ext = path.extname(file).slice(1).toLowerCase();
        const data = await fs.readFile(file);
        return new NextResponse(new Uint8Array(data), {
          headers: {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch {
        /* intentar siguiente ubicación */
    }
    }
  }
  return new NextResponse('Not found', { status: 404 });
}
