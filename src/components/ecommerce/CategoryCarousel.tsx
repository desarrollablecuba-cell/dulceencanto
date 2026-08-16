'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Button } from '@/components/ui/button';

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
}

interface CategoryCarouselProps {
  products: Product[];
  /** Ancho mínimo de cada tarjeta en px. El carousel calcula cuántas caben. */
  cardMinWidth?: number;
}

/**
 * Carrusel horizontal de productos optimizado para UX móvil y desktop.
 *
 * Características:
 *  - **Swipe nativo en móvil**: usa scroll-snap CSS, el desplazamiento
 *    horizontal con el dedo funciona out-of-the-box (no JS touch handlers).
 *  - **Arrastrar con mouse en desktop**: scroll horizontal con rueda del
 *    mouse (shift+wheel) y arrastrando la barra de scroll (invisible).
 *  - **Flechas grandes en desktop**: botones circulares de 44×44px (mínimo
 *    táctil WCAG) a los lados, visibles solo en pantallas ≥ sm.
 *  - **Indicadores**: pequeños dots debajo del carrusel que reflejan la
 *    posición actual.
 *  - **Scroll-snap type**: las tarjetas se alinean al borde izquierdo al
 *    detenerse el scroll, dando sensación de "snap".
 *  - **Sin dependencias externas**: no usa librerías de carrusel. Solo
 *    CSS scroll-snap + un poco de JS para las flechas y los indicadores.
 *  - **Performance**: las imágenes usan loading="lazy" (heredado de
 *    ProductCard). No hay animaciones JS pesadas.
 */
export function CategoryCarousel({ products, cardMinWidth = 180 }: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(2);

  // Actualiza el estado de las flechas y los indicadores al hacer scroll.
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // Tolerancia de 4px para evitar fl visible en el último item.
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);

    // Calcular índice activo (qué "página" del carrusel estamos viendo).
    const cardWidth = cardMinWidth;
    const visible = Math.max(1, Math.floor(clientWidth / cardWidth));
    setItemsPerView(visible);
    const idx = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, idx));
  }, [cardMinWidth]);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, products]);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    // Desplazar exactamente el ancho de los items visibles.
    const delta = el.clientWidth * 0.85 * direction;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  // Cuántos "grupos" hay para los indicadores.
  const totalGroups = Math.max(1, Math.ceil(products.length / itemsPerView));

  return (
    <div className="relative group/carousel">
      {/* Flecha izquierda — solo desktop (>= sm) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 z-20 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-700 hover:bg-brand hover:text-white hover:scale-110 transition-all"
          aria-label="Desplazar a la izquierda"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Contenedor scrollable con scroll-snap */}
      <div
        ref={scrollRef}
        className="flex gap-2 sm:gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-1 px-1"
        style={{
          scrollbarWidth: 'none', // Firefox: ocultar scrollbar
          msOverflowStyle: 'none', // IE/Edge: ocultar scrollbar
          // Tailwind no tiene utilidad para snap-align en children directamente,
          // lo aplicamos vía clase CSS en cada item más abajo.
          scrollPaddingLeft: '8px',
        }}
      >
        {/* Ocultar scrollbar en WebKit */}
        <style>{`
          .carousel-track::-webkit-scrollbar { display: none; }
        `}</style>
        {products.map((product) => (
          <div
            key={product.id}
            className="snap-start shrink-0"
            style={{ width: `calc(50% - 4px)` }}
            // En móvil: 2 por fila (50% - gap/2).
            // En tablet (sm+): 3 por fila.
            // En desktop (md+): 4-5 por fila.
            // Lo controlamos con clases responsivas en lugar de inline style.
          >
            {/* Wrapper responsivo para el ancho de la tarjeta */}
            <div className="sm:[&>*]:w-full" style={{ width: '100%' }}>
              <ProductCard product={product} />
            </div>
          </div>
        ))}
      </div>

      {/* Flecha derecha — solo desktop */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByCards(1)}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 z-20 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-700 hover:bg-brand hover:text-white hover:scale-110 transition-all"
          aria-label="Desplazar a la derecha"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Indicadores (dots) — solo móvil, ya que desktop tiene flechas */}
      {totalGroups > 1 && (
        <div className="flex sm:hidden items-center justify-center gap-1.5 mt-2">
          {Array.from({ length: totalGroups }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const targetLeft = i * el.clientWidth;
                el.scrollTo({ left: targetLeft, behavior: 'smooth' });
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-6 bg-brand' : 'w-1.5 bg-gray-300'
              }`}
              aria-label={`Ir al grupo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Versión del carrusel con anchos responsivos correctos.
 * Esta es la que se debe usar en producción: calcula el ancho de cada
 * tarjeta según el breakpoint actual.
 */
export function CategoryCarouselResponsive({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(2);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);

    // Calcular items por vista según el ancho del contenedor.
    // Móvil (<640): 2 items (50% cada uno).
    // Tablet (640-768): 3 items.
    // Desktop (768-1024): 4 items.
    // Large (>=1024): 5 items.
    let visible = 2;
    if (clientWidth >= 1024) visible = 5;
    else if (clientWidth >= 768) visible = 4;
    else if (clientWidth >= 640) visible = 3;
    setItemsPerView(visible);

    const cardWidth = clientWidth / visible;
    const idx = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, idx));
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, products]);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = el.clientWidth * 0.85 * direction;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  const totalGroups = Math.max(1, Math.ceil(products.length / itemsPerView));

  // Clases responsivas para el ancho de cada tarjeta.
  // 2 cols en móvil, 3 en sm, 4 en md, 5 en lg.
  const cardWidthClass = 'w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5';

  return (
    <div className="relative">
      {/* Flecha izquierda — solo desktop (>= sm) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 z-20 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-700 hover:bg-brand hover:text-white hover:scale-110 transition-all"
          aria-label="Desplazar a la izquierda"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Track scrollable */}
      <div
        ref={scrollRef}
        className="carousel-track flex gap-2 sm:gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          .carousel-track::-webkit-scrollbar { display: none; }
        `}</style>
        {products.map((product) => (
          <div
            key={product.id}
            className={`snap-start shrink-0 ${cardWidthClass}`}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Flecha derecha — solo desktop */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByCards(1)}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 z-20 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-700 hover:bg-brand hover:text-white hover:scale-110 transition-all"
          aria-label="Desplazar a la derecha"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Indicadores (dots) — solo móvil */}
      {totalGroups > 1 && (
        <div className="flex sm:hidden items-center justify-center gap-1.5 mt-2">
          {Array.from({ length: totalGroups }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const targetLeft = i * el.clientWidth;
                el.scrollTo({ left: targetLeft, behavior: 'smooth' });
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-6 bg-brand' : 'w-1.5 bg-gray-300'
              }`}
              aria-label={`Ir al grupo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
