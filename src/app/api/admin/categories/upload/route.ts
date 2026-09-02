import { NextResponse } from 'next/server';
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { requireAdmin, unauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/admin/categories/upload
 *
 * Sube la imagen de una CATEGORÍA desde el panel admin.
 *
 * ⚠️ Esta ruta faltaba por completo: el AdminPanel llama a
 *    /api/admin/categories/upload (con token en query string) y mostraba
 *    "No se pudo subir la imagen" al recibir 404.
 *
 * Acepta token por header Authorization o por query ?token= (getBearerToken).
 * Guarda el archivo en public/categories/ (y en .next/standalone/public si
 * existe) y devuelve { url, path } — el admin usa `data.url`.
 */

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'];

export async function POST(request: Request) {
  const admin = requireAdmin(request);
  if (!admin) return unauthorized();
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo 8MB.` },
        { status: 413 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo no permitido: ${file.type}. Use WebP, JPEG, PNG o GIF.` },
        { status: 400 }
      );
    }

    let ext = 'webp';
    if (file.type === 'image/jpeg') ext = 'jpg';
    else if (file.type === 'image/png') ext = 'png';
    else if (file.type === 'image/gif') ext = 'gif';

    const timestamp = Date.now();
    const random = randomBytes(6).toString('hex');
    const filename = `cat-${timestamp}-${random}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Escribir en todas las ubicaciones relevantes (repo public/ + standalone)
    const root = process.cwd();
    const targetDirs = [path.join(root, 'public', 'categories')];
    const standalonePublic = path.join(root, '.next', 'standalone', 'public');
    if (existsSync(standalonePublic)) {
      targetDirs.push(path.join(standalonePublic, 'categories'));
    }
    for (const dir of targetDirs) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), buffer);
    }

    // Ruta servida por /api/uploads (lee del disco por petición — a prueba
    // de instantáneas del standalone). El AdminPanel espera `data.url`.
    const url = `/api/uploads/categories/${filename}`;
    return NextResponse.json({ url, path: url });
  } catch (error) {
    console.error('[categories/upload] error:', error);
    return NextResponse.json({ error: 'Error al guardar el archivo' }, { status: 500 });
  }
}
