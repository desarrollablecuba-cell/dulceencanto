/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEXT.JS PROXY — Security headers + CORS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Se ejecuta en cada request. Añade headers de seguridad (CSP, X-Frame,
 *  etc.) y maneja CORS.
 *
 *  Exporta tanto `proxy` (named) como `default` para compatibilidad con
 *  todas las versiones de Next.js 16.x.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function handleProxy(req: NextRequest) {
  const res = NextResponse.next();
  const isProd = process.env.NODE_ENV === 'production';
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');

  // ── CORS ─────────────────────────────────────────────────────────────────
  const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get('origin');
  if (origin && corsOrigins.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers });
    }
  }

  // ── HSTS (solo en producción HTTPS) ──────────────────────────────────────
  if (isProd && proto === 'https') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  // ── Security headers ─────────────────────────────────────────────────────
  // X-Frame-Options SAMEORIGIN permite embeber en iframes del mismo origen
  // (necesario para vistas previas). En producción se puede cambiar a DENY
  // si no se necesita embeber.
  res.headers.set('X-Frame-Options', isProd ? 'DENY' : 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()');

  // ── CSP ──────────────────────────────────────────────────────────────────
  // frame-ancestors permite embeber la app en iframes del mismo origen
  // (necesario para vistas previas como Z.AI). En producción se puede
  // restringir más si no se necesita embeber.
  const frameAncestors = isProd ? "'self'" : "'self' *";
  const cspDirectives = [
    "default-src 'self'",
    isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "connect-src 'self' data: https: ws: wss:",
    `frame-ancestors ${frameAncestors}`,
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ];
  res.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  return res;
}

// Exportar tanto named como default para máxima compatibilidad
export const proxy = handleProxy;
export default handleProxy;

export const config = {
  // Aplicar a todas las rutas excepto assets estáticos reales.
  // IMPORTANTE: NO excluir "products" o "categories" porque eso también
  // excluiría las rutas API /api/products y /api/categories.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
