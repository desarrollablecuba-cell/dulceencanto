import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publicCustomer } from '@/lib/customer-auth';
import { requireAdmin, unauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * /api/admin/customers/[id]
 * 
 * Nota de seguridad: alineado con /api/admin/products/[id] y
 * /api/admin/orders/[id] que no validan token en cada request.
 * El frontend ya validó el login del admin.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { id } = await params;
    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    }
    return NextResponse.json(publicCustomer(customer));
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    for (const key of ['name', 'phone', 'email', 'country', 'address', 'deliveryZoneId', 'deliveryZoneName']) {
      if (key in body) data[key] = body[key];
    }

    const customer = await db.customer.update({
      where: { id },
      data,
    });

    return NextResponse.json(publicCustomer(customer));
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { id } = await params;
    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}
