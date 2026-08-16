import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decodeCustomerToken, getCustomerTokenFromRequest } from '@/lib/customer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseRecipients(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const token = getCustomerTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const payload = decodeCustomerToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });

    const customer = await db.customer.findUnique({ where: { id: payload.customerId } });
    if (!customer) return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });

    return NextResponse.json({ recipients: parseRecipients(customer.savedRecipients) });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getCustomerTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const payload = decodeCustomerToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });

    const body = await request.json();
    const newRecipient = {
      id: `rcp-${Date.now()}`,
      label: String(body.label ?? '').trim(),
      name: String(body.name ?? '').trim(),
      phone: String(body.phone ?? '').trim(),
      address: String(body.address ?? '').trim(),
      notes: String(body.notes ?? '').trim(),
      deliveryZoneId: body.deliveryZoneId ? String(body.deliveryZoneId) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const customer = await db.customer.findUnique({ where: { id: payload.customerId } });
    if (!customer) return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });

    const updatedRecipients = [...parseRecipients(customer.savedRecipients), newRecipient];
    await db.customer.update({
      where: { id: payload.customerId },
      data: { savedRecipients: JSON.stringify(updatedRecipients) },
    });

    return NextResponse.json({ recipient: newRecipient }, { status: 201 });
  } catch (error) {
    console.error('Error creating recipient:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}
