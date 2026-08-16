import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/admin/auth/verify
 * Verifica si el token JWT del admin es válido.
 * Requiere header Authorization: Bearer <token>.
 */
export async function GET(request: Request) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  return NextResponse.json({
    valid: true,
    admin: {
      adminId: admin.adminId,
      username: admin.username,
    },
  });
}
