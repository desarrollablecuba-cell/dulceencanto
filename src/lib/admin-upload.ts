import sharp from 'sharp';
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ADMIN UPLOAD — Helper compartido para subir imágenes del admin
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Usado por las rutas:
 *    /api/admin/products/upload   → public/products/prod-*.webp
 *    /api/admin/categories/upload → public/categories/cat-*.webp
 *    /api/admin/gallery/upload    → public/gallery/gal-*.webp
 *    /api/admin/sections/upload   → public/sections/sec-*.webp
 *    /api/admin/services/upload   → public/services/srv-*.webp
 *
 *  Flujo:
 *    1. Lee el archivo del FormData (campo "file").
 *    2. Valida tipo (JPG/PNG/WebP/GIF) y tamaño (≤ 25MB — la compresión
 *       en el cliente ya deja las fotos en <1MB; esto es solo red de
 *       seguridad para navegadores sin canvas/WebP).
 *    3. Convierte a WebP con sharp (redimensiona al ancho máximo).
 *    4. Guarda en public/<subdir>/<prefix>-<ts>-<rand>.webp
 *       (y en espejo .next/standalone/public/... si existe, para que el
 *       servidor standalone de Railway lo sirva sin re-desplegar).
 *    5. Devuelve { path, url } con la ruta pública ("/products/prod-...webp").
 *
 *  La ruta devuelta es la que se guarda en la BD (Product.image,
 *  Category.image, Service.image, GalleryPhoto.image, SiteConfig.sectionImages)
 *  — NUNCA se guardan data URLs.
 */

export interface UploadTarget {
  /** Subcarpeta de public/ donde guardar (ej: 'products'). */
  subdir: string;
  /** Prefijo del nombre de archivo (ej: 'prod'). */
  prefix: string;
  /** Ancho máximo en px (mantiene aspect ratio). 0 = sin límite. */
  maxW: number;
  /** Calidad WebP 0-100. */
  quality?: number;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB (red de seguridad — el cliente ya comprime)

/**
 * Procesa y guarda la imagen del FormData de una petición admin.
 *
 * @returns NextResponse JSON listo para devolver desde la ruta:
 *   200 → { path, url, bytes }
 *   400 → { error } (archivo faltante, tipo no permitido, demasiado grande)
 *   500 → { error } (fallo de sharp/disco)
 */
export async function handleAdminImageUpload(req: Request, target: UploadTarget): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Petición inválida (se esperaba multipart/form-data)' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Falta el campo "file" con la imagen' }, { status: 400 });
  }
  const blob = file as File;

  // Validar extensión Y mime (defensivo: algunos navegadores mandan octet-stream)
  const extOk = /\.(jpe?g|png|webp|gif)$/i.test(blob.name || '');
  if (!ALLOWED_TYPES.has(blob.type) && !extOk) {
    return NextResponse.json({ error: 'Formato no válido. Solo JPG, PNG, WebP o GIF.' }, { status: 400 });
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `La imagen pesa ${(blob.size / 1024 / 1024).toFixed(1)}MB y el máximo es 25MB. Actualiza la página e inténtalo de nuevo — la foto se comprime automáticamente al subirla.` },
      { status: 413 }
    );
  }

  try {
    // ── Convertir a WebP ────────────────────────────────────────────────
    let pipeline = sharp(Buffer.from(await blob.arrayBuffer()), { failOn: 'none' });
    const meta = await pipeline.metadata();
    if (target.maxW > 0 && (meta.width ?? 0) > target.maxW) {
      pipeline = pipeline.resize({ width: target.maxW });
    }
    const webpBuffer = await pipeline.webp({ quality: target.quality ?? 82 }).toBuffer();

    // ── Nombre único y rutas ────────────────────────────────────────────
    const ts = Date.now().toString(36);
    const rand = crypto.randomBytes(4).toString('hex');
    const fileName = `${target.prefix}-${ts}-${rand}.webp`;
    const publicPath = path.join(process.cwd(), 'public', target.subdir);
    await fs.mkdir(publicPath, { recursive: true });
    const fullPath = path.join(publicPath, fileName);
    await fs.writeFile(fullPath, webpBuffer);

    // Espejo para el servidor standalone (Railway): public/ se congela al
    // arrancar, pero .next/standalone/public/ SÍ se lee del disco en cada
    // petición estática → así la imagen nueva se sirve sin re-desplegar.
    const standaloneDir = path.join(process.cwd(), '.next', 'standalone', 'public', target.subdir);
    if (standaloneDir !== publicPath && existsSync(path.dirname(standaloneDir))) {
      try {
        await fs.mkdir(standaloneDir, { recursive: true });
        await fs.writeFile(path.join(standaloneDir, fileName), webpBuffer);
      } catch (err) {
        console.warn(`[upload] No se pudo espejar en standalone (${target.subdir}):`, err);
      }
    }

    const url = `/${target.subdir}/${fileName}`;
    console.log(`[upload] ${target.subdir}/${fileName} guardado (${(webpBuffer.length / 1024).toFixed(0)} KB)`);
    return NextResponse.json({ path: url, url, bytes: webpBuffer.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[upload] Error procesando imagen (${target.subdir}):`, msg);
    return NextResponse.json({ error: 'No se pudo procesar la imagen. ¿Formato corrupto?' }, { status: 500 });
  }
}
