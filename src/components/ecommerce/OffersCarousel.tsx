'use client';

import { useState, useEffect, useRef } from 'react';
import { CategoryCarouselResponsive } from './CategoryCarousel';
import { Loader2, Tag } from 'lucide-react';

interface OffersCarouselConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  /** IDs de productos destacados. Si está vacío, se auto-detectan ofertas activas. */
  productIds: string[];
  /** Color de fondo opcional (hex). Si está vacío, usa brand-dark. */
  backgroundColor: string;
  /** Color de texto opcional. Si está vacío, usa blanco. */
  textColor: string;
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

const DEFAULT_CONFIG: OffersCarouselConfig = {
  enabled: true,
  title: '🔥 Ofertas Destacadas',
  subtitle: 'Aprovecha los mejores precios por tiempo limitado',
  productIds: [],
  backgroundColor: '',
  textColor: '',
};

function parseConfig(json: string): OffersCarouselConfig {
  if (!json || !json.trim()) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(json);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Carrusel de Ofertas Destacadas.
 *
 * Aparece al inicio del catálogo (antes de las categorías) cuando está
 * habilitado en el admin. Configurable:
 *  - enabled: mostrar/ocultar.
 *  - title / subtitle: textos personalizables.
 *  - productIds: lista manual de productos. Si está vacío, se auto-detectan
 *    productos con oferta activa (offerEnabled=true, offerPrice<price,
 *    dentro del rango de fechas).
 *  - backgroundColor / textColor: colores opcionales del header. Si están
 *    vacíos, usa brand-dark / white del tema activo.
 *
 * Usa el mismo CategoryCarouselResponsive para consistencia visual con
 * los carruseles de categoría.
 */
export function OffersCarousel() {
  const [config, setConfig] = useState<OffersCarouselConfig>(DEFAULT_CONFIG);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const configRes = await fetch('/api/siteconfig');
        const configData = await configRes.json();

        // Verificar si la sección 'offers' está activa en homeSectionsEnabled.
        // Si está desactivada, no cargar nada.
        let offersSectionEnabled = true;
        try {
          const enabledMap = JSON.parse(configData?.homeSectionsEnabled || '{}');
          if (enabledMap.offers === false) offersSectionEnabled = false;
        } catch { /* ignore */ }

        const cfg = parseConfig(configData?.offersCarousel || '');
        // El carrusel solo se muestra si AMBOS toggles están activos:
        // 1. La sección 'offers' en el SectionOrderEditor.
        // 2. El enabled interno del offersCarousel JSON.
        if (!offersSectionEnabled || !cfg.enabled) {
          setLoading(false);
          return;
        }
        setConfig(cfg);

        // 2. Cargar productos.
        // Si hay productIds manuales, usar esos. Si no, cargar productos
        // con oferta activa (el endpoint ya filtra).
        let productsUrl = '/api/products?featured=true&take=12';
        if (cfg.productIds && cfg.productIds.length > 0) {
          // Cargar todos y filtrar por ID (el endpoint no soporta ?ids=).
          // En una implementación futura se podría añadir un endpoint
          // /api/products?ids=id1,id2,id3.
          productsUrl = '/api/products';
        }
        const prodsRes = await fetch(productsUrl);
        const prodsData = await prodsRes.json();
        let allProducts: Product[] = Array.isArray(prodsData) ? prodsData : (prodsData.products || []);

        if (cfg.productIds && cfg.productIds.length > 0) {
          // Filtrar por IDs manuales, preservando el orden.
          const idSet = new Set(cfg.productIds);
          allProducts = allProducts.filter((p) => idSet.has(p.id));
          // Ordenar según productIds.
          allProducts.sort((a, b) => {
            const ia = cfg.productIds.indexOf(a.id);
            const ib = cfg.productIds.indexOf(b.id);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          });
        } else {
          // Auto-detectar productos con oferta activa.
          allProducts = allProducts.filter((p) => isOfferActive(p));
        }

        setProducts(allProducts);
      } catch (err) {
        console.error('Error loading offers carousel:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // No renderizar si está deshabilitado o no hay productos.
  if (!config.enabled) return null;
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          <span className="text-sm text-gray-500">Cargando ofertas…</span>
        </div>
      </section>
    );
  }
  if (products.length === 0) return null;

  // Estilos del header: usar colores custom o defaults del tema.
  const headerBg = config.backgroundColor || undefined;
  const headerText = config.textColor || undefined;
  const headerStyle: React.CSSProperties = {};
  if (headerBg) headerStyle.backgroundColor = headerBg;
  if (headerText) {
    headerStyle.color = headerText;
  }

  return (
    <section
      ref={sectionRef}
      id="ofertas-destacadas"
      className="max-w-7xl mx-auto px-3 sm:px-4 py-4 md:py-6 scroll-mt-20"
    >
      {/* Header con título + subtítulo */}
      <div
        className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 md:mb-4 ${!headerBg ? 'bg-gradient-to-r from-brand to-brand-dark text-white' : ''}`}
        style={headerStyle}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl shrink-0">🔥</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl md:text-2xl font-bold leading-tight">
              {config.title}
            </h2>
            {config.subtitle && (
              <p className={`text-xs sm:text-sm mt-0.5 ${headerText ? '' : 'opacity-90'}`}>
                {config.subtitle}
              </p>
            )}
          </div>
          <Tag className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 ${headerText ? '' : 'opacity-80'}`} />
        </div>
      </div>

      {/* Carrusel de productos en oferta */}
      <CategoryCarouselResponsive products={products} />
    </section>
  );
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
    const end = new Date(product.offerEnd);
    if (!isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}
