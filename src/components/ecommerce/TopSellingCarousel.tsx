'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Star, ShoppingCart, Eye, Flame, Heart } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useCartStore } from '@/store/cart-store';
import { useCurrencyStore, formatPrice as formatCurrency, currencyForProduct } from '@/store/currency-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  section?: string;
}

interface Product {
  id: string;
  name: string;
  shortName?: string;
  sku?: string;
  description: string;
  price: number;
  image: string;
  tags?: string;
  offerEnabled?: boolean;
  offerPrice?: number;
  offerType?: string;
  offerStart?: string | null;
  offerEnd?: string | null;
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  reservationEnabled?: boolean;
  _count?: { variantGroups?: number };
  hasVariants?: boolean;
  category: Category;
}

function isOfferActive(p: Product): boolean {
  if (!p.offerEnabled || !p.offerPrice || p.offerPrice >= p.price) return false;
  const now = new Date();
  if (p.offerStart && new Date(p.offerStart) > now) return false;
  if (p.offerEnd && new Date(p.offerEnd) < now) return false;
  return true;
}

/**
 * TopSellingCarousel
 *
 * Carrusel horizontal con los productos destacados (featured=true) de la tienda.
 * Se muestra en el home entre el Hero y las section cards.
 *
 * Características:
 *  - Carrusel responsive con flechas y scroll horizontal suave.
 *  - Cards con imagen, nombre, precio (con oferta si aplica), rating y CTA.
 *  - Botón "Ver todo" para ir al catálogo completo.
 *  - Si no hay productos destacados, no se renderiza (return null).
 *  - Usa la moneda global (`useCurrencyStore`) para sincronizar con el Header.
 *  - Click en la card abre el QuickViewModal (si hay producto sin variantes).
 */
export function TopSellingCarousel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollIdx, setScrollIdx] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { selectProduct, setView } = useAppStore();
  const addItem = useCartStore((s) => s.addItem);
  const currency = useCurrencyStore((s) => s.currency);
  const { toast } = useToast();

  const formatPrice = useCallback((cup: number) => formatCurrency(cup, currency), [currency]);
  // REGLA: venta directa siempre en CUP (se paga local); reservas siguen el toggle global.
  const formatPriceFor = useCallback(
    (p: { reservationEnabled?: boolean; category?: { section?: string } }, cup: number) =>
      formatCurrency(cup, currencyForProduct(p, currency)),
    [currency]
  );

  useEffect(() => {
    fetch('/api/products?featured=true&sort=rating')
      .then((r) => r.json().catch(() => []))
      .then((data) => setProducts(Array.isArray(data) ? data.slice(0, 12) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = 260; // ancho aprox + gap
    el.scrollBy({ left: dir * cardWidth * 2, behavior: 'smooth' });
    setScrollIdx((cur) => Math.max(0, cur + dir * 2));
  }, []);

  const handleAdd = (p: Product) => {
    // Si tiene variantes, navegar al detalle en lugar de añadir directamente
    if ((p._count?.variantGroups ?? 0) > 0 || p.hasVariants) {
      selectProduct(p.id);
      setView('product');
      return;
    }
    const result = addItem({
      productId: p.id,
      name: p.shortName || p.name,
      price: p.price,
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
      title: '✓ Agregado al carrito',
      description: `${p.shortName || p.name} — ${formatPriceFor(p, p.price)}`,
      duration: 2200,
    });
    window.dispatchEvent(new CustomEvent('toggleCart', { detail: { open: true } }));
  };

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-12 md:py-16" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FDF2F8 100%)' }}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ background: 'linear-gradient(135deg, #F472B6 0%, #A855F7 100%)' }}>
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-1 px-2 py-0.5 rounded-full" style={{ background: '#FCE7F3', color: '#BE185D' }}>
                ⭐ Los favoritos
              </span>
              <h2 className="font-bold leading-tight" style={{ fontSize: '26px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                Más Vendidos
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Indicador de moneda (solo informativo — el toggle global está en el Header) */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1px solid #DDD6FE' }} aria-live="polite">
              {currency === 'CUP' ? '₱ CUP' : '$ USD'}
            </span>

            {/* Flechas (desktop) */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scrollBy(-1)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                style={{ background: '#FFF', border: '1px solid #FBCFE8', color: '#7E22CE' }}
                aria-label="Anterior"
                disabled={scrollIdx === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollBy(1)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style={{ background: '#FFF', border: '1px solid #FBCFE8', color: '#7E22CE' }}
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setView('catalog')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', color: '#FFF' }}
            >
              Ver catálogo <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Carrusel */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[240px] sm:w-[260px]">
                <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
                  <div className="aspect-square animate-pulse" style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded bg-gray-100 w-3/4 animate-pulse" />
                    <div className="h-4 rounded bg-gray-100 w-1/2 animate-pulse" />
                    <div className="h-8 rounded bg-gray-100 w-full animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'thin' }}
          >
            {products.map((p, i) => {
              const offerActive = isOfferActive(p);
              const finalPrice = offerActive && p.offerPrice ? p.offerPrice : p.price;
              const discountPct = offerActive && p.offerPrice ? Math.round((1 - p.offerPrice / p.price) * 100) : 0;
              const hasVariants = (p._count?.variantGroups ?? 0) > 0 || !!p.hasVariants;
              const soldOut = p.stock <= 0 && !p.reservationEnabled;
              const reservable = p.stock <= 0 && p.reservationEnabled;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="shrink-0 w-[220px] sm:w-[240px] md:w-[260px]"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div
                    className="group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col"
                    style={{ background: '#FFF', border: '1px solid #FBCFE8' }}
                    onClick={() => {
                      // Si el producto tiene variantes, ir a la página de detalle.
                      // Si no, abrir QuickView modal para vista rápida + agregar al carrito.
                      if (hasVariants) {
                        selectProduct(p.id);
                        setView('product');
                      } else {
                        setQuickViewProduct(p);
                      }
                    }}
                  >
                    {/* Imagen */}
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={p.image || '/products/placeholder.svg'}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(46,16,101,0.45) 0%, transparent 50%)' }} />

                      {/* Badges top-left */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                        {offerActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
                            -{discountPct}%
                          </span>
                        )}
                        {p.featured && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md inline-flex items-center gap-0.5" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                            <Flame className="h-2.5 w-2.5" /> TOP
                          </span>
                        )}
                      </div>

                      {/* Wishlist heart button — top-right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nowFav = useWishlistStore.getState().toggle(p.id);
                          toast({
                            title: nowFav ? '💖 Añadido a favoritos' : 'Removido de favoritos',
                            description: p.shortName || p.name,
                            duration: 1500,
                          });
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}
                        aria-label={useWishlistStore.getState().has(p.id) ? `Quitar ${p.name} de favoritos` : `Añadir ${p.name} a favoritos`}
                        aria-pressed={useWishlistStore.getState().has(p.id)}
                      >
                        <WishlistHeart productId={p.id} />
                      </button>

                      {/* Status pill bottom-left */}
                      <div className="absolute bottom-2 left-2">
                        {soldOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#6B7280' }}>
                            Agotado
                          </span>
                        ) : reservable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#7E22CE' }}>
                            Reservable
                          </span>
                        ) : null}
                      </div>

                      {/* Rating pill bottom-right */}
                      {p.rating > 0 && (
                        <div className="absolute bottom-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'rgba(46,16,101,0.7)', backdropFilter: 'blur(4px)' }}>
                          <Star className="h-2.5 w-2.5" style={{ fill: '#FBBF24', color: '#FBBF24' }} />
                          {p.rating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#A855F7' }}>
                        {p.category.icon} {p.category.name}
                      </p>
                      <h3 className="font-bold text-sm leading-snug line-clamp-2 mb-2" style={{ color: '#2E1065', minHeight: '2.5rem' }}>
                        {p.shortName || p.name}
                      </h3>

                      {/* Precio */}
                      <div className="mt-auto">
                        {offerActive && (
                          <p className="text-[10px] line-through" style={{ color: '#9CA3AF' }}>
                            {formatPriceFor(p, p.price)}
                          </p>
                        )}
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="font-bold text-base" style={{ color: offerActive ? '#DC2626' : '#2E1065', fontFamily: 'Georgia, serif' }}>
                            {formatPriceFor(p, finalPrice)}
                          </span>
                        </div>

                        {/* CTA */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (soldOut) return;
                            if (hasVariants) {
                              selectProduct(p.id);
                              setView('product');
                            } else {
                              handleAdd(p);
                            }
                          }}
                          disabled={soldOut}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                          style={{
                            background: soldOut ? '#E5E7EB' : 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                            color: soldOut ? '#6B7280' : '#FFF',
                            boxShadow: soldOut ? 'none' : '0 4px 12px -2px rgba(168,85,247,0.4)',
                          }}
                          aria-label={soldOut ? 'Agotado' : hasVariants ? `Ver opciones de ${p.name}` : `Agregar ${p.name} al carrito`}
                        >
                          {soldOut ? (
                            <>Sin stock</>
                          ) : hasVariants ? (
                            <><Eye className="h-3.5 w-3.5" /> Ver opciones</>
                          ) : (
                            <><ShoppingCart className="h-3.5 w-3.5" /> Agregar</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Hint scroll (mobile) */}
        {!loading && products.length > 0 && (
          <p className="text-center text-[10px] mt-2 sm:hidden" style={{ color: '#9CA3AF' }}>
            ← Desliza para ver más →
          </p>
        )}
      </div>

      {/* Quick View Modal — vista rápida del producto sin navegar a su página */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAdd={(p) => { handleAdd(p); setQuickViewProduct(null); }}
        onGoToDetail={(p) => { selectProduct(p.id); setView('product'); setQuickViewProduct(null); }}
      />
    </section>
  );
}

// ─── QuickViewModal (inline) ──────────────────────────────────────────────
// Modal de vista rápida. Se renderiza dentro del TopSellingCarousel para
// evitar importar otro archivo. Muestra:
//  - Imagen grande del producto
//  - Nombre, categoría, rating
//  - Precio (con descuento si aplica) en moneda global
//  - Descripción (truncada)
//  - Botón "Agregar al carrito" + "Ver detalle completo"
//  - Cierre con click fuera, botón X o tecla Escape.

import { X } from 'lucide-react';
import { useEffect as useEffectQV } from 'react';

function QuickViewModal({
  product,
  onClose,
  onAdd,
  onGoToDetail,
}: {
  product: Product | null;
  onClose: () => void;
  onAdd: (p: Product) => void;
  onGoToDetail: (p: Product) => void;
}) {
  // Cerrar con tecla Escape
  useEffectQV(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    // Bloquear scroll del body mientras el modal está abierto
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [product, onClose]);

  if (!product) return null;

  const offerActive = isOfferActive(product);
  const finalPrice = offerActive && product.offerPrice ? product.offerPrice : product.price;
  const discountPct = offerActive && product.offerPrice ? Math.round((1 - product.offerPrice / product.price) * 100) : 0;
  const soldOut = product.stock <= 0 && !product.reservationEnabled;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(46,16,101,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickview-title"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
        style={{ background: '#FFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
          style={{ background: 'rgba(46,16,101,0.6)', backdropFilter: 'blur(8px)' }}
          aria-label="Cerrar vista rápida"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Imagen */}
          <div className="relative aspect-square md:aspect-auto md:h-full overflow-hidden md:rounded-l-3xl">
            <img
              src={product.image || '/products/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {offerActive && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
                  -{discountPct}% OFF
                </span>
              )}
              {product.featured && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-md inline-flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                  <Flame className="h-3 w-3" /> TOP
                </span>
              )}
              {soldOut && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-md" style={{ background: '#6B7280' }}>
                  Agotado
                </span>
              )}
            </div>
          </div>

          {/* Contenido */}
          <div className="p-5 sm:p-7 flex flex-col">
            <p className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#A855F7' }}>
              {product.category.icon} {product.category.name}
            </p>
            <h3 id="quickview-title" className="font-bold leading-tight mb-3" style={{ fontSize: '22px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
              {product.shortName || product.name}
            </h3>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5"
                      style={{
                        fill: i < Math.round(product.rating) ? '#FBBF24' : 'transparent',
                        color: i < Math.round(product.rating) ? '#FBBF24' : '#E5E7EB',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold" style={{ color: '#2E1065' }}>{product.rating.toFixed(1)}</span>
                {product.reviewCount > 0 && (
                  <span className="text-[11px]" style={{ color: '#9CA3AF' }}>({product.reviewCount} reseñas)</span>
                )}
              </div>
            )}

            {/* Descripción */}
            <p className="text-sm leading-relaxed mb-4 line-clamp-4" style={{ color: '#6B7280' }}>
              {product.description}
            </p>

            {/* Precio */}
            <div className="mb-5">
              {offerActive && (
                <p className="text-sm line-through mb-0.5" style={{ color: '#9CA3AF' }}>
                  {formatCurrency(product.price, useCurrencyStore.getState().currency)}
                </p>
              )}
              <div className="flex items-baseline gap-2">
                <span className="font-bold" style={{ fontSize: '32px', color: offerActive ? '#DC2626' : '#2E1065', fontFamily: 'Georgia, serif' }}>
                  {formatCurrency(finalPrice, useCurrencyStore.getState().currency)}
                </span>
                <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                  {useCurrencyStore.getState().currency === 'CUP' ? 'pesos cubanos' : 'dólares (Zelle)'}
                </span>
              </div>
              {product.stock > 0 && (
                <p className="text-[11px] mt-1 font-medium" style={{ color: '#22C55E' }}>
                  ✓ {product.stock} en stock
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="mt-auto flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => onAdd(product)}
                disabled={soldOut}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                style={{
                  background: soldOut ? '#E5E7EB' : 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                  color: soldOut ? '#6B7280' : '#FFF',
                  boxShadow: soldOut ? 'none' : '0 6px 18px -3px rgba(168,85,247,0.5)',
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                {soldOut ? 'Sin stock' : 'Agregar al carrito'}
              </button>
              <button
                onClick={() => onGoToDetail(product)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02]"
                style={{ background: '#FFF', color: '#2E1065', border: '2px solid #DDD6FE' }}
              >
                <Eye className="h-4 w-4" /> Ver detalle
              </button>
              {/* Wishlist button en el modal */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nowFav = useWishlistStore.getState().toggle(product.id);
                  // Usar window.dispatchEvent para toast (el modal no tiene acceso directo a useToast aquí)
                  // En su lugar, usamos un toast simple via console para no romper el flujo
                  console.log(nowFav ? 'Añadido a favoritos' : 'Removido de favoritos');
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] sm:w-auto w-full"
                style={{ background: useWishlistStore.getState().has(product.id) ? '#FCE7F3' : '#FFF', color: useWishlistStore.getState().has(product.id) ? '#BE185D' : '#9CA3AF', border: '2px solid #FBCFE8' }}
                aria-label={useWishlistStore.getState().has(product.id) ? `Quitar ${product.name} de favoritos` : `Añadir ${product.name} a favoritos`}
                aria-pressed={useWishlistStore.getState().has(product.id)}
              >
                <WishlistHeart productId={product.id} />
                <span className="hidden sm:inline">{useWishlistStore.getState().has(product.id) ? 'En favoritos' : 'Favorito'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WishlistHeart (reactivo) ──────────────────────────────────────────────
// Componente Heart que reacciona a cambios en el wishlist store. Lo usamos
// dentro de las cards de productos para que el corazón se rellene automáticamente
// cuando el producto está en favoritos.
function WishlistHeart({ productId }: { productId: string }) {
  const isInWishlist = useWishlistStore((s) => s.has(productId));
  return (
    <Heart
      className="h-4 w-4 transition-all"
      style={{
        fill: isInWishlist ? '#EC4899' : 'none',
        color: isInWishlist ? '#EC4899' : '#9CA3AF',
      }}
    />
  );
}
