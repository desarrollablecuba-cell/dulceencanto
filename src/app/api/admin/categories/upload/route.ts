import { requireAdmin, unauthorized } from '@/lib/auth';
import { handleAdminImageUpload } from '@/lib/admin-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/categories/upload — sube la imagen de una categoría.
 *
 * FormData: file (JPG/PNG/WebP/GIF, ≤ 8MB).
 * Devuelve { url: "/categories/cat-xxx.webp", path } — `url` es el campo que
 * guarda Category.image (lo consume el AdminPanel con ?token=).
 */
export async function POST(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  return handleAdminImageUpload(request, { subdir: 'categories', prefix: 'cat', maxW: 700, quality: 84 });
}
