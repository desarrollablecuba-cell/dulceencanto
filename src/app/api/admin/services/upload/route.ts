import { requireAdmin, unauthorized } from '@/lib/auth';
import { handleAdminImageUpload } from '@/lib/admin-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/services/upload — sube la foto vertical de un servicio.
 *
 * FormData: file (JPG/PNG/WebP/GIF, ≤ 8MB).
 * Devuelve { path: "/services/srv-xxx.webp", url } — `path` es el campo que
 * guarda Service.image (lo consume uploadServiceImage de SectionManagers).
 * Recomendado: fotos verticales 3:4 — son las protagonistas de la card.
 */
export async function POST(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  return handleAdminImageUpload(request, { subdir: 'services', prefix: 'srv', maxW: 1000, quality: 82 });
}
