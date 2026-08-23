import { NextResponse } from 'next/server';
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { requireAdmin, unauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * En producción con `output: "standalone"`, Next.js sirve los archivos de
 * public/ desde .next/standalone/public. Si escribimos en el public/ de la
 * raíz del proyecto, las imágenes subidas darían 404. Por eso: si existe
 * .next/standalone, se escribe ahí; si no (dev), en public/ normal.
 */
function resolveUploadDir(): string {
  const root = process.cwd();
  const standalonePublic = path.join(root, '.next', 'standalone', 'public');
  if (existsSync(standalonePublic)) {
    return path.join(standalonePublic, 'products');
  }
  return path.join(root, 'public', 'products');
}

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
      return NextResponse.json({ error: `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo 8MB.` }, { status: 413 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Tipo no permitido: ${file.type}. Use WebP, JPEG, PNG o GIF.` }, { status: 400 });
    }
    let ext = 'webp';
    if (file.type === 'image/jpeg') ext = 'jpg';
    else if (file.type === 'image/png') ext = 'png';
    else if (file.type === 'image/gif') ext = 'gif';
    const timestamp = Date.now();
    const random = randomBytes(6).toString('hex');
    const filename = `prod-${timestamp}-${random}.${ext}`;
    const uploadDir = resolveUploadDir();
    await fs.mkdir(uploadDir, { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, buffer);
    return NextResponse.json({ path: `/products/${filename}` });
  } catch (error) {
    console.error('[upload] error:', error);
    return NextResponse.json({ error: 'Error al guardar el archivo' }, { status: 500 });
  }
}
