import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, unauthorized, hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * PUT/POST /api/admin/auth/profile
 * Permite al admin autenticado cambiar su propia contraseña.
 *
 * Body: { newPassword: string }
 * Requiere header Authorization: Bearer <token-admin>.
 *
 * Validaciones:
 *  - Token admin válido (sino 401)
 *  - newPassword presente y >= 8 caracteres (sino 400)
 *
 * Respuesta:
 *  - 200 { success: true }
 *  - 400 { error: 'La contraseña debe tener al menos 8 caracteres' }
 *  - 401 { error: 'No autorizado...' }
 *  - 500 { error: 'Error del servidor' }
 */
async function handleChangePassword(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return unauthorized();

  try {
    const body = await request.json();
    const newPassword = String(body?.newPassword ?? '');

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(newPassword);
    await db.admin.update({
      where: { id: admin.adminId },
      data: { password: hashed, updatedAt: new Date().toISOString() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating admin password:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}

export const PUT = handleChangePassword;
export const POST = handleChangePassword;
