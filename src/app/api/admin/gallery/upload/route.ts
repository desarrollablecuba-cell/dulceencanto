import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/gallery/upload
 *
 * Sube una foto de evento para la galería — multipart/form-data, campo "file".
 * - Requiere token de admin.
 * - Acepta varias imágenes: campo "file" (una) o "files" (múltiples).
 * - Convierte a WebP con sharp y guarda en public/gallery/.
 * - Devuelve { url, path } o { results: [{ url, path }, ...] }.
 */
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const singles = formData.getAll('file');
    const multis = formData.getAll('files');
    const files = [...singles, ...multis].filter((f): f is File => typeof f !== 'string');

    if (files.length === 0) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), 'public', 'gallery');
    await fs.mkdir(dir, { recursive: true });

    let sharp: any = null;
    try { sharp = (await import('sharp')).default; } catch { /* opcional */ }

    const results: { url: string; path: string }[] = [];
    for (const file of files) {
      if (!ALLOWED.includes(file.type)) {
        return NextResponse.json({ error: `Formato no válido: ${file.type}. Solo JPG, PNG, WebP o GIF.` }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `La imagen ${file.name} supera el máximo de 8MB.` }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      let output = buffer;
      let ext = 'webp';
      if (sharp) {
        // Fotos de eventos: grandes (2000px) y de alta calidad — se ven en pantalla completa
        output = await sharp(buffer).resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      } else {
        ext = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
      }

      const name = `gal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await fs.writeFile(path.join(dir, name), output);
      const rel = `/gallery/${name}`;
      results.push({ path: rel, url: `/api/uploads${rel}` });
    }

    if (results.length === 1) {
      return NextResponse.json({ ok: true, ...results[0] }, { status: 201 });
    }
    return NextResponse.json({ ok: true, results }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al subir la imagen' }, { status: 500 });
  }
}
