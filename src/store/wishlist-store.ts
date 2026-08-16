import { create } from 'zustand';

/**
 * WishlistStore
 *
 * Store global para la lista de deseos (favoritos) del cliente.
 *
 * Persistencia:
 *  - Se guarda en `localStorage` (key: `dulce-encanto-wishlist`).
 *  - Se hidrata al montar la app (llamar a `hydrate()` desde un useEffect
 *    en el Header o en page.tsx).
 *
 * Evento global:
 *  - Se emite un CustomEvent `dulce-encanto:wishlist-changed` cada vez que
 *    la lista cambia, para que componentes que no usan Zustand se enteren
 *    (ej: badge contador en el menú hamburguesa).
 *
 * Estructura:
 *  - `items`: array de `productId` strings (sin duplicados).
 *  - `add(productId)`: añade si no existe.
 *  - `remove(productId)`: elimina si existe.
 *  - `toggle(productId)`: añade si no existe, elimina si existe. Devuelve
 *    el nuevo estado (true = está en favoritos).
 *  - `has(productId)`: devuelve true si está en favoritos.
 *  - `clear()`: vacía la lista.
 *  - `count`: getter del número de favoritos.
 */

const STORAGE_KEY = 'dulce-encanto-wishlist';

interface WishlistState {
  items: string[];
  _hydrated: boolean;
  /** Hidrata desde localStorage. Llamar una vez al montar la app. */
  hydrate: () => void;
  /** Añade un producto a favoritos (no-op si ya existe). */
  add: (productId: string) => void;
  /** Elimina un producto de favoritos (no-op si no existe). */
  remove: (productId: string) => void;
  /** Toggle: añade si no existe, elimina si existe. Devuelve el nuevo estado. */
  toggle: (productId: string) => boolean;
  /** Devuelve true si el producto está en favoritos. */
  has: (productId: string) => boolean;
  /** Vacía la lista de favoritos. */
  clear: () => void;
}

function persist(items: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Emitir evento global para componentes que escuchan (no-Zustand).
    window.dispatchEvent(new CustomEvent('dulce-encanto:wishlist-changed', { detail: { items } }));
  } catch { /* ignore */ }
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items: [],
  _hydrated: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          set({ items: parsed.filter((x) => typeof x === 'string'), _hydrated: true });
        }
      }
    } catch { /* ignore */ }
  },

  add: (productId) => {
    const items = get().items;
    if (items.includes(productId)) return;
    const next = [...items, productId];
    set({ items: next });
    persist(next);
  },

  remove: (productId) => {
    const items = get().items;
    if (!items.includes(productId)) return;
    const next = items.filter((id) => id !== productId);
    set({ items: next });
    persist(next);
  },

  toggle: (productId) => {
    const items = get().items;
    const exists = items.includes(productId);
    const next = exists ? items.filter((id) => id !== productId) : [...items, productId];
    set({ items: next });
    persist(next);
    return !exists; // true si ahora está en favoritos, false si se removió
  },

  has: (productId) => get().items.includes(productId),

  clear: () => {
    set({ items: [] });
    persist([]);
  },
}));

// Selector de conteo (para usar en badges sin re-renderizar cuando otros campos cambian)
export const useWishlistCount = () => useWishlistStore((s) => s.items.length);
