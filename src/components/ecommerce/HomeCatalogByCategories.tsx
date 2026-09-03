'use client';

import { useState, useEffect, useRef } from 'react';
import { CategoryCarouselResponsive } from './CategoryCarousel';
import { ProductCard } from './ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  _count?: { products: number };
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
}

/**
 * Catálogo del home organizado por categorías.
 *
 * Cada categoría activa (con productos) se muestra como una sección
 * independiente con un carrusel horizontal de productos.
 *
 * Estructura:
 *   [Icono] Nombre de la categoría              [Ver todo →]
 *   [Carrusel horizontal de productos]
 *
 * El botón "Ver todo" desplaza al usuario a una vista filtrada por
 * esa categoría (ya no existe la página "Productos" general).
 *
 * Las secciones tienen un `id` basado en el slug de la categoría para
 * poder navegar a ellas vía anchor (#categoria-slug).
 */
interface HomeCatalogByCategoriesProps {
  /**
   * Catálogo a mostrar: 'immediate' (Venta Directa), 'reservation'
   * (Por Reserva) o undefined (todo). La API filtra por la sección de la
   * categoría (configurable en el admin) + flag reservationEnabled.
   */
  catalog?: 'reservation' | 'immediate';
}

export function HomeCatalogByCategories({ catalog }: HomeCatalogByCategoriesProps = {}) {
  const { selectCategory } = useAppStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);
  const [catalogLayout, setCatalogLayout] = useState<string>('categories');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    async function loadData() {
      try {
        // Cargar config para saber el modo de visualización.
        const configRes = await fetch('/api/siteconfig');
        const configData = await configRes.json().catch(() => ({}));
        setCatalogLayout(configData?.catalogLayout || 'categories');

        // 1. Cargar categorías — siempre validar que sea un array.
        const catsRes = await fetch('/api/categories');
        const catsRaw = await catsRes.json().catch(() => []);
        const cats: Category[] = Array.isArray(catsRaw) ? catsRaw : [];
        setCategories(cats);

        // 2. Cargar productos de cada categoría en paralelo (respetando el
        //    catálogo: immediate / reservation / todo).
        const catalogQ = catalog ? `&catalog=${catalog}` : '';
        // Defensivo: solo iterar si cats es array no vacío.
        const productsPerCat = cats.length > 0 ? await Promise.all(
          cats.map(async (cat) => {
            try {
              const res = await fetch(`/api/products?category=${cat.slug}&take=12${catalogQ}`);
              const data = await res.json().catch(() => []);
              const arr = Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : []);
              return { slug: cat.slug, products: arr };
            } catch {
              return { slug: cat.slug, products: [] };
            }
          })
        ) : [];
        const map: Record<string, Product[]> = {};
        for (const { slug, products } of productsPerCat) {
          map[slug] = products;
        }
        setProductsByCategory(map);
      } catch (err) {
        console.error('Error loading catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [catalog]);

  // Solo mostrar categorías que tengan al menos 1 producto.
  // Defensivo: si categories no es array, usar [].
  const visibleCategories = (Array.isArray(categories) ? categories : []).filter(
    (cat) => (productsByCategory[cat.slug]?.length || 0) > 0
  );

  /**
   * Maneja la selección de categoría desde la CategoryBar del home.
   * - En modo "categorías" (default): hace scroll a la sección de la
   *   categoría dentro de la misma vista (mejor UX que cambiar de página).
   * - En modo apilado o si no se encuentra la sección: usa el comportamiento
   *   por defecto (navegar a la vista 'catalog' filtrada).
   * - "Todos" (null): vuelve al inicio del catálogo.
   */
  const handleCategorySelect = (slug: string | null) => {
    if (slug === null) {
      // Volver al inicio del catálogo (sección de la primera categoría
      // o, si no hay, subir al top del catálogo).
      const firstSlug = visibleCategories[0]?.slug;
      const el = firstSlug ? sectionRefs.current[firstSlug] : null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        document.getElementById('catalogo-categorias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const el = sectionRefs.current[slug];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Sección no encontrada (probablemente modo apilado) → ir al catálogo.
      selectCategory(slug);
    }
  };

  if (loading) {
    return (
      <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Cargando productos…</h2>
        </div>
        {/* Skeleton de carruseles */}
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
              <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="w-1/2 sm:w-1/4 aspect-[3/4] bg-gray-100 rounded-xl animate-pulse shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (visibleCategories.length === 0) {
    return (
      <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-12 text-center">
        <p className="text-gray-500">Aún no hay productos publicados.</p>
      </section>
    );
  }

  // ── Modo apilado: TODOS los productos en un solo grid continuo ──
  // Sin separación por categorías, sin espacios en blanco entre secciones.
  if (catalogLayout === 'stacked') {
    const allProducts = visibleCategories.flatMap((cat) => productsByCategory[cat.slug] || []);
    if (allProducts.length === 0) {
      return (
        <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-12 text-center">
          <p className="text-gray-500">Aún no hay productos publicados.</p>
        </section>
      );
    }
    return (
      <div>
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-6 md:py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {allProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Modo categorías (default): carruseles por categoría ──
  return (
    <div>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-6 md:py-8 space-y-8 md:space-y-10">
        {visibleCategories.map((category) => {
        const products = productsByCategory[category.slug] || [];
        return (
          <section
            key={category.id}
            id={`categoria-${category.slug}`}
            ref={(el) => { sectionRefs.current[category.slug] = el; }}
            className="scroll-mt-20"
          >
            {/* Header de la categoría: icono + nombre + contador + Ver todo */}
            <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {category.image ? (
                  <img
                    src={category.image}
                    alt=""
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl shrink-0">{category.icon}</span>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight truncate">
                    {category.name}
                  </h2>
                  {category._count && (
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      {category._count.products} producto{category._count.products === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-brand-dark hover:text-brand-dark text-xs sm:text-sm shrink-0 -mr-2"
                onClick={() => selectCategory(category.slug)}
              >
                Ver todo
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>

            <CategoryCarouselResponsive products={products} />
          </section>
        );
      })}
      </div>
    </div>
  );
}
