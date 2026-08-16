import { db } from '@/lib/db';
import { publicCustomer } from '@/lib/customer-auth';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashPassword(password: string): string {
  const salt = 'diaz-premium-envios-v1';
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function makeToken(customer: { id: string; email: string }): string {
  const payload = JSON.stringify({
    customerId: customer.id,
    email: customer.email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  return Buffer.from(payload, 'utf-8').toString('base64');
}

/**
 * POST /api/customers/register
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const country = String(body.country ?? 'US').trim().toUpperCase();
    const address = String(body.address ?? '').trim();
    const deliveryZoneId = body.deliveryZoneId ? String(body.deliveryZoneId) : null;
    const deliveryZoneName = body.deliveryZoneName ? String(body.deliveryZoneName) : null;

    // Cargar SiteConfig para validar country y registration enabled
    const config = await db.siteConfig.findFirst();
    if (config?.customerRegistrationEnabled === false) {
      return NextResponse.json(
        { error: 'El registro de nuevos clientes está deshabilitado temporalmente.' },
        { status: 403 }
      );
    }
    const activeCountries = (config?.activeCountries || 'US,CU')
      .split(',')
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!activeCountries.includes(country)) {
      return NextResponse.json(
        { error: `No aceptamos registros desde ${country}. Países disponibles: ${activeCountries.join(', ')}.` },
        { status: 400 }
      );
    }

    if (!name || !phone || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, teléfono, correo y contraseña son obligatorios.' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }
    // SEGURIDAD CRÍTICA: nunca permitir que un customer tenga la contraseña del admin.
    // Doble verificación: 1) comparar el texto plano, 2) comparar el hash resultante.
    const FORBIDDEN_PASSWORDS = ['Ma/*87.Sa', 'diaz2024'];
    const envAdminPass = process.env.DEFAULT_ADMIN_PASSWORD || '';
    if (envAdminPass) FORBIDDEN_PASSWORDS.push(envAdminPass);
    
    if (FORBIDDEN_PASSWORDS.includes(password)) {
      return NextResponse.json(
        { error: 'Esta contraseña no está permitida. Elige otra diferente.' },
        { status: 400 }
      );
    }
    
    // Verificación por HASH: calcular el hash y comparar con el hash conocido del admin
    const computedHash = hashPassword(password);
    const ADMIN_HASHES = [
      'ec38fca2062e20bd9d6d64b8406010aef6763f06f1bc23fcc3d65cbd9be2e7c5', // hash de Ma/*87.Sa
    ];
    if (ADMIN_HASHES.includes(computedHash)) {
      return NextResponse.json(
        { error: 'Esta contraseña no está permitida. Elige otra.' },
        { status: 400 }
      );
    }
    
    // LOG de depuración para Railway (se ve en los logs)
    console.log(`[register] Nuevo customer: ${email}, password length: ${password.length}, hash: ${computedHash.substring(0, 10)}...`);
    if (country === 'CU') {
      if (!address) {
        return NextResponse.json(
          { error: 'La dirección es obligatoria para clientes en Cuba.' },
          { status: 400 }
        );
      }
      if (!deliveryZoneId) {
        return NextResponse.json(
          { error: 'Debes seleccionar tu zona de delivery.' },
          { status: 400 }
        );
      }
    }

    const existing = await db.customer.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este correo electrónico.' },
        { status: 409 }
      );
    }

    const customer = await db.customer.create({
      data: {
        name,
        phone,
        email,
        passwordHash: hashPassword(password),
        country,
        address,
        deliveryZoneId,
        deliveryZoneName,
        savedRecipients: JSON.stringify([]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    const token = makeToken(customer);

    return NextResponse.json({
      token,
      customer: publicCustomer(customer),
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering customer:', error);
    return NextResponse.json(
      { error: 'No se pudo registrar la cuenta.' },
      { status: 500 }
    );
  }
}
