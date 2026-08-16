import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publicCustomer } from '@/lib/customer-auth';
import { requireAdmin, unauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/customers
 * Lista todos los clientes (o filtra por q en name/email/phone).
 *
 * Nota de seguridad: igual que /api/admin/products y /api/admin/orders,
 * este endpoint asume que el frontend ya validó el login del admin (token
 * en localStorage). En una futura iteración debería añadirse verifyAdminToken
 * a todos los endpoints admin de forma consistente.
 */
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    const customers = await db.customer.findMany({
      where: q ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(customers.map(c => publicCustomer(c)));
  } catch (error) {
    console.error('Error fetching customers:', error);
    // Devolver array vacío en error para que el frontend no rompa
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const body = await request.json();
    const { name, phone, email, password, country, address } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    // SEGURIDAD CRÍTICA: nunca permitir que un customer tenga la contraseña del admin.
    // Doble verificación: texto plano + hash.
    const FORBIDDEN_PASSWORDS = ['Ma/*87.Sa', 'diaz2024'];
    const envAdminPass = process.env.DEFAULT_ADMIN_PASSWORD || '';
    if (envAdminPass) FORBIDDEN_PASSWORDS.push(envAdminPass);
    if (FORBIDDEN_PASSWORDS.includes(password)) {
      return NextResponse.json(
        { error: 'Esta contraseña no está permitida para clientes.' },
        { status: 400 }
      );
    }
    // Verificar también por hash
    const ADMIN_HASHES = [
      'ec38fca2062e20bd9d6d64b8406010aef6763f06f1bc23fcc3d65cbd9be2e7c5',
    ];
    const testHash = crypto.createHash('sha256').update(`diaz-premium-envios-v1:${password}`).digest('hex');
    if (ADMIN_HASHES.includes(testHash)) {
      return NextResponse.json(
        { error: 'Esta contraseña no está permitida para clientes.' },
        { status: 400 }
      );
    }

    const salt = 'diaz-premium-envios-v1';
    const passwordHash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');

    const existing = await db.customer.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con este email.' },
        { status: 409 }
      );
    }

    const customer = await db.customer.create({
      data: {
        name: name || '',
        phone: phone || '',
        email,
        passwordHash,
        country: country || 'US',
        address: address || '',
        savedRecipients: '[]',
      },
    });

    return NextResponse.json(publicCustomer(customer), { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Error del servidor.' },
      { status: 500 }
    );
  }
}
