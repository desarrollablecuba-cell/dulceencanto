import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  hashPassword,
  verifyPassword,
  isBcryptHash,
  signAdminToken,
} from '@/lib/auth';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/admin/auth
 * Login de admin. Devuelve un JWT firmado.
 *
 * Acepta login por USERNAME o EMAIL:
 *   Body: { username: "admin" } o { username: "correo@dominio.com" }
 *   Body: { email: "correo@dominio.com" } (alternativa)
 *   Body: { password: "..." }
 *
 * El superadmin por defecto usa:
 *   Email:    desarrollablecuba@gmail.com
 *   Password: (definida en DEFAULT_ADMIN_PASSWORD o "Ma/*87.Sa")
 *
 * Response: { token, admin: { id, username, name } }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`admin-login:${ip}`, RATE_LIMITS.login);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const body = await request.json();
    // Aceptar username O email como identificador
    const identifier = String(body.username ?? body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Usuario/email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    if (identifier.length > 100 || password.length > 200) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 400 }
      );
    }

    // ── Auto-seed superadmin si no existe ninguno ──
    // Usa el email por defecto: desarrollablecuba@gmail.com
    // Password: variable de entorno DEFAULT_ADMIN_PASSWORD o "Ma/*87.Sa"
    const adminCount = await db.admin.count();
    if (adminCount === 0) {
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'desarrollablecuba@gmail.com';
      const defaultPass = process.env.DEFAULT_ADMIN_PASSWORD || 'Ma/*87.Sa';
      const hashed = await hashPassword(defaultPass);
      await db.admin.create({
        data: {
          id: 'seed-admin-0',
          username: defaultEmail, // username almacena el email del superadmin
          password: hashed,
          name: 'Super Administrador',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      console.log(`[admin/auth] Superadmin creado: ${defaultEmail}`);
    }

    // ── Buscar admin por username (que puede ser email o username corto) ──
    let admin = await db.admin.findUnique({ where: { username: identifier } });

    // Si no se encontró y el identifier parece un email, buscar también
    // (puede que el admin tenga username distinto del email)
    if (!admin && identifier.includes('@')) {
      // Buscar cualquier admin cuyo username coincida con el email
      admin = await db.admin.findFirst({
        where: { username: { equals: identifier } },
      });
    }

    if (!admin) {
      return NextResponse.json(
        { error: 'Usuario/email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, admin.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'Usuario/email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Migración gradual: si el password estaba en texto plano, hashearlo con bcrypt
    if (!isBcryptHash(admin.password)) {
      try {
        const hashed = await hashPassword(password);
        await db.admin.update({
          where: { id: admin.id },
          data: { password: hashed, updatedAt: new Date().toISOString() },
        });
      } catch (e) {
        console.error('No se pudo migrar password admin a bcrypt:', e);
      }
    }

    // Generar JWT firmado
    const token = signAdminToken({ id: admin.id, username: admin.username });

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
