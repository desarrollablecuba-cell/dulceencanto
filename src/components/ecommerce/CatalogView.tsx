'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List, ShoppingCart, Star, Heart, Eye, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useAppStore } from '@/store/app-store';
import { useCurrencyStore, formatPrice as formatGlobalPrice } from '@/store/currency-store';
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
  category: { id: string; name: string; slug: string; icon: string };
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
/** Card de producto estilo Dulce Encanto (sweet-luxury) */
function ProductCard({
  product,
  currency,
  isReservation,
  onAdd,
  onSelect,
}: {
  product: Product;
  currency: 'CUP' | 'USD';
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

  return (
    <div
      className="group cursor-pointer flex flex-col rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
      style={{ background: 'linear-gradient(180deg, #FDF2F8 0%, #FFFFFF 60%)', border: '1px solid #FBCFE8', boxShadow: '0 4px 14px -2px rgba(236,72,153,0.08)' }}
      onClick={onSelect}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden" style={{ background: '#FDF2F8' }}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
        {isReservation && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#A855F7' }}>📅 Reserva</span>
        )}
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
          <p className="font-bold mb-2" style={{ fontSize: '18px', color: '#A855F7', fontFamily: 'Georgia, serif' }}>
            {formatPrice(product.price, currency)}
          </p>

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
  currency,
  isReservation,
  onAdd,
  onSelect,
}: {
  category: Category;
  products: Product[];
  currency: 'CUP' | 'USD';
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
              currency={currency}
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
  // Moneda global (sincronizada con el Header). Ya no hay toggle local.
  const currency = useCurrencyStore((s) => s.currency);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch(`/api/products?catalog=${catalog}&take=100`).then((r) => r.json()),
    ])
      .then(([cats, prods]) => {
        if (Array.isArray(cats)) {
          const catsWithProducts = cats.filter((c: Category) =>
            Array.isArray(prods) && prods.some((p: Product) => p.categoryId === c.id)
          );
          setCategories(catsWithProducts);
        }
        if (Array.isArray(prods)) setProducts(prods);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [catalog]);

  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const c of categories) {
      map[c.id] = products.filter((p) => p.categoryId === c.id);
    }
    return map;
  }, [products, categories]);

  const handleAdd = (product: Product, qty: number) => {
    const result = addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
      quantity: qty,
    } as any);
    if (!result.ok) {
      toast({ title: 'No se pudo agregar', description: result.reason || 'Stock insuficiente.', variant: 'destructive' });
      return;
    }
    toast({ title: '✓ Agregado al carrito', description: `${qty}× ${product.name} — ${formatPrice(product.price * qty, currency)}`, duration: 2500 });
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
            {/* Indicador de moneda global — el toggle está en el Header */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1px solid #DDD6FE' }} aria-live="polite">
              {currency === 'CUP' ? '₱ CUP' : '$ USD'}
            </span>
          </div>
        </div>

        {/* View: Por categorías = carruseles por categoría */}
        {viewMode === 'categories' && (
          <div>
            {categories.map((cat) => (
              <CategoryCarousel
                key={cat.id}
                category={cat}
                products={productsByCategory[cat.id] || []}
                currency={currency}
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
                currency={currency}
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
