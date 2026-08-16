import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decodeCustomerToken, getCustomerTokenFromRequest, publicCustomer } from '@/lib/customer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/me
 * Devuelve el cliente autenticado (sin passwordHash) con sus destinatarios guardados.
 */
export async function GET(request: NextRequest) {
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

    return NextResponse.json({ customer: publicCustomer(customer) });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}
