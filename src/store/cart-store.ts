import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  price: number; // Precio unitario actual (puede cambiar según cantidad por wholesale)
  basePrice: number; // Precio unitario sin variantes/extras (para recalcular wholesale)
  image: string;
  quantity: number;
  stock?: number; // stock disponible del producto (para validar al agregar)
  /**
   * JSON string con las opciones de variantes seleccionadas.
   * Formato: [{ groupName: string, optionName: string, optionId?: string }]
   * Se persiste tal cual en el OrderItem cuando se crea el pedido.
   */
  variantInfo?: string;
  /**
   * JSON string con los extras seleccionados.
   * Formato: [{ name: string, price: number }]
   * Se persiste tal cual en el OrderItem cuando se crea el pedido.
   */
  extrasInfo?: string;
  // ── Wholesale (precios al por mayor) ──
  // Se guardan en el carrito para poder recalcular el precio cuando
  // el usuario cambia la cantidad en el checkout.
  wholesaleEnabled?: boolean;
  wholesalePrice?: number; // Precio único legacy
  wholesaleMinQty?: number; // Cantidad mínima para precio legacy
  wholesaleTiers?: { minQty: number; maxQty: number; price: number }[]; // Rangos
  // Modificadores de precio por variantes/extras (suma fija sobre basePrice)
  optionsPriceMod?: number;
  extrasPriceMod?: number;
  // ── Reserva ──
  // Indica si este item es una reserva (stock=0 + reservationEnabled).
  // Se usa en el checkout para calcular la fecha mínima de entrega basada
  // en reservationDays del producto con mayor antelación.
  isReservation?: boolean;
  // Días de antelación requeridos para la reserva (del producto).
  reservationDays?: number;
}

interface CartState {
  items: CartItem[];
  _hydrated: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>) => { ok: boolean; reason?: string };
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => { ok: boolean; reason?: string };
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  setHydrated: () => void;
}

function persist(items: CartItem[]) {
  try {
    localStorage.setItem('diaz-premium-cart', JSON.stringify({ state: { items } }));
  } catch {}
}

/**
 * Recalcula el precio unitario de un item según la cantidad y los rangos
 * de precio al por mayor configurados para ese producto.
 *
 * Prioridad:
 *   1. wholesaleTiers (rangos con minQty/maxQty) — si la cantidad cae en un rango, usa ese precio
 *   2. wholesalePrice legacy (precio único) — si la cantidad >= wholesaleMinQty
 *   3. Precio base (sin descuento)
 *
 * El precio calculado incluye los modificadores de variantes/extras
 * (optionsPriceMod + extrasPriceMod) que son suma fija sobre el basePrice.
 */
function recalcPrice(item: CartItem, quantity: number): number {
  const base = item.basePrice || item.price;
  const optionsMod = item.optionsPriceMod || 0;
  const extrasMod = item.extrasPriceMod || 0;

  // Si wholesale no está habilitado, precio = base + mods
  if (!item.wholesaleEnabled) {
    return base + optionsMod + extrasMod;
  }

  // 1. Buscar en wholesaleTiers
  if (item.wholesaleTiers && item.wholesaleTiers.length > 0) {
    const sorted = [...item.wholesaleTiers].sort((a, b) => a.minQty - b.minQty);
    for (const tier of sorted) {
      if (quantity >= tier.minQty && (tier.maxQty === 0 || quantity <= tier.maxQty)) {
        return tier.price + optionsMod + extrasMod;
      }
    }
  }

  // 2. Legacy: wholesalePrice único
  if ((item.wholesalePrice ?? 0) > 0 && quantity >= (item.wholesaleMinQty ?? Infinity)) {
    return item.wholesalePrice! + optionsMod + extrasMod;
  }

  // 3. Precio base + mods
  return base + optionsMod + extrasMod;
}

/**
 * Clave compuesta para identificar de forma única una línea de carrito.
 * Dos líneas del mismo producto con distintas variantes/extras se consideran
 * líneas distintas (cada una con su propia cantidad y precio).
 */
export function getCartKey(item: { productId: string; variantInfo?: string; extrasInfo?: string }): string {
  return `${item.productId}__v=${item.variantInfo || '[]'}__e=${item.extrasInfo || '[]'}`;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  _hydrated: false,

  addItem: (item) => {
    const items = get().items;
    const key = getCartKey(item);
    const existing = items.find((i) => getCartKey(i) === key);
    const currentQty = existing?.quantity || 0;
    const stock = typeof item.stock === 'number' ? item.stock : Infinity;

    // Validar stock: no permitir agregar más de lo disponible
    if (currentQty + 1 > stock) {
      return {
        ok: false,
        reason: `Solo hay ${stock} unidad(es) disponible(s) de "${item.name}".`,
      };
    }

    let newItems: CartItem[];
    if (existing) {
      newItems = items.map((i) =>
        getCartKey(i) === key
          ? { ...i, quantity: i.quantity + 1, stock: item.stock ?? i.stock }
          : i
      );
    } else {
      newItems = [...items, { ...item, quantity: 1 }];
    }
    set({ items: newItems });
    persist(newItems);
    // Micro-interacción: emitir evento global para que el Header muestre
    // un badge flotante "+1" sobre el icono del carrito y un pequeño bounce.
    // Es opt-in: si nadie escucha el evento, no pasa nada (no rompe nada).
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('dulce-encanto:cart-item-added', {
          detail: { name: item.name, image: item.image, productId: item.productId },
        }));
      } catch { /* ignore */ }
    }
    return { ok: true };
  },

  removeItem: (key) => {
    // El parámetro puede ser un productId (comportamiento legacy) o una
    // clave compuesta generada con getCartKey (que incluye variantes/extras).
    // Si contiene el marcador compuesto '__v=', operamos por clave compuesta.
    const isComposite = key.includes('__v=');
    const newItems = isComposite
      ? get().items.filter((i) => getCartKey(i) !== key)
      : get().items.filter((i) => i.productId !== key);
    set({ items: newItems });
    persist(newItems);
  },

  updateQuantity: (key, quantity) => {
    if (quantity <= 0) {
      get().removeItem(key);
      return { ok: true };
    }
    const items = get().items;
    const isComposite = key.includes('__v=');
    const existing = isComposite
      ? items.find((i) => getCartKey(i) === key)
      : items.find((i) => i.productId === key);
    if (!existing) return { ok: false, reason: 'Producto no encontrado en el carrito.' };

    const stock = typeof existing.stock === 'number' ? existing.stock : Infinity;
    if (quantity > stock) {
      return {
        ok: false,
        reason: `Solo hay ${stock} unidad(es) disponible(s) de "${existing.name}".`,
      };
    }

    // Recalcular precio según la nueva cantidad (wholesale tiers)
    const newPrice = recalcPrice(existing, quantity);

    const newItems = items.map((i) =>
      (isComposite ? getCartKey(i) === key : i.productId === key)
        ? { ...i, quantity, price: newPrice }
        : i
    );
    set({ items: newItems });
    persist(newItems);
    return { ok: true };
  },

  clearCart: () => {
    set({ items: [] });
    try {
      localStorage.removeItem('diaz-premium-cart');
    } catch {}
  },

  getTotal: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },

  setHydrated: () => set({ _hydrated: true }),
}));
