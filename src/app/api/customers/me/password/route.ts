import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decodeCustomerToken, getCustomerTokenFromRequest, publicCustomer } from '@/lib/customer-auth';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashPassword(password: string): string {
  const salt = 'diaz-premium-envios-v1';
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

/**
 * PUT /api/customers/me/password
 * Cambia la contraseña del cliente autenticado.
 * Body: { currentPassword, newPassword }
 */
export async function PUT(request: NextRequest) {
  try {
    const token = getCustomerTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }
    const payload = decodeCustomerToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
    }

    const customer = await db.customer.findUnique({ where: { id: payload.customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Ambas contraseñas son obligatorias.' }, { status: 400 });
    }

    // Verificar contraseña actual
    if (customer.passwordHash !== hashPassword(currentPassword)) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 401 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const updated = await db.customer.update({
      where: { id: customer.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return NextResponse.json({ customer: publicCustomer(updated) });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}
