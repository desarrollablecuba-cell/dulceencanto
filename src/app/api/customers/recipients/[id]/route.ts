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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getCustomerTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const payload = decodeCustomerToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const customer = await db.customer.findUnique({ where: { id: payload.customerId } });
    if (!customer) return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });

    const recipients = parseRecipients(customer.savedRecipients);
    const newRecipients = recipients.map((r: any) =>
      r.id === id ? { ...r, ...body, updatedAt: new Date().toISOString() } : r
    );
    await db.customer.update({
      where: { id: payload.customerId },
      data: { savedRecipients: JSON.stringify(newRecipients) },
    });

    return NextResponse.json({ recipient: newRecipients.find((r: any) => r.id === id) });
  } catch (error) {
    console.error('Error updating recipient:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getCustomerTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const payload = decodeCustomerToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

    const { id } = await params;
    const customer = await db.customer.findUnique({ where: { id: payload.customerId } });
    if (!customer) return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });

    const recipients = parseRecipients(customer.savedRecipients);
    const newRecipients = recipients.filter((r: any) => r.id !== id);
    await db.customer.update({
      where: { id: payload.customerId },
      data: { savedRecipients: JSON.stringify(newRecipients) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipient:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}
