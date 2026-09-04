import { requireAdmin, unauthorized } from '@/lib/auth';
import { handleAdminImageUpload } from '@/lib/admin-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/products/upload — sube la foto de un producto.
 *
 * FormData: file (JPG/PNG/WebP/GIF, ≤ 8MB).
 * Devuelve { path: "/products/prod-xxx.webp", url } — `path` es el campo que
 * guarda Product.image (lo consume lib/image-upload.ts uploadImage()).
 */
export async function POST(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  return handleAdminImageUpload(request, { subdir: 'products', prefix: 'prod', maxW: 900, quality: 82 });
}
