import { db } from '@/lib/db';
import { publicCustomer } from '@/lib/customer-auth';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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
 * POST /api/customers/login
 * Body: { email, password }
 *
 * Rate limited: 3 intentos por 10 min por IP; bloqueo de 10 min tras
 * agotar los intentos.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: 3 intentos / 10 min, bloqueo 10 min ──
    const ip = getClientIp(request);
    const rl = checkRateLimit(`customer-login:${ip}`, {
      maxAttempts: 3,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    const customer = await db.customer.findUnique({ where: { email } });
    if (!customer || customer.passwordHash !== hashPassword(password)) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    const token = makeToken(customer);

    return NextResponse.json({
      token,
      customer: publicCustomer(customer),
    });
  } catch (error) {
    console.error('Error logging in customer:', error);
    return NextResponse.json(
      { error: 'No se pudo iniciar sesión.' },
      { status: 500 }
    );
  }
}
