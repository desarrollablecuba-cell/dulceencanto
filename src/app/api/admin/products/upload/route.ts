import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/products/upload
 *
 * Sube una imagen de producto (multipart/form-data, campo "file").
 * - Requiere token de admin (header Authorization: Bearer o ?token=).
 * - Convierte a WebP con sharp y guarda en public/products/.
 * - Devuelve { url, path }: `url` se sirve vía /api/uploads/... (a prueba de
 *   instantáneas del standalone), `path` es la ruta física relativa a public/.
 */
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

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

    // Convertir a WebP (sharp mantiene la calidad con mucho menos peso)
    let output = buffer;
    let ext = 'webp';
    try {
      const sharp = (await import('sharp')).default;
      output = await sharp(buffer).webp({ quality: 82 }).toBuffer();
    } catch {
      // Si sharp falla, guardar el original con su extensión
      ext = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
    }

    const name = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'products');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), output);

    const rel = `/products/${name}`;
    return NextResponse.json({ ok: true, path: rel, url: `/api/uploads${rel}` }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al subir la imagen' }, { status: 500 });
  }
}
