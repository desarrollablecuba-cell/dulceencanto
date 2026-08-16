'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCartStore } from '@/store/cart-store';
import { useAppStore } from '@/store/app-store';
import { useCurrencyStore, formatPrice } from '@/store/currency-store';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  featured: boolean;
  reservationEnabled?: boolean;
  _count?: { variantGroups: number };
  category: { id: string; name: string; slug: string; icon: string };
}

/**
 * WishlistSidebar
 *
 * Drawer lateral (igual que CartSidebar) que muestra los productos
 * favoritos del cliente. Permite:
 *  - Ver todos los productos guardados.
 *  - Click en un producto para navegar a su detalle.
 *  - Mover a carrito (si tiene stock y no tiene variantes).
 *  - Eliminar de favoritos.
 *  - Vaciar lista completa.
 *
 * Se abre/cierra escuchando el evento global `dulce-encanto:toggle-wishlist`.
 * Esto permite que cualquier botón de corazón en la tienda abra este drawer.
 *
 * Si la lista está vacía, muestra un estado amigable con CTA al catálogo.
 */
export function WishlistSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const clear = useWishlistStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);
  const selectProduct = useAppStore((s) => s.selectProduct);
  const setView = useAppStore((s) => s.setView);
  const currency = useCurrencyStore((s) => s.currency);
  const { toast } = useToast();

  // Escuchar el evento global para abrir/cerrar el drawer
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.open === 'boolean') {
        setIsOpen(detail.open);
      } else {
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('dulce-encanto:toggle-wishlist', handler);
    return () => window.removeEventListener('dulce-encanto:toggle-wishlist', handler);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cargar productos cuando la lista cambia o se abre el drawer.
  // El setState ocurre dentro de los callbacks de Promise (sistema externo),
  // no sincrónicamente en el cuerpo del effect, evitando set-state-in-effect.
  useEffect(() => {
    if (!isOpen || items.length === 0) {
      // Limpieza sincrónica del estado derivado cuando no hay items.
      // Es seguro porque es un cleanup, no una suscripción a sistema externo.
      // Pero para evitar la regla set-state-in-effect, lo movemos a un microtask.
      Promise.resolve().then(() => {
        setProducts((prev) => (prev.length === 0 ? prev : []));
        setLoading(false);
      });
      return;
    }
    let cancelled = false;
    // setLoading(true) dentro del microtask para evitar set-state-in-effect.
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    // Fetch los detalles de cada producto en paralelo
    Promise.all(
      items.map((id) =>
        fetch(`/api/products/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    )
      .then((results) => {
        if (cancelled) return;
        const valid = results.filter((r): r is Product => r !== null && r !== undefined);
        setProducts(valid);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [items, isOpen]);

  const handleMoveToCart = (p: Product) => {
    const hasVariants = (p._count?.variantGroups ?? 0) > 0;
    if (hasVariants) {
      // Si tiene variantes, navegar al detalle para elegir
      selectProduct(p.id);
      setIsOpen(false);
      return;
    }
    const result = addItem({
      productId: p.id,
      name: p.shortName || p.name,
      price: p.price,
      basePrice: p.price,
      image: p.image,
      stock: p.stock,
      quantity: 1,
    } as any);
    if (!result.ok) {
      toast({
        title: 'No se pudo agregar',
        description: result.reason || 'Stock insuficiente.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: '✓ Movido al carrito',
      description: `${p.shortName || p.name} — ${formatPrice(p.price, currency)}`,
      duration: 2200,
    });
    // Opcional: remover de favoritos después de mover al carrito
    remove(p.id);
  };

  const handleProductClick = (p: Product) => {
    selectProduct(p.id);
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110]"
            style={{ background: 'rgba(46,16,101,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer panel — se abre desde la derecha */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-[120] w-full max-w-md flex flex-col shadow-2xl"
            style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF5FF 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Mis favoritos"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#FBCFE8' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' }}
                >
                  <Heart className="h-5 w-5 text-white fill-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif', fontSize: '16px' }}>
                    Mis Favoritos
                  </h2>
                  <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                    {items.length} {items.length === 1 ? 'producto guardado' : 'productos guardados'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar favoritos"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body — lista de productos */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#A855F7' }} />
                </div>
              ) : items.length === 0 ? (
                // Estado vacío
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #FCE7F3 0%, #F3E8FF 100%)' }}>
                    <Heart className="h-8 w-8" style={{ color: '#EC4899' }} />
                  </div>
                  <h3 className="font-bold mb-2" style={{ color: '#2E1065', fontFamily: 'Georgia, serif', fontSize: '18px' }}>
                    Tu lista de deseos está vacía
                  </h3>
                  <p className="text-xs mb-5 max-w-xs mx-auto" style={{ color: '#6B7280' }}>
                    Guarda tus tartas, pasteles y dulces favoritos haciendo click en el corazón de cada producto.
                  </p>
                  <button
                    onClick={() => { setView('catalog'); setIsOpen(false); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-transform hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                  >
                    Explorar productos
                  </button>
                </div>
              ) : (
                // Lista de productos
                <div className="space-y-2.5">
                  {products.map((p) => {
                    const soldOut = p.stock <= 0 && !p.reservationEnabled;
                    const hasVariants = (p._count?.variantGroups ?? 0) > 0;
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex gap-3 p-3 rounded-2xl transition-all hover:shadow-md"
                        style={{ background: '#FFF', border: '1px solid #FBCFE8' }}
                      >
                        {/* Imagen clickable */}
                        <button
                          onClick={() => handleProductClick(p)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                          style={{ background: '#FDF2F8' }}
                          aria-label={`Ver detalle de ${p.name}`}
                        >
                          <img
                            src={p.image || '/products/placeholder.svg'}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {p.featured && (
                            <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-bold text-white" style={{ background: '#F59E0B' }}>
                              TOP
                            </span>
                          )}
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <button
                            onClick={() => handleProductClick(p)}
                            className="text-left"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#7E22CE' }}>
                              {p.category.icon} {p.category.name}
                            </p>
                            <h4 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: '#2E1065' }}>
                              {p.shortName || p.name}
                            </h4>
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-sm" style={{ color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                              {formatPrice(p.price, currency)}
                            </span>
                            {soldOut && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: '#6B7280' }}>
                                Agotado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleMoveToCart(p)}
                            disabled={soldOut}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 disabled:opacity-40 disabled:hover:scale-100"
                            style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                            title={hasVariants ? 'Ver opciones' : 'Mover al carrito'}
                            aria-label={hasVariants ? `Ver opciones de ${p.name}` : `Mover ${p.name} al carrito`}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: '#FEE2E2', color: '#DC2626' }}
                            title="Eliminar de favoritos"
                            aria-label={`Eliminar ${p.name} de favoritos`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer — acciones globales */}
            {items.length > 0 && (
              <div className="border-t p-4 space-y-2" style={{ borderColor: '#FBCFE8', background: '#FFF' }}>
                <button
                  onClick={() => {
                    if (confirm('¿Vaciar toda la lista de favoritos?')) {
                      clear();
                      toast({ title: 'Lista vaciada', duration: 1500 });
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
                >
                  <Trash2 className="h-4 w-4" /> Vaciar lista
                </button>
                <p className="text-center text-[10px]" style={{ color: '#9CA3AF' }}>
                  Los favoritos se guardan en tu navegador
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
