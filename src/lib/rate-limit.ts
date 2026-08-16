/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  RATE LIMITER — Limita intentos por IP para evitar brute force
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Implementación en memoria (sirve para single-instance como VPS Hostinger).
 *  Para multi-instance (multiple PM2 workers o Kubernetes) habría que usar
 *  Redis como backend — pendiente para SaaS multitenant escalado.
 *
 *  Uso:
 *    import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
 *
 *    export async function POST(req: NextRequest) {
 *      const ip = getClientIp(req);
 *      const { allowed, retryAfter } = checkRateLimit(`login:${ip}`, RATE_LIMITS.login);
 *      if (!allowed) {
 *        return NextResponse.json(
 *          { error: 'Demasiados intentos. Intenta en ' + retryAfter + 's' },
 *          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
 *        );
 *      }
 *      // ... procesar login
 *    }
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockUntil: number;
}

// Map en memoria. Se limpia automáticamente de entradas viejas cada 5 min.
const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 min
let lastCleanup = Date.now();

export interface RateLimitConfig {
  /** Número máximo de intentos en la ventana. */
  maxAttempts: number;
  /** Tamaño de la ventana en ms. */
  windowMs: number;
  /** Tiempo de bloqueo tras agotar intentos, en ms. */
  blockMs: number;
}

export const RATE_LIMITS = {
  /** Login admin: 5 intentos por 15 min, bloqueo 15 min. */
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 },
  /** Login customer: 5 intentos por 15 min, bloqueo 15 min. */
  customerLogin: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 },
  /** Register customer: 3 por hora por IP. */
  register: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
  /** Crear orden: 10 por minuto (anti-spam). */
  createOrder: { maxAttempts: 10, windowMs: 60 * 1000, blockMs: 60 * 1000 },
  /** API pública general: 60 por minuto. */
  api: { maxAttempts: 60, windowMs: 60 * 1000, blockMs: 60 * 1000 },
} as const;

/**
 * Verifica si una acción está permitida bajo el rate limit.
 * Devuelve:
 *   - allowed: true si se permite, false si está bloqueado
 *   - retryAfter: segundos hasta que se permita de nuevo (0 si allowed)
 *   - remaining: intentos restantes en la ventana actual
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter: number; remaining: number } {
  // Cleanup periódico
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [k, v] of store.entries()) {
      if (now - v.firstAttempt > config.windowMs && now > v.blockUntil) {
        store.delete(k);
      }
    }
    lastCleanup = now;
  }

  const entry = store.get(key);

  // Si está bloqueado, devolver retryAfter
  if (entry && now < entry.blockUntil) {
    const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  // Si no hay entrada o la ventana expiró, crear nueva
  if (!entry || now - entry.firstAttempt > config.windowMs) {
    store.set(key, { count: 1, firstAttempt: now, blockUntil: 0 });
    return { allowed: true, retryAfter: 0, remaining: config.maxAttempts - 1 };
  }

  // Incrementar contador
  entry.count += 1;
  if (entry.count > config.maxAttempts) {
    entry.blockUntil = now + config.blockMs;
    const retryAfter = Math.ceil(config.blockMs / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  return {
    allowed: true,
    retryAfter: 0,
    remaining: config.maxAttempts - entry.count,
  };
}

/** Extrae la IP del cliente de la request, considerando proxies. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for puede ser "client, proxy1, proxy2"
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  // Fallback
  return 'unknown';
}
