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
 * Evento global
 * ------------
 * Para componentes que NO usan Zustand (o que son iframes embebidos), se
 * emite un CustomEvent `dulce-encanto:currency-change` en `window` cada vez
 * que la moneda cambia. Los componentes pueden escucharlo con:
 *
 *   useEffect(() => {
 *     const handler = (e: Event) => setCurrency((e as CustomEvent).detail);
 *     window.addEventListener('dulce-encanto:currency-change', handler);
 *     return () => window.removeEventListener('dulce-encanto:currency-change', handler);
 *   }, []);
 *
 * Constante USD_RATE
 * ------------------
 * Tasa de referencia: 1 USD = 700 CUP. Es la misma que usa ExchangeRatesPage.
 * Si en el futuro se quiere configurar dinámicamente desde el admin, basta
 * con añadir un campo `usdRate` en SiteConfig y sobreescribir esta constante.
 */
export type Currency = 'CUP' | 'USD';

export const USD_RATE = 700;
export const CURRENCY_STORAGE_KEY = 'dulce-encanto-currency';

interface CurrencyState {
  currency: Currency;
  /** Hidratación desde localStorage. Llamar una vez al montar la app. */
  hydrate: () => void;
  /** Cambia la moneda activa. Persiste en localStorage y emite evento global. */
  setCurrency: (c: Currency) => void;
  /** Toggle entre CUP y USD. */
  toggle: () => void;
}

// Inicializa desde localStorage (solo si window está disponible).
// SSR-safe: en el server siempre devuelve 'CUP'.
function getInitialCurrency(): Currency {
  if (typeof window === 'undefined') return 'CUP';
  try {
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved === 'CUP' || saved === 'USD') return saved;
  } catch { /* ignore */ }
  return 'CUP';
}

export const useCurrencyStore = create<CurrencyState>()((set, get) => ({
  currency: getInitialCurrency(),
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (saved === 'CUP' || saved === 'USD') {
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
 *   <span>{formatPrice(1500)}</span>  // "₱1,500" o "$2.14"
 *
 * Convierte CUP → USD dividiendo por USD_RATE (700).
 */
export function formatPrice(cup: number, currency: Currency): string {
  if (currency === 'USD') return `$${(cup / USD_RATE).toFixed(2)}`;
  return `₱${cup.toLocaleString('es-CU')}`;
}
