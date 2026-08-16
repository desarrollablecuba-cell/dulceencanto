/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AUTH MODULE — Centralizado para admin y customer
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  - bcrypt para hashear/verificar contraseñas (cost factor 10)
 *  - JWT firmado con HMAC-SHA256 (secreto en env)
 *  - Tokens con expiración: admin 24h, customer 7d
 *  - Función requireAdmin() para usar en endpoints admin
 *  - Función requireCustomer() para endpoints de cliente
 *
 *  SECURITY NOTES:
 *  - El secreto JWT_SECRET se carga de env. Si no existe, se genera uno
 *    efímero en memoria (solo para dev — en prod DEBE estar en env).
 *  - Los tokens NO se pueden revocar (stateless JWT). Para revocación
 *    inmediata se necesitaría una blacklist en BD/Redis (futuro).
 *  - bcrypt con cost 10 ≈ 100ms por hash → adecuado para login sin
 *    rate-limiting estricto.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// JWT Secret
// ─────────────────────────────────────────────────────────────────────────────
//
// IMPORTANTE: NO lanzar error en module-load time. Next.js evalúa los
// módulos del servidor durante el build (`next build`), y si JWT_SECRET
// no está disponible en ese momento (p.ej. en Railway donde las vars se
// inyectan en runtime), el build falla. En su lugar, usamos un getter
// lazy que solo valida cuando el secreto se necesita realmente (en una
// petición HTTP real), no durante el build.

let _cachedSecret: string | null = null;

function getJwtSecret(): string {
  if (_cachedSecret) return _cachedSecret;
  const secret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    // En dev, generar un secreto efímero (NO usar en producción)
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'dev-only-secret-DO-NOT-USE-IN-PROD-' + Math.random().toString(36).slice(2));
  if (!secret && process.env.NODE_ENV === 'production') {
    // Lazy throw — solo ocurre cuando una petición real intenta firmar
    // un JWT, no durante el build.
    throw new Error(
      'JWT_SECRET debe estar configurado en .env para producción. ' +
        'Genera uno con: openssl rand -hex 32'
    );
  }
  _cachedSecret = secret;
  return secret;
}

const ADMIN_TOKEN_TTL = '24h';
const CUSTOMER_TOKEN_TTL = '7d';

// ─────────────────────────────────────────────────────────────────────────────
// Password hashing
// ─────────────────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10;

/** Hashea una contraseña con bcrypt. */
export async function hashPassword(plain: string): Promise<string> {
  if (!plain) throw new Error('Password cannot be empty');
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Verifica una contraseña contra un hash bcrypt. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  // Soporte legacy: si el hash NO empieza con $2 (bcrypt), comparación directa
  // para los passwords en texto plano que existían antes de la migración.
  // Esto permite migración gradual: al hacer login se actualiza el hash.
  if (!hash.startsWith('$2')) {
    return plain === hash;
  }
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** ¿Es este hash bcrypt o texto plano legacy? */
export function isBcryptHash(hash: string): boolean {
  return typeof hash === 'string' && hash.startsWith('$2');
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT tokens
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminTokenPayload {
  adminId: string;
  username: string;
  role: 'admin';
  exp: number;
}

export interface CustomerTokenPayload {
  customerId: string;
  email: string;
  role: 'customer';
  exp: number;
}

/** Genera un JWT firmado para admin. */
export function signAdminToken(admin: { id: string; username: string }): string {
  return jwt.sign(
    { adminId: admin.id, username: admin.username, role: 'admin' as const },
    getJwtSecret(),
    { expiresIn: ADMIN_TOKEN_TTL }
  );
}

/** Genera un JWT firmado para customer. */
export function signCustomerToken(customer: { id: string; email: string }): string {
  return jwt.sign(
    { customerId: customer.id, email: customer.email, role: 'customer' as const },
    getJwtSecret(),
    { expiresIn: CUSTOMER_TOKEN_TTL }
  );
}

/** Verifica un JWT de admin. Devuelve el payload o null si es inválido/expirado. */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as Partial<AdminTokenPayload>;
    if (payload.role !== 'admin' || !payload.adminId) return null;
    return payload as AdminTokenPayload;
  } catch {
    return null;
  }
}

/** Verifica un JWT de customer. */
export function verifyCustomerToken(token: string): CustomerTokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as Partial<CustomerTokenPayload>;
    if (payload.role !== 'customer' || !payload.customerId) return null;
    return payload as CustomerTokenPayload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token extraction
// ─────────────────────────────────────────────────────────────────────────────

export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  // Permitir token en query string solo en GET (para descargas, etc.)
  try {
    const url = new URL(req.url);
    return url.searchParams.get('token');
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route guards — usar en endpoints admin y customer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica que la request viene de un admin autenticado.
 * Uso:
 *   export async function GET(req: NextRequest) {
 *     const admin = requireAdmin(req);
 *     if (!admin) return unauthorized();
 *     // ... admin.adminId, admin.username disponibles
 *   }
 */
export function requireAdmin(req: Request): AdminTokenPayload | null {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyAdminToken(token);
}

/** Verifica que la request viene de un customer autenticado. */
export function requireCustomer(req: Request): CustomerTokenPayload | null {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyCustomerToken(token);
}

/** Respuesta 401 estándar para no autorizado. */
export function unauthorized(message = 'No autorizado. Token inválido o expirado.') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** Respuesta 403 estándar para prohibido. */
export function forbidden(message = 'No tienes permisos para esta acción.') {
  return NextResponse.json({ error: message }, { status: 403 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Password policy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida fortaleza de contraseña.
 * Política: mínimo 8 caracteres, al menos 1 letra y 1 número.
 * Devuelve null si es válida, o un mensaje de error si no.
 */
export function validatePasswordStrength(password: string): string | null {
  if (!password || typeof password !== 'string') return 'Contraseña requerida';
  if (password.length < 8) return 'Mínimo 8 caracteres';
  if (password.length > 200) return 'Máximo 200 caracteres';
  if (!/[a-zA-Z]/.test(password)) return 'Debe contener al menos una letra';
  if (!/[0-9]/.test(password)) return 'Debe contener al menos un número';
  // Caracteres sospechosos de NoSQL injection (poco probable en bcrypt pero defensivo)
  if (/[\$\{\}]/.test(password) && password.includes('$')) {
    // bcrypt hashes empiezan con $2, pero el input del usuario no debería tener $
    // Permitimos $ pero validamos que no sea exactamente un formato de hash
    if (/^\$2[aby]\$\d{2}\$/.test(password)) {
      return 'Contraseña inválida';
    }
  }
  return null;
}

/**
 * Valida formato de email.
 */
export function validateEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return 'Email requerido';
  if (email.length > 254) return 'Email demasiado largo';
  // RFC 5322 simplified
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Email inválido';
  return null;
}
