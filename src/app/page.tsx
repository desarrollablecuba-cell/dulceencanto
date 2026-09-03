'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { Header } from '@/components/ecommerce/Header';
import { CategoryBar } from '@/components/ecommerce/CategoryBar';
import { Footer } from '@/components/ecommerce/Footer';
import { CartSidebar } from '@/components/ecommerce/CartSidebar';
import { EventReservationModal } from '@/components/ecommerce/EventReservationModal';
import { VitrinaHome } from '@/components/ecommerce/VitrinaHome';
import { SectionPage } from '@/components/ecommerce/SectionPage';
import {
  HOME_SECTIONS,
  HOME_SECTION_COMPONENTS,
  DEFAULT_HOME_SECTIONS_ORDER,
  type HomeSectionId,
} from '@/components/ecommerce/HomeSections';
import { HomeSkeleton } from '@/components/ecommerce/HomeSkeleton';
import { parseSectionImages, type SectionImages } from '@/lib/section-images';

// Dock de navegación móvil — solo se renderiza en pantallas < lg (CSS lo oculta
// en desktop). Dinámico para no afectar el bundle inicial.
const MobileNavDock = dynamic(() => import('@/components/ecommerce/MobileNavDock').then(m => ({ default: m.MobileNavDock })), {
  ssr: false,
});

// ── Lazy-loaded view components ──────────────────────────────────────────
// Estos componentes son pesados (forman sus propios chunks) y solo se cargan
// cuando el usuario navega a la vista correspondiente. Esto reduce el bundle
// inicial del home y mejora el TTI (Time To Interactive).
//
// `ssr: false` se usa solo para componentes que no necesitan SEO (checkout,
// orders, account). Los catálogos sí se SSR para SEO y para que el contenido
// aparezca inmediatamente.
const ProductDetail = dynamic(() => import('@/components/ecommerce/ProductDetail').then(m => ({ default: m.ProductDetail })), {
  loading: () => <ViewLoader />,
});
const CheckoutForm = dynamic(() => import('@/components/ecommerce/CheckoutForm').then(m => ({ default: m.CheckoutForm })), {
  ssr: false,
  loading: () => <ViewLoader />,
});
const OrderHistory = dynamic(() => import('@/components/ecommerce/OrderHistory').then(m => ({ default: m.OrderHistory })), {
  ssr: false,
  loading: () => <ViewLoader />,
});
const AIAssistant = dynamic(() => import('@/components/ecommerce/AIAssistant').then(m => ({ default: m.AIAssistant })), {
  ssr: false,
});
const WishlistSidebar = dynamic(() => import('@/components/ecommerce/WishlistSidebar').then(m => ({ default: m.WishlistSidebar })), {
  ssr: false,
});
const CustomerView = dynamic(() => import('@/components/ecommerce/CustomerView').then(m => ({ default: m.CustomerView })), {
  ssr: false,
  loading: () => <ViewLoader />,
});
const ProductGrid = dynamic(() => import('@/components/ecommerce/ProductGrid').then(m => ({ default: m.ProductGrid })), {
  loading: () => <ViewLoader />,
});
const CatalogView = dynamic(() => import('@/components/ecommerce/CatalogView').then(m => ({ default: m.CatalogView })), {
  loading: () => <ViewLoader />,
});
const ServicesSection = dynamic(() => import('@/components/ecommerce/ServicesSection').then(m => ({ default: m.ServicesSection })), {
  loading: () => <ViewLoader />,
});
const PromotionsSection = dynamic(() => import('@/components/ecommerce/PromotionsSection').then(m => ({ default: m.PromotionsSection })), {
  loading: () => <ViewLoader />,
});
const GallerySection = dynamic(() => import('@/components/ecommerce/GallerySection').then(m => ({ default: m.GallerySection })), {
  loading: () => <ViewLoader />,
});
const SchedulesPage = dynamic(() => import('@/components/ecommerce/SchedulesPage').then(m => ({ default: m.SchedulesPage })), {
  loading: () => <ViewLoader />,
});
const DeliveryZonesPage = dynamic(() => import('@/components/ecommerce/DeliveryZonesPage').then(m => ({ default: m.DeliveryZonesPage })), {
  loading: () => <ViewLoader />,
});
const ExchangeRatesPage = dynamic(() => import('@/components/ecommerce/ExchangeRatesPage').then(m => ({ default: m.ExchangeRatesPage })), {
  loading: () => <ViewLoader />,
});

// Loader ligero para mostrar mientras carga un lazy component
function ViewLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#EC4899', borderTopColor: 'transparent' }} />
    </div>
  );
}

/**
 * Resuelve el orden de secciones desde el homeSectionsOrder guardado.
 * Filtra IDs inválidos y añade los que falten al final (para retrocompat).
 *
 * MIGRACIÓN:
 *  - `socialProof` (legacy) → `socialStats`
 *    (en v48 se separaron estadísticas y testimonios; las estadísticas
 *    tienen su propia sección `socialStats`).
 *  - `testimonials` (legacy de v48) → se ELIMINA como sección separada.
 *    Los testimonios ahora se muestran dentro de `storeReviews`
 *    (reseñas + testimonios unificados, evitando duplicar "Lo que dicen
 *    nuestros clientes"). Si el admin no tiene `storeReviews` en el orden,
 *    lo añadimos en la posición donde estaba `testimonials`.
 *  - `socialProof` y `testimonials` se filtran del resultado final para
 *    evitar renderizados duplicados.
 */
function resolveSectionsOrder(saved: string | undefined): HomeSectionId[] {
  if (!saved || !saved.trim()) return DEFAULT_HOME_SECTIONS_ORDER;
  const ids = saved.split(',').map(s => s.trim()).filter(Boolean);
  const migrated: string[] = [];
  for (const id of ids) {
    if (id === 'socialProof') {
      if (!migrated.includes('socialStats')) migrated.push('socialStats');
    } else if (id === 'testimonials') {
      // v48 tenía `testimonials` como sección independiente — v49 lo une
      // a `storeReviews`. Inserta `storeReviews` si no existe ya.
      if (!migrated.includes('storeReviews')) migrated.push('storeReviews');
    } else {
      migrated.push(id);
    }
  }
  const validIds = new Set(HOME_SECTIONS.map(s => s.id));
  // Filtrar IDs legacy (`socialProof`, `testimonials`) que ya fueron migrados.
  const knownIds = migrated
    .filter(id => id !== 'socialProof' && id !== 'testimonials' && validIds.has(id as HomeSectionId)) as HomeSectionId[];
  // Añadir TODAS las secciones disponibles que falten (no solo las del
  // default order), para que secciones como 'scheduleDetailed' aparezcan
  // al final si el usuario las activó pero no están en el orden guardado.
  for (const s of HOME_SECTIONS) {
    if (!knownIds.includes(s.id)) knownIds.push(s.id);
  }
  return knownIds;
}

/**
 * Parsea el estado de activación de secciones desde homeSectionsEnabled.
 * Devuelve un mapa { sectionId: boolean }. Si una sección no está en el
 * mapa, se considera activa por defecto.
 */
function parseSectionsEnabled(json: string | undefined): Record<string, boolean> {
  if (!json || !json.trim()) return {};
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Vista del Home: renderiza las secciones en el orden configurado.
 * Cada sección es un componente independiente (ver HomeSections.tsx).
 *
 * Escucha mensajes postMessage del tipo DPE_HOME_SECTIONS_ORDER para
 * permitir que el SectionOrderEditor del admin aplique cambios en tiempo
 * real sobre esta vista (cuando está embebida en un iframe del admin).
 */
function HomeView() {
  const [sectionsOrder, setSectionsOrder] = useState<HomeSectionId[] | null>(null);
  const [sectionsEnabled, setSectionsEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setSectionsOrder(resolveSectionsOrder(data.homeSectionsOrder));
          setSectionsEnabled(parseSectionsEnabled(data.homeSectionsEnabled));
        } else {
          setSectionsOrder(DEFAULT_HOME_SECTIONS_ORDER);
        }
      })
      .catch(() => setSectionsOrder(DEFAULT_HOME_SECTIONS_ORDER));

    // Escuchar mensajes del admin (cuando esta vista está en un iframe).
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DPE_HOME_SECTIONS_ORDER') {
        if (Array.isArray(event.data.order)) {
          setSectionsOrder(resolveSectionsOrder(event.data.order.join(',')));
        }
        if (event.data.enabled && typeof event.data.enabled === 'object') {
          setSectionsEnabled(event.data.enabled);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!sectionsOrder) {
    return <HomeSkeleton />;
  }

  const isSectionEnabled = (id: HomeSectionId): boolean => sectionsEnabled[id] !== false;

  return (
    <>
      {sectionsOrder
        .filter((sectionId) => isSectionEnabled(sectionId))
        .map((sectionId) => {
          const Component = HOME_SECTION_COMPONENTS[sectionId];
          if (!Component) return null;
          return <Component key={sectionId} />;
        })}
    </>
  );
}

/**
 * CategoryBar fija (sticky) justo debajo del Header y ANTES de la cinta de
 * titulares. Se renderiza en page.tsx para garantizar el orden visual:
 *   1. Header (sticky top-0)
 *   2. CategoryBar (sticky top-[60px])
 *   3. HeaderTicker (cintillo)
 *   4. HomeView (secciones)
 *
 * Maneja la selección de categoría haciendo scroll a la sección
 * `categoria-${slug}` (renderizada por HomeCatalogByCategories) o al inicio
 * del catálogo cuando se selecciona "Todos".
 */
interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  _count?: { products: number };
}

function HomeCategoryBar() {
  const { selectCategory } = useAppStore();
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const handleSelect = (slug: string | null) => {
    if (slug === null) {
      // Volver al inicio del catálogo.
      document.getElementById('catalogo-categorias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const el = document.getElementById(`categoria-${slug}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Sección no encontrada (modo apilado o catálogo filtrado) → ir al catálogo.
      selectCategory(slug);
    }
  };

  if (categories.length === 0) return null;

  return (
    <div className="sticky top-[120px] sm:top-[60px] z-30 shadow-sm" style={{ background: 'linear-gradient(90deg, #FAF5FF 0%, #FDF2F8 100%)' }}>
      <CategoryBar
        categories={categories}
        selectedCategory={null}
        onSelect={handleSelect}
      />
    </div>
  );
}

function AppContent() {
  const currentView = useAppStore((s) => s.currentView);
  const goBack = useAppStore((s) => s.goBack);
  const [reservationOpen, setReservationOpen] = useState(false);

  // Escuchar evento global para abrir el modal de reserva (desde ServicesSection, hero, etc.)
  useEffect(() => {
    const handler = () => setReservationOpen(true);
    window.addEventListener('dulce-encanto:open-reservation', handler);
    return () => window.removeEventListener('dulce-encanto:open-reservation', handler);
  }, []);

  // Rehydrate cart from localStorage after mount
  useEffect(() => {
    // Rehydrate wishlist desde localStorage
    useWishlistStore.getState().hydrate();

    const rehydrate = () => {
      try {
        const saved = localStorage.getItem('diaz-premium-cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.state?.items) {
            useCartStore.setState({ items: parsed.state.items, _hydrated: true });
          } else {
            useCartStore.setState({ _hydrated: true });
          }
        } else {
          useCartStore.setState({ _hydrated: true });
        }
      } catch {
        useCartStore.setState({ _hydrated: true });
      }
    };
    requestAnimationFrame(rehydrate);
  }, []);

  // ── Botón atrás del móvil ──
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (currentView !== 'home') {
        e.preventDefault();
        goBack();
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView, goBack]);

  // ── Scroll al inicio al cambiar de vista (checkout, producto, etc.) ──
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Imágenes de las secciones (configurables desde el admin → Secciones).
  // Los banners de las páginas de sección usan la misma imagen que la card del home.
  const [sectionImages, setSectionImages] = useState<SectionImages>(() => parseSectionImages(null));
  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => setSectionImages(parseSectionImages(data?.sectionImages)))
      .catch(() => {});
  }, []);

  const renderView = () => {
    const banner = (id: string, fallback: string) => sectionImages[id] || fallback;
    switch (currentView) {
      case 'home':
        return <VitrinaHome />;
      case 'catalog':
        return <ProductGrid />;
      case 'product':
        return <ProductDetail />;
      case 'checkout':
        return <CheckoutForm />;
      case 'orders':
        return <OrderHistory />;
      case 'account':
        return <CustomerView />;
      // ── Secciones independientes ──
      case 'immediate':
        return (
          <SectionPage title="Venta Directa" subtitle="Dulces finos y buffet listos para llevar. Pídelo hoy y recíbelo fresco." icon="🛒" bannerImage={banner('immediate', '/card-venta-directa.webp')}>
            <CatalogView catalog="immediate" />
          </SectionPage>
        );
      case 'reservations':
        return (
          <SectionPage title="Reservas de Tartas y Pasteles" subtitle="Tortas, pasteles de dos y tres pisos, cakes de bandeja. Reserva con 48h de anticipación." icon="📅" bannerImage={banner('reservations', '/card-reservas.webp')}>
            <CatalogView catalog="reservation" />
          </SectionPage>
        );
      case 'services':
        return (
          <SectionPage title="Servicios para Eventos" subtitle="Decoración, entretenimiento, sueños sorpresa y detalles personalizados." icon="🎨" bannerImage={banner('services', '/card-servicios.webp')}>
            <ServicesSection />
          </SectionPage>
        );
      case 'promotions':
        return (
          <SectionPage title="Promociones Especiales" subtitle="Ofertas por fechas importantes. Combos especiales para celebrar los momentos que más importan." icon="💝" bannerImage={banner('promotions', '/card-promociones.webp')}>
            <PromotionsSection />
          </SectionPage>
        );
      case 'gallery':
        return (
          <SectionPage title="Galería de Eventos" subtitle="Inspírate con nuestros trabajos anteriores. Cada evento es único, como el tuyo." icon="🖼️" bannerImage={banner('gallery', '/card-galeria.webp')}>
            <GallerySection />
          </SectionPage>
        );
      case 'schedules':
        return <SchedulesPage />;
      case 'delivery-zones':
        return <DeliveryZonesPage />;
      case 'exchange-rates':
        return <ExchangeRatesPage />;
      default:
        return <VitrinaHome />;
    }
  };

  // Ocultar footer en vistas que aprovechan toda la pantalla.
  const hideFooter = currentView === 'product' || currentView === 'account' || currentView === 'checkout';

  // La CategoryBar ya no se usa en vitrina ni en catálogos (CatalogView tiene sus propios chips).
  const showHomeChrome = false;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
      <Header />
      {showHomeChrome && <HomeCategoryBar />}
      <main className="flex-1">
        {/* Page transitions: animación suave entre vistas con AnimatePresence.
            La key es la vista actual para que framer-motion detecte el cambio
            y anime la salida/entrada. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      {!hideFooter && <Footer />}
      {/* Dock de navegación móvil (Venta Directa, Reservas, Servicios…) */}
      <MobileNavDock />
      <CartSidebar />
      <WishlistSidebar />
      {currentView !== 'checkout' && <AIAssistant />}
      <EventReservationModal open={reservationOpen} onOpenChange={setReservationOpen} />
    </div>
  );
}

export default function HomePage() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
