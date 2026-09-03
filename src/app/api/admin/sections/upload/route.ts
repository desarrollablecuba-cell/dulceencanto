import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/sections/upload
 *
 * Sube la imagen de una sección del home (Venta Directa, Reservas,
 * Servicios, Promociones, Galería) — multipart/form-data, campo "file".
 * - Requiere token de admin.
 * - Convierte a WebP con sharp y guarda en public/sections/.
 * - Devuelve { url, path }; la URL se guarda en SiteConfig.sectionImages.
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
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no válido. Solo JPG, PNG, WebP o GIF.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen supera el máximo de 8MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let output = buffer;
    let ext = 'webp';
    try {
      const sharp = (await import('sharp')).default;
      // 1600px de ancho: las cards de sección son grandes
      output = await sharp(buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } catch {
      ext = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
    }

    const name = `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'sections');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), output);

    const rel = `/sections/${name}`;
    return NextResponse.json({ ok: true, path: rel, url: `/api/uploads${rel}` }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al subir la imagen' }, { status: 500 });
  }
}
