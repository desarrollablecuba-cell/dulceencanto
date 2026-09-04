import { requireAdmin, unauthorized } from '@/lib/auth';
import { handleAdminImageUpload } from '@/lib/admin-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/sections/upload — sube la imagen grande de una sección del
 * home (Venta Directa, Reservas, Servicios, Promociones, Galería).
 *
 * FormData: file (JPG/PNG/WebP/GIF, ≤ 8MB).
 * Devuelve { url: "/sections/sec-xxx.webp", path } — `url` se guarda en
 * SiteConfig.sectionImages[id] (lo consume SectionImagesEditor de SectionManagers).
 */
export async function POST(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  return handleAdminImageUpload(request, { subdir: 'sections', prefix: 'sec', maxW: 1600, quality: 82 });
}
