'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  COMPRESS-IMAGE — Compresión de imágenes EN EL CLIENTE antes de subir
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ¿POR QUÉ EXISTE? (fix V52.5 del error 502 al cambiar fotos)
 *  ----------------------------------------------------------------
 *  Los móviles modernos sacan fotos de 8–12 MB (o más). Antes, el admin
 *  enviaba el archivo CRUDO al servidor:
 *    · En Railway, el proxy/proceso rechazaba cuerpos tan grandes → 502.
 *    · El límite de 8 MB del servidor devolvía 400 sin una buena guía.
 *
 *  Ahora TODAS las subidas del admin comprimen primero en el navegador:
 *    1. Se decodifica la imagen (createImageBitmap o <img> de fallback).
 *    2. Se redimensiona al borde largo máximo (p.ej. 1600px) — más que
 *       suficiente para cards 3:4 y carruseles retina.
 *    3. Se re-codifica como WebP con calidad adaptativa, bajando la
 *       calidad en pasos hasta quedar por debajo del objetivo de bytes.
 *    4. Si el navegador no soporta WebP en canvas (Safari viejo), se usa
 *       JPEG como fallback (el servidor también lo acepta).
 *
 *  Resultado: fotos de 12 MB → ~150–500 KB. La subida nunca más da 502,
 *  consume menos datos móviles y carga más rápido en la tienda.
 *
 *  USO:
 *    import { compressImageFile } from '@/lib/compress-image';
 *    const file = await compressImageFile(fileOriginal);          // defaults
 *    const file = await compressImageFile(fileOriginal, { maxEdge: 1200 });
 */

export interface CompressOptions {
  /** Borde largo máximo en px (mantiene aspect ratio). Default 1600. */
  maxEdge?: number;
  /** Tamaño objetivo en bytes. Default 900 KB. */
  targetBytes?: number;
  /** Calidad WebP inicial (0–1). Default 0.85. */
  quality?: number;
  /** Calidad mínima aceptable antes de rendirse. Default 0.5. */
  minQuality?: number;
}

/** Límite duro de entrada: 50 MB (fotos de móviles con HDR/proRAW). */
const INPUT_LIMIT_BYTES = 50 * 1024 * 1024;

/** Decodifica un File a algo dibujable en canvas. */
async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap es más eficiente (no pasa por el DOM) y soporta EXIF
  // orientation en navegadores modernos.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Algunos formatos (HEIC en Safari viejo, GIFs raros) fallan aquí →
      // caemos al <img> clásico.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen. ¿Formato no soportado?'));
      img.src = url;
    });
    return img;
  } finally {
    // Revocar después (el img ya está decodificado y dibujado luego).
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/** ¿Soporta este navegador codificar WebP en canvas? */
let webpSupported: boolean | null = null;
function supportsWebpEncode(): boolean {
  if (webpSupported !== null) return webpSupported;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    webpSupported = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

/** Codifica un canvas a Blob con el tipo/calidad dados. */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`No se pudo codificar como ${type}`))),
      type,
      quality
    );
  });
}

/**
 * Comprime un archivo de imagen y devuelve un NUEVO File (nunca muta el
 * original). Si el archivo ya es pequeño y está dentro del objetivo, se
 * devuelve tal cual (evita re-comprimir sin ganancia).
 */
export async function compressImageFile(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const {
    maxEdge = 1600,
    targetBytes = 900 * 1024,
    quality = 0.85,
    minQuality = 0.5,
  } = opts;

  // Solo imágenes (por si el input accept dejó pasar algo raro).
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.');
  }
  if (file.size > INPUT_LIMIT_BYTES) {
    throw new Error(
      `La imagen pesa ${(file.size / 1024 / 1024).toFixed(0)}MB — el máximo es 50MB. Prueba con otra foto.`
    );
  }

  // GIFs animados: comprimirlos los mataría. Devolver tal cual (son pequeños
  // casi siempre) — el servidor los acepta.
  if (file.type === 'image/gif') return file;

  const source = await decodeImage(file);
  const srcW = 'width' in source ? source.width : 0;
  const srcH = 'height' in source ? source.height : 0;
  if (!srcW || !srcH) throw new Error('La imagen no tiene dimensiones válidas.');

  // Ya está dentro del objetivo Y dentro del borde → no hace falta tocarla.
  const needsResize = Math.max(srcW, srcH) > maxEdge;
  if (!needsResize && file.size <= targetBytes) return file;

  // Dimensiones de salida (mantiene aspect ratio).
  const scale = needsResize ? maxEdge / Math.max(srcW, srcH) : 1;
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen (canvas no disponible).');
  // smoothing de alta calidad para el downscale.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source as CanvasImageSource, 0, 0, outW, outH);
  if ('close' in source && typeof source.close === 'function') source.close();

  // Codificar con calidad adaptativa hasta quedar bajo el objetivo.
  const useWebp = supportsWebpEncode();
  const type = useWebp ? 'image/webp' : 'image/jpeg';
  const ext = useWebp ? 'webp' : 'jpg';
  let q = quality;
  let blob = await canvasToBlob(canvas, type, q);
  while (blob.size > targetBytes && q > minQuality) {
    q = Math.max(minQuality, q - 0.12);
    blob = await canvasToBlob(canvas, type, q);
  }
  // Último recurso: si sigue enorme, reducimos dimensiones a la mitad.
  if (blob.size > targetBytes && Math.max(outW, outH) > 900) {
    canvas.width = Math.max(1, Math.round(outW / 2));
    canvas.height = Math.max(1, Math.round(outH / 2));
    const ctx2 = canvas.getContext('2d');
    if (ctx2) {
      ctx2.imageSmoothingEnabled = true;
      ctx2.imageSmoothingQuality = 'high';
      // Ojo: drawImage sobre el MISMO canvas redimensionado borra el contenido;
      // como ya cambiamos width/height, volvemos a dibujar desde una copia.
      // Para evitar el problema, usamos el blob anterior como fuente.
      const prev = await decodeImage(new File([blob], 'tmp', { type }));
      ctx2.drawImage(prev as CanvasImageSource, 0, 0, canvas.width, canvas.height);
      if ('close' in prev && typeof (prev as ImageBitmap).close === 'function') (prev as ImageBitmap).close();
      blob = await canvasToBlob(canvas, type, Math.max(minQuality, q - 0.1));
    }
  }

  // Nombre: mismo base + extensión nueva (el server valida por extensión/mime).
  const baseName = (file.name || 'imagen').replace(/\.[^.]+$/, '').slice(0, 60) || 'imagen';
  const fileName = `${baseName}.${ext}`;
  return new File([blob], fileName, { type, lastModified: Date.now() });
}
