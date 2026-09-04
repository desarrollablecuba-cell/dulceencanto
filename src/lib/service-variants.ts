/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SERVICE VARIANTS — Variantes de un Servicio para Eventos (V52.5)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Un servicio puede venderse en varias "variantes" con foto y precio
 *  propios. Ejemplo del negocio:
 *
 *    Servicio : Muñeco Sorpresa
 *    Variantes: 🤡 Payasita · 🐰 Conejo Chispa · 🐰 Coneja Maricusa
 *
 *  Se guarda como JSON string en Service.variants (compatible con SQLite y
 *  MySQL sin tocar tipos de columna):
 *
 *    [{ "id": "var-1", "name": "Payasita", "image": "/services/xxx.webp",
 *       "priceUsd": 3.57, "active": true, "order": 0 }]
 *
 *  Reglas de negocio:
 *   · priceUsd es OPCIONAL por variante: si falta (0), se usa el precio del
 *     servicio padre (así una variante puede compartir precio).
 *   · El ADMIN edita precios SOLO EN USD (petición del negocio); el CUP se
 *     deriva automáticamente con la tasa de referencia 700 (USD_RATE).
 *   · priceCup = priceUsd * 700 al guardar desde el admin (para que la
 *     tienda siga mostrando ambas monedas sin romper Railway).
 *   · Las variantes INACTIVAS no se muestran en la tienda, pero se
 *     conservan en el admin.
 */

/** Tasa de referencia 1 USD = 700 CUP (misma que currency-store/ExchangeRatesPage). */
export const SERVICE_USD_RATE = 700;

export interface ServiceVariant {
  id: string;
  name: string;
  /** Foto propia de la variante (vertical 3:4 recomendado). */
  image: string;
  /** Precio USD de la variante. 0 = usar el precio del servicio padre. */
  priceUsd: number;
  active: boolean;
  order: number;
}

/** Variantes demo/sema del servicio Muñeco Sorpresa (fotos reales). */
export const DEMO_MUNECO_VARIANTS: ServiceVariant[] = [
  { id: 'var-payasita', name: 'Payasita', image: '/services/srv-munecos-real.webp', priceUsd: 0, active: true, order: 0 },
  { id: 'var-conejo-chispa', name: 'Conejo Chispa', image: '/services/srv-vari-conejo-chispa.webp', priceUsd: 0, active: true, order: 1 },
  { id: 'var-coneja-maricusa', name: 'Coneja Maricusa', image: '/services/srv-vari-coneja-maricusa.webp', priceUsd: 0, active: true, order: 2 },
];

/**
 * Parsea las variantes de forma defensiva. Acepta:
 *  · string JSON (como llega de la BD: Service.variants)
 *  · array ya parseado (como lo envía el admin en el PUT/POST)
 * Devuelve SIEMPRE un array válido (filtrando entradas sin nombre).
 */
export function parseServiceVariants(raw: unknown): ServiceVariant[] {
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return (arr as Record<string, unknown>[])
    .filter((v) => Boolean(v) && typeof v === 'object' && typeof v.name === 'string' && v.name.trim() !== '')
    .map((v, i) => ({
      id: typeof v.id === 'string' && v.id ? v.id : `var-${Date.now().toString(36)}-${i}`,
      name: String(v.name).slice(0, 80),
      image: typeof v.image === 'string' ? v.image : '',
      priceUsd: Number.isFinite(Number(v.priceUsd)) ? Number(v.priceUsd) : 0,
      active: v.active !== false,
      order: Number.isFinite(Number(v.order)) ? Number(v.order) : i,
    }))
    .sort((a, b) => a.order - b.order);
}

/** Serializa variantes para guardarlas en Service.variants (JSON string). */
export function serializeServiceVariants(variants: ServiceVariant[]): string {
  return JSON.stringify(
    variants.map((v, i) => ({
      id: v.id || `var-${Date.now().toString(36)}-${i}`,
      name: String(v.name || '').slice(0, 80),
      image: String(v.image || ''),
      priceUsd: Number(v.priceUsd) || 0,
      active: v.active !== false,
      order: Number.isFinite(v.order) ? v.order : i,
    }))
  );
}

/** ¿El servicio tiene variantes visibles en la tienda? */
export function hasActiveVariants(raw: unknown): boolean {
  return parseServiceVariants(raw).some((v) => v.active);
}

/**
 * Precio USD efectivo de una variante (fallback al precio del padre).
 * El CUP se deriva con la tasa de referencia.
 */
export function variantEffectiveUsd(variant: ServiceVariant, fallbackUsd: number): number {
  return variant.priceUsd > 0 ? variant.priceUsd : fallbackUsd;
}

export function variantEffectiveCup(variant: ServiceVariant, fallbackUsd: number): number {
  return Math.round(variantEffectiveUsd(variant, fallbackUsd) * SERVICE_USD_RATE);
}

/** Precio "Desde" USD de un servicio con variantes (mínimo entre variantes). */
export function serviceFromUsd(fallbackUsd: number, variants: ServiceVariant[]): number {
  const active = variants.filter((v) => v.active);
  if (active.length === 0) return fallbackUsd;
  const prices = active.map((v) => variantEffectiveUsd(v, fallbackUsd));
  return Math.min(...prices);
}
