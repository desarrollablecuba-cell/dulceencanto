'use client';

import { ShoppingCart, Star, Eye, Heart } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useAppStore } from '@/store/app-store';
import { useCurrencyStore, formatPrice } from '@/store/currency-store';
import { useToast } from '@/hooks/use-toast';

interface ProductTag {
  name: string;
  color: string;
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
  wholesaleEnabled?: boolean;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    image?: string;
  };
  /**
   * Indica si el producto tiene grupos de variantes (VariantGroup).
   * Lo provee la API /api/products vía `_count.variantGroups > 0`.
   * Si es true, el botón "Agregar" NO añade al carrito directamente,
   * sino que navega a la vista de detalle (selectProduct) donde el
   * usuario puede elegir la variante antes de añadir.
   */
  hasVariants?: boolean;
  _count?: { variantGroups?: number };
  reservationEnabled?: boolean;
  // Stock de variantes: se usa para determinar si el producto tiene alguna
  // opción con stock disponible. Si todas las opciones tienen stock=0 y el
  // producto tiene reservationEnabled, se muestra como RESERVABLE.
  variantGroups?: {
    id: string;
    options: { id: string; stock: number; available: boolean }[];
  }[];
}

function parseTags(tags?: string): ProductTag[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((t) => t && typeof t === 'object' && t.name)
        .map((t) => ({ name: String(t.name), color: String(t.color || '#6B7280') }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

function isOfferActive(product: Product): boolean {
  if (!product.offerEnabled) return false;
  if (!product.offerPrice || product.offerPrice <= 0) return false;
  if (product.offerPrice >= product.price) return false;
  const now = new Date();
  if (product.offerStart) {
    const start = new Date(product.offerStart);
    if (!isNaN(start.getTime()) && now < start) return false;
  }
  if (product.offerEnd) {
    // Fin de día (23:59:59) para que la oferta se mantenga activa
    // durante TODO el día de fin, no solo hasta medianoche UTC.
    const end = new Date(product.offerEnd);
    end.setHours(23, 59, 59, 999);
    if (!isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

interface ProductCardProps {
  product: Product;
}

/**
 * Tarjeta de producto optimizada para UX móvil.
 *
 * Patrones adoptados del diseño de referencia (Diseño Cliente.webp):
 *  - Imagen cuadrada protagonista (mantiene aspect-square).
 *  - Jerarquía clara: Imagen → Nombre → Precio → Botón Agregar.
 *  - Botón "Agregar" de ancho completo debajo del precio (mayor área táctil,
 *    mínimo 44px de alto para toque cómodo con el dedo).
 *  - Badges más visibles: "OFERTA" y "DESTACADO" en esquina superior derecha
 *    con tamaño legible; "Solo N disponibles" como badge discreto abajo izquierda.
 *  - Tags de producto como pills pequeñas en esquina superior izquierda.
 *  - Sin overlay de "Ver Detalle" en móvil (toda la tarjeta es clickeable);
 *    en desktop se mantiene el hover overlay para discoverability.
 *  - Categoría como texto pequeño encima del nombre (jerarquía secundaria).
 *  - Precio grande y bold; precio original tachado debajo cuando hay oferta.
 *  - Espaciado compacto para reducir scroll en móvil.
 */
export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const selectProduct = useAppStore((s) => s.selectProduct);
  const currency = useCurrencyStore((s) => s.currency);
  const { toast } = useToast();

  const tags = parseTags(product.tags);
  const offerActive = isOfferActive(product);
  const effectivePrice = offerActive ? (product.offerPrice as number) : product.price;
  // Wholesale activo en la tarjeta: basta con que esté habilitado. La tarjeta
  // sólo muestra el badge "💰 Por mayor" (no muestra precios), así que no
  // requerimos que wholesalePrice > 0 — el producto puede tener sólo rangos
  // (wholesaleTiers) configurados, y aún así debe mostrar el badge.
  const wholesaleActive = !!product.wholesaleEnabled;

  // ── Cálculo de stock efectivo para productos con/sin variantes ──
  // Para productos SIN variantes: el stock es product.stock.
  // Para productos CON variantes: el stock "visible" en la tarjeta es la
  // SUMA del stock de todas las opciones disponibles. Esto determina si
  // mostramos "SIN STOCK" o no en la tarjeta externa.
  const hasVariantData = !!(product.variantGroups && product.variantGroups.length > 0);
  const totalVariantStock = hasVariantData
    ? product.variantGroups!.reduce(
        (sum, g) => sum + (g.options || []).filter(o => o.available).reduce((s, o) => s + (o.stock || 0), 0),
        0
      )
    : 0;
  // stockEfectivo: lo que se muestra en la tarjeta. Si hay variantes, es el
  // total de stock de opciones; si no, es product.stock.
  const effectiveStockForDisplay = hasVariantData ? totalVariantStock : product.stock;

  // Reserva: si el producto tiene reservationEnabled y NO hay stock disponible
  // (ni en el producto ni en sus variantes), el cliente puede reservarlo.
  // Para productos con variantes, solo se muestra como RESERVABLE si TODAS las
  // opciones tienen stock=0 (porque si hay al menos una con stock, el cliente
  // puede comprar esa opción normalmente).
  const isReservable = !!product.reservationEnabled && effectiveStockForDisplay === 0;

  // Un producto "tiene variantes" si el flag hasVariants es true, o si
  // _count.variantGroups > 0 (devuelto por /api/products con include _count).
  // En ese caso, "Agregar" navega al detalle en vez de añadir directamente,
  // porque el usuario debe elegir la variante/extras antes.
  const hasVariants = !!(product.hasVariants || (product._count?.variantGroups && product._count.variantGroups > 0));

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Si el producto tiene variantes, no añadir directamente: ir al detalle.
    if (hasVariants) {
      selectProduct(product.id);
      return;
    }
    const result = addItem({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      image: product.image,
      stock: product.stock,
    });
    if (!result.ok) {
      toast({
        title: 'No se pudo agregar',
        description: result.reason || 'Stock insuficiente.',
        variant: 'destructive',
      });
      return;
    }
    // Animación visual del botón + toast grande para personas mayores
    const btn = e.currentTarget as HTMLButtonElement;
    btn.classList.add('add-to-cart-pulse');
    setTimeout(() => btn.classList.remove('add-to-cart-pulse'), 600);
    toast({
      title: '✓ Agregado al carrito',
      description: `${product.name} — ${formatPrice(effectivePrice, currency)}`,
      duration: 2500,
    });
  };

  // Destacado = solo etiqueta visual (estrella), NO inventa descuento.
  // El precio destacado es el mismo precio del producto, sin tachado ni cálculo.
  // Si se quiere un precio rebajado, se configura como Oferta (offerEnabled).
  const title = product.shortName?.trim() || product.name;

  // Determinar qué badge mostrar arriba a la derecha (prioridad: oferta > mayor > destacado).
  // Solo uno a la vez para no saturar la esquina.
  const topRightBadge: { text: string; className: string; pulse?: boolean } | null =
    offerActive
      ? { text: 'OFERTA', className: 'bg-red-500 text-white', pulse: true }
      : wholesaleActive
      ? { text: '💰 Por mayor', className: 'bg-emerald-500 text-white' }
      : product.featured
      ? { text: '⭐ Destacado', className: 'bg-brand text-white' }
      : null;

  return (
    <div
      key={product.id}
      className="group cursor-pointer flex flex-col relative"
      style={{
        width: '100%',
        background: 'linear-gradient(180deg, #FDF2F8 0%, #FFFFFF 60%)',
        borderRadius: '20px',
        padding: '20px 16px 16px',
        boxShadow: '0 4px 20px -4px rgba(236,72,153,0.12)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        height: '100%',
        minHeight: '420px',
        overflow: 'hidden',
        border: '1px solid #FBCFE8',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 16px 36px -8px rgba(236,72,153,0.22)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px -4px rgba(236,72,153,0.12)';
      }}
      onClick={() => selectProduct(product.id)}
    >
      {/* Favorito esquina superior derecha */}
      <button
        className="absolute"
        style={{ top: '12px', right: '12px', zIndex: 2 }}
        onClick={(e) => {
          e.stopPropagation();
          toast({ title: '💖 Añadido a favoritos', description: product.name, duration: 1800 });
        }}
        aria-label="Favorito"
      >
        <div
          className="flex items-center justify-center rounded-full transition-all"
          style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}
        >
          <Heart
            className="h-4 w-4 transition-colors"
            style={{ fill: product.featured ? '#EC4899' : 'none', color: product.featured ? '#EC4899' : '#9CA3AF' }}
          />
        </div>
      </button>

      {/* Badge descuento esquina superior izquierda */}
      {offerActive && (
        <span
          className="absolute flex items-center justify-center text-white font-bold"
          style={{
            top: '12px', left: '12px', zIndex: 2,
            padding: '4px 10px', borderRadius: '12px',
            background: '#EC4899', fontSize: '11px',
            boxShadow: '0 2px 8px rgba(236,72,153,0.3)',
          }}
        >
          -{Math.round((1 - (product.offerPrice as number) / product.price) * 100)}%
        </span>
      )}

      {/* Imagen circular destacada */}
      <div className="relative flex items-center justify-center" style={{ marginBottom: '14px', height: '160px' }}>
        <div
          className="absolute rounded-full"
          style={{ width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)' }}
        />
        <div
          className="rounded-full overflow-hidden flex items-center justify-center relative"
          style={{
            width: '140px', height: '140px', background: '#FFF',
            border: '4px solid #FFF', boxShadow: '0 8px 20px -4px rgba(236,72,153,0.2)',
          }}
        >
          <img
            src={product.image || '/products/placeholder.svg'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
          {/* Sin stock overlay */}
          {effectiveStockForDisplay === 0 && !isReservable && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white text-xs font-bold px-2 py-1 rounded" style={{ background: '#DC2626' }}>SIN STOCK</span>
            </div>
          )}
          {effectiveStockForDisplay === 0 && isReservable && (
            <div className="absolute inset-0 bg-amber-500/40 flex items-center justify-center">
              <span className="text-white text-xs font-bold px-2 py-1 rounded" style={{ background: '#F59E0B' }}>RESERVABLE</span>
            </div>
          )}
        </div>
      </div>

      {/* Info centrada */}
      <div className="text-center w-full flex flex-col flex-1">
        {/* Categoría tag */}
        <span
          className="inline-block mb-1.5 text-[10px] font-semibold uppercase tracking-wider self-center"
          style={{ color: '#EC4899' }}
        >
          {product.category.icon ? `${product.category.icon} ` : ''}{product.category.name}
        </span>

        {/* Nombre */}
        <h3
          className="font-semibold mb-1.5 leading-snug"
          style={{
            fontSize: '15px', fontWeight: 600, color: '#2E1065',
            minHeight: '42px', display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {title}
        </h3>

        {/* Rating */}
        <div className="flex items-center justify-center gap-1 mb-3" style={{ minHeight: '18px' }}>
          {product.reviewCount > 0 ? (
            <>
              <div className="flex" style={{ gap: '1px' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className="h-3 w-3"
                    style={{ fill: n <= Math.round(product.rating) ? '#FBBF24' : 'none', color: n <= Math.round(product.rating) ? '#FBBF24' : '#E5E7EB' }}
                  />
                ))}
              </div>
              <span className="text-[11px]" style={{ color: '#6B7280' }}>({product.reviewCount})</span>
            </>
          ) : (
            <span className="text-[11px] italic" style={{ color: '#9CA3AF' }}>Sin reseñas aún</span>
          )}
        </div>

        {/* Precio */}
        <div className="mb-3" style={{ minHeight: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {offerActive ? (
            <div className="flex items-center justify-center gap-2">
              <span
                className="font-bold"
                style={{ fontSize: '20px', color: '#A855F7', fontFamily: 'Georgia, serif' }}
              >
                {formatPrice(product.offerPrice as number, currency)}
              </span>
              <span className="text-xs line-through" style={{ color: '#9CA3AF' }}>
                {formatPrice(product.price, currency)}
              </span>
            </div>
          ) : (
            <p className="font-bold" style={{ fontSize: '20px', color: '#A855F7', fontFamily: 'Georgia, serif' }}>
              {formatPrice(product.price, currency)}
            </p>
          )}
        </div>

        {/* Stock bajo badge */}
        {effectiveStockForDisplay > 0 && effectiveStockForDisplay <= 5 && (
          <p className="text-[10px] mb-2" style={{ color: '#EC4899', fontWeight: 600 }}>
            ¡Solo {effectiveStockForDisplay} disponibles!
          </p>
        )}

        {/* Botonera */}
        <div className="mt-auto">
          {hasVariants ? (
            <button
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold transition-all"
              style={{ border: '2px solid #EC4899', color: '#EC4899', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EC4899'; e.currentTarget.style.color = '#FFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#EC4899'; }}
              onClick={(e) => { e.stopPropagation(); selectProduct(product.id); }}
            >
              <Eye className="h-3.5 w-3.5" /> Ver detalles
            </button>
          ) : (
            <button
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
                border: 'none', boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
                opacity: (effectiveStockForDisplay === 0 && !isReservable) ? 0.5 : 1,
              }}
              disabled={effectiveStockForDisplay === 0 && !isReservable}
              onMouseEnter={(e) => {
                if (!(effectiveStockForDisplay === 0 && !isReservable)) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(236,72,153,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(236,72,153,0.3)';
              }}
              onClick={handleAddToCart}
              title={isReservable ? 'Reservar producto' : 'Agregar al carrito'}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {isReservable ? 'Reservar' : effectiveStockForDisplay === 0 ? 'Agotado' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
