import { requireAdmin, unauthorized } from '@/lib/auth';
import { handleAdminImageUpload } from '@/lib/admin-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/gallery/upload — sube una foto a la galería.
 *
 * FormData: file (JPG/PNG/WebP/GIF, ≤ 8MB).
 * Devuelve { url: "/gallery/gal-xxx.webp", path } — `url` es el campo que
 * guarda GalleryPhoto.image (lo consume uploadGalleryImage de SectionManagers).
 */
export async function POST(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  return handleAdminImageUpload(request, { subdir: 'gallery', prefix: 'gal', maxW: 1400, quality: 82 });
}
