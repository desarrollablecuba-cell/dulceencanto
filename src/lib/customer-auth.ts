/**
 * Customer authentication utilities.
 * 
 * Adaptado para Prisma: savedRecipients ahora es un String (JSON) en la BD,
 * no un array. Esta función lo parsea a array al devolverlo al cliente.
 */

export interface CustomerTokenPayload {
  customerId: string;
  email: string;
  exp: number;
}

export function decodeCustomerToken(token: string): CustomerTokenPayload | null {
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(json) as CustomerTokenPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCustomerTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  const url = new URL(req.url);
  return url.searchParams.get('token');
}

/**
 * Elimina el passwordHash y parsea savedRecipients de String a array.
 * Compatible con Prisma (donde savedRecipients es String) y con el
 * JSON store antiguo (donde era array).
 */
export function publicCustomer<T extends Record<string, unknown>>(c: T): Omit<T, 'passwordHash'> {
  const { passwordHash, ...rest } = c;
  const result = rest as Record<string, unknown>;
  // Parsear savedRecipients si es string (Prisma) o dejarlo si ya es array (legacy).
  if (typeof result.savedRecipients === 'string') {
    try {
      result.savedRecipients = JSON.parse(result.savedRecipients);
    } catch {
      result.savedRecipients = [];
    }
  }
  if (result.savedRecipients == null) {
    result.savedRecipients = [];
  }
  return result as Omit<T, 'passwordHash'>;
}
