import { create } from 'zustand';

/**
 * Moneda activa en toda la tienda.
 *
 * Historia
 * --------
 * Antes de esta store, cada componente (CatalogView, TopSellingCarousel,
 * ServicesSection) tenía su propio `useState<'CUP' | 'USD'>('CUP')` local.
 * Eso significaba que el cliente tenía que cambiar la moneda en cada página
 * individualmente, y al navegar entre vistas el toggle se reseteaba.
 *
 * Con esta store global, el cliente elige CUP/USD una sola vez (desde el
 * Header) y TODOS los componentes que consumen `useCurrencyStore` se
 * actualizan automáticamente. La preferencia se persiste en localStorage
 * para sobrevivir recargas.
 *
 * REGLA DE NEGOCIO (importante)
 * -----------------------------
 * - La moneda POR DEFECTO de la tienda es USD (todos los precios se
 *   muestran en dólares al entrar sin preferencia guardada).
 * - EXCEPCIÓN: los productos de VENTA DIRECTA (buffet, dulces sueltos,
 *   productos sin reserva) se muestran SIEMPRE en CUP (peso cubano),
 *   porque se pagan localmente en efectivo. Ver `isDirectSaleProduct()`
 *   y `currencyForProduct()`.
 *
 * Hidratación SSR (fix de "Hydration failed")
 * -------------------------------------------
 * El valor inicial de la store es SIEMPRE el default (USD), tanto en el
 * server como en el primer render del cliente. La preferencia guardada en
 * localStorage se aplica DESPUÉS del montaje vía `hydrate()` (la llama el
 * Header). Así el HTML del server y el primer render del cliente
 * coinciden y React no falla con un mismatch.
 *
 * Evento global
 * ------------
 * Para componentes que NO usan Zustand (o que son iframes embebidos), se
 * emite un CustomEvent `dulce-encanto:currency-change` en `window` cada vez
 * que la moneda cambia.
 *
 * Constante USD_RATE
 * ------------------
 * Tasa de referencia: 1 USD = 700 CUP. Es la misma que usa ExchangeRatesPage.
 */
export type Currency = 'CUP' | 'USD';

export const USD_RATE = 700;
export const CURRENCY_STORAGE_KEY = 'dulce-encanto-currency';
/** Moneda por defecto de la tienda (coincide en server y cliente). */
export const DEFAULT_CURRENCY: Currency = 'USD';

interface CurrencyState {
  currency: Currency;
  /** Hidratación desde localStorage. Llamar una vez al montar la app. */
  hydrate: () => void;
  /** Cambia la moneda activa. Persiste en localStorage y emite evento global. */
  setCurrency: (c: Currency) => void;
  /** Toggle entre CUP y USD. */
  toggle: () => void;
}

export const useCurrencyStore = create<CurrencyState>()((set, get) => ({
  // SSR-safe: el server y el primer render del cliente arrancan con el
  // mismo default. localStorage se lee solo en hydrate() (post-montaje).
  currency: DEFAULT_CURRENCY,
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if ((saved === 'CUP' || saved === 'USD') && saved !== get().currency) {
        set({ currency: saved });
        // Emitir evento para que componentes que no usan Zustand se actualicen.
        window.dispatchEvent(new CustomEvent('dulce-encanto:currency-change', { detail: saved }));
      }
    } catch { /* ignore */ }
  },
  setCurrency: (c) => {
    set({ currency: c });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CURRENCY_STORAGE_KEY, c);
        // Emitir evento global para componentes que escuchan (no-Zustand).
        window.dispatchEvent(new CustomEvent('dulce-encanto:currency-change', { detail: c }));
      } catch { /* ignore */ }
    }
  },
  toggle: () => {
    const next: Currency = get().currency === 'CUP' ? 'USD' : 'CUP';
    get().setCurrency(next);
  },
}));

/**
 * Hook de utilidad para formatear precios en la moneda activa.
 *
 *   const { currency, formatPrice } = useCurrency();
 *   <span>{formatPrice(1500)}</span>  // "$2.14" o "₱1,500"
 *
 * Convierte CUP → USD dividiendo por USD_RATE (700).
 */
export function formatPrice(cup: number, currency: Currency): string {
  if (currency === 'USD') return `$${(cup / USD_RATE).toFixed(2)}`;
  return `₱${cup.toLocaleString('es-CU')}`;
}

// ─── REGLA: venta directa se muestra en CUP ─────────────────────────────────

interface SaleProductLike {
  reservationEnabled?: boolean;
  category?: { section?: string } | null;
}

/**
 * Determina si un producto es de VENTA DIRECTA (se paga local en CUP).
 *
 * La sección de la categoría manda (configurable desde el admin):
 *  - category.section === 'immediate'  → venta directa
 *  - category.section === 'reservation' → por reserva
 *  - 'ambas' (o sin sección): decide el flag del producto
 *    (`reservationEnabled === false` → venta directa).
 */
export function isDirectSaleProduct(p?: SaleProductLike | null): boolean {
  if (!p) return false;
  const section = p.category?.section;
  if (section === 'immediate') return true;
  if (section === 'reservation') return false;
  return !p.reservationEnabled;
}

/**
 * Moneda en la que debe MOSTRARSE un producto concreto.
 * V52.8 (petición del negocio): venta directa → SIEMPRE CUP;
 * reservables (tortas, pasteles, dulces finos, buffet) → SIEMPRE USD,
 * sin importar el toggle global. El toggle queda solo para referencias
 * informativas (tasas de cambio, etc.).
 */
export function currencyForProduct(
  _p: SaleProductLike | null | undefined,
  _globalCurrency: Currency
): Currency {
  return isDirectSaleProduct(_p) ? 'CUP' : 'USD';
}
