'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List, ShoppingCart, Star, Heart, Eye, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useAppStore } from '@/store/app-store';
import { formatPrice as formatGlobalPrice } from '@/store/currency-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  _count?: { products: number };
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  categoryId: string;
  reservationEnabled?: boolean;
  /** Días de antelación requeridos para reservar (V52.7). */
  reservationDays?: number;
  /** V52.6 — unidad de venta ('docena' → etiqueta "Por Docena" en la card). */
  saleUnit?: string;
  /** V52.6 — disponible en el grupo "Buffet para Repartir" de Reservas. */
  buffetEnabled?: boolean;
  /** V52.8 — precio de la DOCENA en el Buffet para Repartir (USD). */
  buffetPriceUsd?: number;
  category: { id: string; name: string; slug: string; icon: string; section?: string };
  _count?: { variantGroups: number };
}

interface CatalogViewProps {
  catalog: 'reservation' | 'immediate';
}

const USD_RATE = 700;

function formatPrice(cup: number, currency: 'CUP' | 'USD'): string {
  if (currency === 'USD') return `$${(cup / USD_RATE).toFixed(2)}`;
  return `₱${cup.toLocaleString('es-CU')}`;
}
/** Card de producto estilo Dulce Encanto (sweet-luxury)
 *  V52.8 — la moneda se deduce del canal: reservables $USD / directa ₡CUP. */
function ProductCard({
  product,
  isReservation,
  onAdd,
  onSelect,
}: {
  product: Product;
  isReservation: boolean;
  onAdd: (qty: number) => void;
  onSelect: () => void;
}) {
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  // Wishlist global persistente (localStorage). El botón corazón ahora
  // guarda/remueve de favoritos de verdad, en lugar de solo mostrar un toast.
  const isInWishlist = useWishlistStore((s) => s.has(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const hasVariants = (product._count?.variantGroups ?? 0) > 0;
  // V52.6 — etiqueta "Por Docena" para dulces finos (se vende la docena)
  const isDozen = product.saleUnit === 'docena';

  return (
    <div
      className="group cursor-pointer flex flex-col rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
      style={{ background: 'linear-gradient(180deg, #FDF2F8 0%, #FFFFFF 60%)', border: '1px solid #FBCFE8', boxShadow: '0 4px 14px -2px rgba(236,72,153,0.08)' }}
      onClick={onSelect}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden" style={{ background: '#FDF2F8' }}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
        {/* Badges apilados arriba-izquierda: Reserva (si aplica) + Por Docena */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1 pointer-events-none">
          {isReservation && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#A855F7' }}>📅 Reserva</span>
          )}
          {isDozen && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)', boxShadow: '0 2px 6px rgba(236,72,153,0.35)' }}
            >
              🍬 Por Docena
            </span>
          )}
        </div>
        <button
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.9)' }}
          onClick={(e) => {
            e.stopPropagation();
            const nowFav = toggleWishlist(product.id);
            toast({
              title: nowFav ? '💖 Añadido a favoritos' : 'Removido de favoritos',
              description: product.name,
              duration: 1500,
            });
          }}
          aria-label={isInWishlist ? `Quitar ${product.name} de favoritos` : `Añadir ${product.name} a favoritos`}
          aria-pressed={isInWishlist}
        >
          <Heart className="h-4 w-4" style={{ fill: isInWishlist ? '#EC4899' : 'none', color: isInWishlist ? '#EC4899' : '#9CA3AF' }} />
        </button>
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#EC4899' }}>
          {product.category.icon} {product.category.name}
        </span>
        <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2" style={{ color: '#2E1065', minHeight: '36px' }}>{product.name}</h3>
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-3 w-3" style={{ fill: '#FBBF24', color: '#FBBF24' }} />
            <span className="text-[11px]" style={{ color: '#6B7280' }}>{product.rating.toFixed(1)} ({product.reviewCount})</span>
          </div>
        )}
        <div className="mt-auto">
          {/* V52.8 — moneda fija por canal (petición del negocio):
              reservables SIEMPRE $USD · venta directa SIEMPRE ₡CUP.
              El toggle global ya no afecta los precios del catálogo. */}
          <p className="font-bold mb-0.5 flex items-baseline justify-center gap-1" style={{ fontSize: '18px', color: '#A855F7', fontFamily: 'Georgia, serif' }}>
            {formatPrice(product.price, isReservation ? 'USD' : 'CUP')}
            {isDozen && <span className="text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>/ docena</span>}
          </p>
          {isReservation && (
            <p className="text-center text-[10px] mb-1.5" style={{ color: '#9CA3AF' }}>
              ≈ ₡{product.price.toLocaleString('es-CU')} CUP
            </p>
          )}

          {/* Quantity selector — solo en venta directa (no reservas) */}
          {!isReservation && !hasVariants && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                onClick={(e) => { e.stopPropagation(); setQty(Math.max(1, qty - 1)); }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: '#FCE7F3', color: '#BE185D', border: '1px solid #FBCFE8' }}
                aria-label="Disminuir"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="font-bold text-sm w-8 text-center" style={{ color: '#2E1065' }}>{qty}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setQty(Math.min(product.stock || 99, qty + 1)); }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: '#A855F7', color: '#FFF' }}
                aria-label="Aumentar"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Botón principal */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasVariants) { onSelect(); }
              else { onAdd(qty); }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all"
            style={{
              background: hasVariants ? 'transparent' : 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
              border: hasVariants ? '2px solid #EC4899' : 'none',
              color: hasVariants ? '#EC4899' : '#FFF',
              boxShadow: hasVariants ? 'none' : '0 4px 12px rgba(168,85,247,0.3)',
            }}
          >
            {hasVariants ? <><Eye className="h-3.5 w-3.5" /> Ver detalles</> : <><ShoppingCart className="h-3.5 w-3.5" /> {isReservation ? 'Reservar' : 'Agregar'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Carrusel horizontal de una fila para una categoría */
function CategoryCarousel({
  category,
  products,
  isReservation,
  onAdd,
  onSelect,
}: {
  category: Category;
  products: Product[];
  isReservation: boolean;
  onAdd: (product: Product, qty: number) => void;
  onSelect: (product: Product) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  return (
    <div className="mb-8">
      {/* Header de la categoría */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <h3 className="font-bold" style={{ fontSize: '20px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>{category.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>{products.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: '#FFF', border: '1px solid #FBCFE8', color: '#7E22CE' }}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: '#FFF', border: '1px solid #FBCFE8', color: '#7E22CE' }}
            aria-label="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Carrusel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#EC4899 transparent' }}
      >
        <style>{`
          .de-carousel::-webkit-scrollbar { height: 6px; }
          .de-carousel::-webkit-scrollbar-track { background: transparent; }
          .de-carousel::-webkit-scrollbar-thumb { background: #EC4899; border-radius: 3px; }
        `}</style>
        {products.map((p) => (
          <div key={p.id} className="shrink-0 w-[200px] sm:w-[220px]">
            <ProductCard
              product={p}
              isReservation={isReservation}
              onAdd={(qty) => onAdd(p, qty)}
              onSelect={() => onSelect(p)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CatalogView({ catalog }: CatalogViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'categories' | 'all'>('categories');
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const selectProduct = useAppStore((s) => s.selectProduct);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch(`/api/products?catalog=${catalog}&take=100`).then((r) => r.json()),
    ])
      .then(([cats, prods]) => {
        // V52.6 — en Reservas, los productos del grupo "Buffet para Repartir"
        // se muestran SOLO en ese grupo (no se repiten en su categoría).
        const buffetIds = new Set(
          catalog === 'reservation' && Array.isArray(prods)
            ? prods.filter((p: Product) => p.buffetEnabled).map((p: Product) => p.id)
            : []
        );
        if (Array.isArray(cats)) {
          const catsWithProducts = cats.filter((c: Category) =>
            Array.isArray(prods) && prods.some((p: Product) => p.categoryId === c.id && !buffetIds.has(p.id))
          );
          setCategories(catsWithProducts);
        }
        if (Array.isArray(prods)) setProducts(prods);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [catalog]);

  // V52.6 — Grupo virtual "Buffet para Repartir" (sólo en Reservas):
  // los mismos productos de Venta Directa, para repartir en eventos.
  // V52.8 — se venden POR DOCENA a buffetPriceUsd USD (como los dulces finos):
  // el precio mostrado/agregado al carrito usa esa docena, no el precio unitario.
  const buffetProducts = useMemo(
    () => (catalog === 'reservation'
      ? products.filter((p) => p.buffetEnabled).map((p) => ({
          ...p,
          price: Math.round((Number(p.buffetPriceUsd) || 30) * 700),
          saleUnit: 'docena',
        }))
      : []),
    [products, catalog]
  );
  const buffetIds = useMemo(() => new Set(buffetProducts.map((p) => p.id)), [buffetProducts]);

  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const c of categories) {
      // Dedupe: los del grupo Buffet no se repiten en su categoría
      map[c.id] = products.filter((p) => p.categoryId === c.id && !buffetIds.has(p.id));
    }
    return map;
  }, [products, categories, buffetIds]);

  const handleAdd = (product: Product, qty: number) => {
    // V52.7 — el canal de venta se deduce del catálogo donde está el cliente:
    //  - immediate  → Venta Directa (₡CUP, descuenta stock)
    //  - reservation → Reservable ($USD, incluye el grupo Buffet para Repartir)
    const isReservable = catalog === 'reservation';
    // V52.8 — los productos por docena (dulces finos + buffet) se etiquetan
    // en el carrito/pedido para que el cliente y el negocio vean la unidad.
    const isDozenSale = isReservable && product.saleUnit === 'docena';
    const result = addItem({
      productId: product.id,
      name: isDozenSale ? `${product.name} — Docena` : product.name,
      price: product.price,
      image: product.image,
      stock: isReservable ? undefined : product.stock,
      quantity: qty,
      saleMode: isReservable ? 'reservation' : 'direct',
      isReservation: isReservable,
      reservationDays: isReservable ? Number(product.reservationDays || 0) : 0,
    } as any);
    if (!result.ok) {
      toast({ title: 'No se pudo agregar', description: result.reason || 'Stock insuficiente.', variant: 'destructive', duration: 6000 });
      return;
    }
    toast({
      title: '✓ Agregado al carrito',
      description: `${qty}× ${product.name} — ${formatPrice(product.price * qty, isReservable ? 'USD' : 'CUP')}`,
      duration: 2500,
    });
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#EC4899', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center">
        <p style={{ color: '#6B7280' }}>No hay productos en este catálogo todavía.</p>
      </div>
    );
  }

  return (
    <section className="py-8" style={{ background: '#FFFFFF' }}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 rounded-2xl" style={{ background: '#FAF5FF', border: '1px solid #FBCFE8' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline" style={{ color: '#7E22CE' }}>Vista:</span>
            <div className="flex items-center gap-0.5 p-0.5 rounded-full" style={{ background: '#FCE7F3' }}>
              <button
                onClick={() => setViewMode('categories')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: viewMode === 'categories' ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : 'transparent', color: viewMode === 'categories' ? '#FFF' : '#BE185D' }}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Por categorías
              </button>
              <button
                onClick={() => setViewMode('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: viewMode === 'all' ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : 'transparent', color: viewMode === 'all' ? '#FFF' : '#BE185D' }}
              >
                <List className="h-3.5 w-3.5" /> Ver todo
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline" style={{ color: '#7E22CE' }}>Moneda:</span>
            {/* V52.8 — moneda FIJA por canal: Reservas $USD · Venta Directa ₡CUP */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: catalog === 'reservation' ? '#F3E8FF' : '#ECFDF5', color: catalog === 'reservation' ? '#7E22CE' : '#047857', border: catalog === 'reservation' ? '1px solid #DDD6FE' : '1px solid #A7F3D0' }} aria-live="polite">
              {catalog === 'reservation' ? '$ USD · reservas' : '₡ CUP · venta directa'}
            </span>
          </div>
        </div>

        {/* View: Por categorías = carruseles por categoría */}
        {viewMode === 'categories' && (
          <div>
            {/* V52.6 — Grupo destacado "Buffet para Repartir" (Reservas) */}
            {catalog === 'reservation' && buffetProducts.length > 0 && (
              <div className="mb-8">
                <div
                  className="rounded-2xl p-4 sm:p-5 mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #FFF7ED 0%, #FDF2F8 55%, #FAF5FF 100%)',
                    border: '2px solid #FED7AA',
                    boxShadow: '0 8px 24px -8px rgba(245,158,11,0.25)',
                  }}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className="flex items-center justify-center rounded-full shrink-0"
                      style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)', boxShadow: '0 6px 16px -4px rgba(245,158,11,0.5)' }}
                    >
                      <span style={{ fontSize: '22px' }} aria-hidden>🍽️</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold" style={{ fontSize: '22px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                          Buffet para Repartir
                        </h3>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)', color: '#FFF' }}
                        >
                          {buffetProducts.length} productos
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#9A3412' }}>
                        Los mismos dulces y buffet de la Venta Directa, para repartir en tu evento. Se venden <strong>por docena</strong> en $USD — resérvalos junto a tu torta.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Carrusel del buffet (mismo estilo que las categorías) */}
                <div
                  className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#F59E0B transparent' }}
                >
                  {buffetProducts.map((p) => (
                    <div key={p.id} className="shrink-0 w-[200px] sm:w-[220px]">
                      <ProductCard
                        product={p}
                        isReservation
                        onAdd={(qty) => handleAdd(p, qty)}
                        onSelect={() => selectProduct(p.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {categories.map((cat) => (
              <CategoryCarousel
                key={cat.id}
                category={cat}
                products={productsByCategory[cat.id] || []}
                isReservation={catalog === 'reservation'}
                onAdd={handleAdd}
                onSelect={(p) => selectProduct(p.id)}
              />
            ))}
          </div>
        )}

        {/* View: Ver todo = grid completo */}
        {viewMode === 'all' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isReservation={catalog === 'reservation'}
                onAdd={(qty) => handleAdd(p, qty)}
                onSelect={() => selectProduct(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
