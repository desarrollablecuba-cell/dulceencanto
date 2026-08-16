import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decodeCustomerToken, getCustomerTokenFromRequest, publicCustomer } from '@/lib/customer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/customers/me/profile
 * Actualiza los campos editables del perfil del cliente autenticado.
 * Body: { name?, phone?, email?, country?, address?, deliveryZoneId?, deliveryZoneName? }
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
    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      }
      data.name = name;
    }

    if (typeof body.phone === 'string') {
      data.phone = body.phone.trim();
    }

    if (typeof body.email === 'string') {
      const email = body.email.trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: 'El correo es obligatorio.' }, { status: 400 });
      }
      // Verificar email único si cambió
      if (email !== customer.email) {
        const existing = await db.customer.findUnique({ where: { email } });
        if (existing) {
          return NextResponse.json({ error: 'Ya existe una cuenta con este correo.' }, { status: 409 });
        }
      }
      data.email = email;
    }

    if (typeof body.country === 'string') {
      data.country = body.country.trim().toUpperCase();
    }

    if (typeof body.address === 'string') {
      data.address = body.address.trim();
    }

    if (body.deliveryZoneId !== undefined) {
      data.deliveryZoneId = body.deliveryZoneId ? String(body.deliveryZoneId) : null;
    }

    if (typeof body.deliveryZoneName === 'string') {
      data.deliveryZoneName = body.deliveryZoneName || null;
    }

    // Si el país es Cuba, validar que tenga dirección y zona
    const finalCountry = (data.country as string) || customer.country;
    if (finalCountry === 'CU') {
      const finalAddress = (data.address as string) ?? customer.address;
      const finalZoneId = (data.deliveryZoneId as string | null) ?? customer.deliveryZoneId;
      if (!finalAddress) {
        return NextResponse.json({ error: 'La dirección es obligatoria para clientes en Cuba.' }, { status: 400 });
      }
      if (!finalZoneId) {
        return NextResponse.json({ error: 'Debes seleccionar tu zona de delivery.' }, { status: 400 });
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 });
    }

    const updated = await db.customer.update({
      where: { id: customer.id },
      data,
    });

    return NextResponse.json({ customer: publicCustomer(updated) });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}
