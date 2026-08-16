'use client';

/**
 * Módulo de subida de imágenes — Díaz Premium Envíos
 *
 * Flujo:
 *   1. optimizeImage(): comprime/convierte a WebP en el cliente → data URL temporal
 *   2. uploadImage(): usa optimizeImage + sube el Blob al servidor → ruta /products/xxx.webp
 *
 * IMPORTANTE: NUNCA se guarda el data URL (Base64) en la base de datos.
 * Solo se usa temporalmente para previsualización y como paso intermedio
 * antes de subir el archivo físico al servidor.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Contador de uploads activos — permite que el formulario bloquee el guardado
// mientras hay imágenes subiéndose.
// ─────────────────────────────────────────────────────────────────────────────

let _activeUploads = 0;

/** Devuelve cuántas subidas están en curso. */
export function getActiveUploads(): number {
  return _activeUploads;
}

// ─────────────────────────────────────────────────────────────────────────────
// optimizeImage — comprime y convierte a WebP en el cliente
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Optimiza una imagen de archivo (File) y la devuelve como data URL WebP.
 *
 * - Límite: 8MB (cubre fotos de smartphone modernas).
 * - Redimensiona si el ancho supera `maxW` (mantiene aspect ratio).
 * - Re-codifica como WebP con la calidad indicada.
 * - Si la imagen original pesa > 2MB, automáticamente baja maxW y quality.
 *
 * Sólo para uso en el cliente (usa FileReader, Image y Canvas).
 *
 * NOTA: El data URL devuelto es TEMPORAL — solo para previsualización.
 * NO debe guardarse en la base de datos. Usa uploadImage() para obtener
 * una ruta de archivo físico.
 */
export function optimizeImage(file: File, maxW = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. El máximo es 8MB.`));
      return;
    }

    let effectiveMaxW = maxW;
    let effectiveQuality = quality;
    if (file.size > 2 * 1024 * 1024) {
      effectiveMaxW = Math.min(maxW, 600);
      effectiveQuality = Math.min(quality, 0.65);
    } else if (file.size > 1024 * 1024) {
      effectiveMaxW = Math.min(maxW, 700);
      effectiveQuality = Math.min(quality, 0.7);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > effectiveMaxW) {
            height = (height * effectiveMaxW) / width;
            width = effectiveMaxW;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo procesar la imagen (canvas no disponible)'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', effectiveQuality);

          if (dataUrl.length > 1.5 * 1024 * 1024) {
            const smaller = canvas.toDataURL('image/webp', Math.max(0.45, effectiveQuality - 0.15));
            resolve(smaller);
            return;
          }
          resolve(dataUrl);
        } catch (err) {
          reject(new Error('Error al procesar la imagen: ' + (err instanceof Error ? err.message : String(err))));
        }
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen. ¿Formato no soportado?'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadImage — comprime + sube al servidor + devuelve ruta física
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_TOKEN_KEY = 'diaz-admin-token';

/**
 * Sube una imagen al servidor y devuelve la ruta pública.
 *
 * Flujo:
 *   1. Comprime/convierte a WebP en el cliente (optimizeImage)
 *   2. Convierte el data URL a Blob
 *   3. Envía el Blob vía multipart/form-data a /api/admin/upload
 *   4. El servidor guarda el archivo en public/products/prod-xxx.webp
 *   5. Devuelve la ruta "/products/prod-xxx.webp"
 *
 * Esa ruta es la que se guarda en Product.image — NUNCA el data URL.
 *
 * @param file Archivo de imagen seleccionado por el usuario
 * @param maxW Ancho máximo (default 800px)
 * @param quality Calidad WebP 0-1 (default 0.75)
 * @returns Ruta pública del archivo guardado, ej: "/products/prod-1234567890-a1b2c3.webp"
 */

/**
 * Convierte un data URL (base64) a Blob sin usar fetch (evita bloqueo CSP).
 */
function dataURLtoBlob(dataURL: string): Blob {
  const [meta, base64] = dataURL.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/webp';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadImage(file: File, maxW = 800, quality = 0.75): Promise<string> {
  _activeUploads++;
  try {
    // 1. Comprimir y convertir a WebP en el cliente
    const dataUrl = await optimizeImage(file, maxW, quality);

    // 2. Convertir data URL a Blob (sin usar fetch para evitar bloqueo CSP)
    const blob = dataURLtoBlob(dataUrl);

    // 3. Enviar al servidor vía multipart/form-data
    const formData = new FormData();
    formData.append('file', blob, 'image.webp');

    // Incluir token de admin para autenticación
    const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const uploadResponse = await fetch('/api/admin/products/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!uploadResponse.ok) {
      const err = await uploadResponse.json().catch(() => ({}));
      throw new Error(err.error || `Error al subir (${uploadResponse.status})`);
    }

    const result = await uploadResponse.json();
    return result.path as string; // "/products/prod-xxx.webp"
  } finally {
    _activeUploads--;
  }
}
