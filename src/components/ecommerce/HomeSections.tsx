'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, ShieldCheck, Truck, Globe, Heart, Package, CreditCard,
  CheckCircle2, Truck as TruckIcon, Send, Zap, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { CountryFlag } from '@/components/ecommerce/CountryFlag';
import { PriorityDeliveryModal } from '@/components/ecommerce/PriorityDeliveryModal';
import { HomeCatalogByCategories } from '@/components/ecommerce/HomeCatalogByCategories';
import { OffersCarousel } from '@/components/ecommerce/OffersCarousel';
import { DeliveryZonesSection } from '@/components/ecommerce/DeliveryZonesSection';
import { StoreReviewsSection } from '@/components/ecommerce/StoreReviewsSection';
import { ServicesSection } from '@/components/ecommerce/ServicesSection';
import { PromotionsSection } from '@/components/ecommerce/PromotionsSection';
import { GallerySection } from '@/components/ecommerce/GallerySection';

// ─── Tipos compartidos ─────────────────────────────────────────────────────

interface HorarioCard {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface SiteConfigData {
  cover: string;
  activeCountries: string;
  homeBenefits: string;
  socialStats: string;
  testimonials: string;
  horarioSectionTitle: string;
  horarioSectionDesc: string;
  horarioCards: string;
  howItWorksSteps: string;
  scheduleLunes: string;
  scheduleMartes: string;
  scheduleMiercoles: string;
  scheduleJueves: string;
  scheduleViernes: string;
  scheduleSabado: string;
  scheduleDomingo: string;
  heroTitle: string;
  heroSubtitle: string;
  heroSlides: string;
  promoBannerTitle: string;
  promoBannerSubtitle: string;
  promoBannerButtonText: string;
}

const CARD_COLORS: Record<string, { bg: string; iconBg: string; border: string }> = {
  blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', border: 'border-blue-100' },
  emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', border: 'border-emerald-100' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', border: 'border-purple-100' },
  amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', border: 'border-amber-100' },
  rose: { bg: 'bg-rose-50', iconBg: 'bg-rose-100', border: 'border-rose-100' },
};

function renderDescription(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

const FALLBACK_STATS = [
  { value: '2,500+', label: 'Pedidos entregados' },
  { value: '800+', label: 'Clientes satisfechos' },
  { value: 'Diarias', label: 'Entregas en Ciego de Ávila' },
  { value: '100%', label: 'Servicio confiable' },
];

const FALLBACK_TESTIMONIALS = [
  { name: 'María González', location: 'Miami, USA', text: 'Pude enviarle alimentos a mi mamá en Ciego de Ávila de forma rapidísima. El servicio es excelente y muy confiable.', rating: 5 },
  { name: 'Carlos Pérez', location: 'Madrid, España', text: 'La mejor opción para enviar a Cuba. Los productos llegaron en perfectas condiciones y el pago fue muy fácil.', rating: 5 },
  { name: 'Ana Rodríguez', location: 'Ciego de Ávila, Cuba', text: 'Recibí todo en la puerta de mi casa. La atención fue excelente y los productos de muy buena calidad.', rating: 5 },
];

const FALLBACK_BENEFITS = [
  { icon: 'truck',    title: 'Entrega a domicilio',   desc: 'En Ciego de Ávila y alrededores',     color: 'text-purple-600',  bg: 'bg-purple-50' },
  { icon: 'sparkles',title: '100% Fresco',           desc: 'Horneado el mismo día de tu evento',  color: 'text-pink-600',    bg: 'bg-pink-50' },
  { icon: 'heart',   title: 'Diseños únicos',        desc: 'Personalizamos tu tarta a la medida',  color: 'text-rose-600',    bg: 'bg-rose-50' },
  { icon: 'shield',  title: 'Atención directa',      desc: 'Asesoría inmediata por WhatsApp',      color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
];

const ICON_MAP: Record<string, typeof ShieldCheck> = {
  shield: ShieldCheck, truck: Truck, globe: Globe, heart: Heart,
};

// Mapa de iconos para los pasos de "Comprar es muy fácil" (HowItWorks).
// Las claves son strings que se guardan en SiteConfig.howItWorksSteps.
const HOW_IT_WORKS_ICON_MAP: Record<string, typeof ShieldCheck> = {
  package: Package,
  send: Send,
  check: CheckCircle2,
  creditcard: CreditCard,
  truck: TruckIcon,
  shield: ShieldCheck,
  globe: Globe,
  heart: Heart,
};

// Pasos por defecto (usados cuando SiteConfig.howItWorksSteps está vacío).
// Las claves de icono deben coincidir con HOW_IT_WORKS_ICON_MAP.
const DEFAULT_HOW_IT_WORKS_STEPS = [
  { icon: 'package',    title: 'Elige tus dulces',     desc: 'Explora nuestro catálogo de tartas, cupcakes y postres.' },
  { icon: 'send',       title: 'Haz tu pedido',         desc: 'Completa el formulario con los datos de tu evento.' },
  { icon: 'check',      title: 'Confirmamos tu diseño', desc: 'Validamos detalles, decoración y fecha de entrega.' },
  { icon: 'creditcard', title: 'Realiza el pago',       desc: 'Paga en efectivo o por transferencia (CUP).' },
  { icon: 'truck',      title: 'Entregamos fresco',     desc: 'Tu pedido llega el día del evento, recién horneado.' },
];

const STEPS = [
  { icon: Package, title: 'Elige tus dulces', desc: 'Explora nuestro catálogo de tartas, cupcakes y postres.' },
  { icon: Send, title: 'Haz tu pedido', desc: 'Completa el formulario con los datos de tu evento.' },
  { icon: CheckCircle2, title: 'Confirmamos tu diseño', desc: 'Validamos detalles, decoración y fecha de entrega.' },
  { icon: CreditCard, title: 'Realiza el pago', desc: 'Paga en efectivo o por transferencia (CUP).' },
  { icon: TruckIcon, title: 'Entregamos fresco', desc: 'Tu pedido llega el día del evento, recién horneado.' },
];

// ─── Hook para cargar config ───────────────────────────────────────────────

function useSiteConfig(): SiteConfigData | null {
  const [config, setConfig] = useState<SiteConfigData | null>(null);
  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          cover: data.cover || '/products/hero-dessert-table.webp',
          activeCountries: data.activeCountries || 'US,CU',
          homeBenefits: data.homeBenefits || '[]',
          socialStats: data.socialStats || '[]',
          testimonials: data.testimonials || '[]',
          horarioSectionTitle: data.horarioSectionTitle || 'Pide con tiempo, recíbelo fresco',
          horarioSectionDesc: data.horarioSectionDesc || 'Tres cosas que debes saber sobre cómo trabajamos para que tu pedido llegue siempre perfecto a tu evento.',
          horarioCards: data.horarioCards || '[]',
          howItWorksSteps: data.howItWorksSteps || '',
          scheduleLunes: data.scheduleLunes || '',
          scheduleMartes: data.scheduleMartes || '',
          scheduleMiercoles: data.scheduleMiercoles || '',
          scheduleJueves: data.scheduleJueves || '',
          scheduleViernes: data.scheduleViernes || '',
          scheduleSabado: data.scheduleSabado || '',
          scheduleDomingo: data.scheduleDomingo || '',
          heroTitle: data.heroTitle || '',
          heroSubtitle: data.heroSubtitle || '',
          heroSlides: data.heroSlides || '',
          promoBannerTitle: data.promoBannerTitle || '',
          promoBannerSubtitle: data.promoBannerSubtitle || '',
          promoBannerButtonText: data.promoBannerButtonText || '',
        });
      })
      .catch(() => {});
  }, []);
  return config;
}

// ─── SECCIÓN 1: HERO (Banner Moderno Rotativo) ──────────────────────────────

interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  link?: string;
  category?: string;
}

function parseHeroSlides(raw: string): HeroSlide[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((s) => s && s.image && s.title);
    }
  } catch { /* ignore */ }
  return [];
}

/** Renderiza texto con resaltado **bold** → <span class="text-brand-light"> */
function renderHighlighted(text: string, highlightClass = 'text-brand-light') {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <span key={i} className={highlightClass}>{part.slice(2, -2)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    image: '/hero-slide-1.webp',
    title: 'Sabor y elegancia para tus **momentos especiales**',
    subtitle: 'Pasteles personalizados, cupcakes y postres fríos elaborados con los mejores ingredientes y mucho amor. Horneado el mismo día de tu evento.',
    cta: '🧁 Ver catálogo',
    link: 'catalog',
  },
  {
    image: '/hero-slide-2.webp',
    title: 'Dulces finos y buffet listos para llevar',
    subtitle: 'Empanadillas, cupcakes, brownies, tequeños y mucho más. Pídelo hoy y recíbelo fresco en Ciego de Ávila.',
    cta: '🛒 Venta directa',
    link: 'catalog',
    category: 'immediate',
  },
  {
    image: '/hero-slide-3.webp',
    title: 'Tartas y pasteles para reservar',
    subtitle: 'Tortas personalizadas, pasteles de dos y tres pisos, cakes de bandeja. Reserva con 48h de anticipación para tu evento.',
    cta: '📅 Reservar',
    link: 'catalog',
    category: 'reservations',
  },
  {
    image: '/hero-slide-4.webp',
    title: 'Promociones por fechas especiales',
    subtitle: 'Ofertas para Día de las Madres, San Valentín, Fin de Año y más. Combos especiales con descuento.',
    cta: '💝 Ver promociones',
    link: 'catalog',
    category: 'promotions',
  },
  {
    image: '/hero-slide-5.webp',
    title: 'Galería de eventos inolvidables',
    subtitle: 'Inspírate con nuestros trabajos: cumpleaños infantiles, 15 años, bodas y celebraciones únicas.',
    cta: '🖼️ Ver galería',
    link: 'catalog',
    category: 'gallery',
  },
];

export function HeroSection() {
  const { setView, selectCategory } = useAppStore();
  const config = useSiteConfig();
  const slides = parseHeroSlides(config?.heroSlides || '');
  const finalSlides = slides.length > 0 ? slides : DEFAULT_HERO_SLIDES;

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = finalSlides.length;

  const goTo = useCallback((idx: number) => {
    setCurrent((prev) => (idx < 0 ? total - 1 : idx >= total ? 0 : idx));
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-rotate cada 5 segundos (pausa en hover)
  useEffect(() => {
    if (isPaused || total <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, total]);

  const handleCta = (slide: HeroSlide) => {
    // Si el slide tiene una categoría que corresponde a una sección, navegar a esa vista
    if (slide.category === 'immediate' || slide.category === 'reservations' || slide.category === 'services' || slide.category === 'promotions' || slide.category === 'gallery') {
      setView(slide.category as any);
      return;
    }
    // Si no, scroll al catálogo
    const el = document.getElementById('catalogo-categorias');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else setView('catalog');
  };

  if (total === 0) return null;
  const slide = finalSlides[current];

  return (
    <section className="relative">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        <div
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-card group/hero"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Slides: crossfade */}
          <div className="relative h-[280px] sm:h-[420px] md:h-[520px]">
            {finalSlides.map((s, i) => (
              <img
                key={i}
                src={s.image}
                alt={s.title.replace(/\*\*/g, '')}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                style={{ opacity: i === current ? 1 : 0 }}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>

          {/* Overlay degradado para contraste WCAG */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(to right, rgba(46,16,101,0.82) 0%, rgba(46,16,101,0.55) 35%, rgba(126,34,206,0.25) 65%, rgba(0,0,0,0.05) 100%),
                linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)
              `,
            }}
            aria-hidden
          />

          {/* Contenido del slide actual */}
          <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-8 md:px-16">
            {/* Badge */}
            <span
              className="inline-block mb-3 sm:mb-4 self-start rounded-full px-3 py-1 text-[11px] sm:text-xs font-semibold shadow-md backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#FFF', border: '1px solid rgba(236,72,153,0.5)' }}
            >
              ✨ Repostería Artesanal
            </span>
            <h1
              className="text-white font-bold text-2xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight max-w-2xl"
              style={{ textShadow: '0 2px 10px rgba(46,16,101,0.6)', fontFamily: 'Georgia, serif' }}
            >
              {renderHighlighted(slide.title)}
            </h1>
            <p
              className="text-white text-sm sm:text-lg md:text-xl mt-3 md:mt-4 max-w-xl"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
            >
              {slide.subtitle}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6 md:mt-8">
              <Button
                size="lg"
                className="text-white font-semibold transition-transform hover:scale-105 h-11 sm:h-12 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                  boxShadow: '0 8px 24px -6px rgba(236,72,153,0.5)',
                  border: 'none',
                }}
                onClick={() => handleCta(slide)}
              >
                {slide.cta}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="hidden sm:inline-flex bg-white/15 backdrop-blur-sm border-white/50 text-white hover:bg-white/25 hover:text-white transition-transform hover:scale-105 h-11 sm:h-12 rounded-full"
                onClick={() => {
                  const el = document.getElementById('como-funciona');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                📦 Cómo funciona
              </Button>
            </div>
          </div>

          {/* Flechas de navegación (desktop) */}
          {total > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center rounded-full bg-white/25 backdrop-blur-sm hover:bg-white/40 text-white transition-all"
                style={{ width: '44px', height: '44px', border: '1px solid rgba(255,255,255,0.3)' }}
                aria-label="Slide anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center rounded-full bg-white/25 backdrop-blur-sm hover:bg-white/40 text-white transition-all"
                style={{ width: '44px', height: '44px', border: '1px solid rgba(255,255,255,0.3)' }}
                aria-label="Slide siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Indicadores (dots) */}
          {total > 1 && (
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {finalSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === current ? '28px' : '10px',
                    height: '10px',
                    background: i === current ? '#EC4899' : 'rgba(255,255,255,0.6)',
                    boxShadow: i === current ? '0 0 8px rgba(236,72,153,0.6)' : 'none',
                  }}
                  aria-label={`Ir al slide ${i + 1}`}
                  aria-current={i === current}
                />
              ))}
            </div>
          )}

          {/* Contador de slides */}
          {total > 1 && (
            <div className="absolute top-3 right-3 z-20 rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              style={{ background: 'rgba(46,16,101,0.5)', border: '1px solid rgba(255,255,255,0.2)' }}>
              {current + 1} / {total}
            </div>
          )}

          {/* Badges flotantes de confianza (desktop) */}
          <div className="hidden md:flex absolute bottom-4 right-4 lg:right-6 z-20 flex-col gap-2 items-end pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur-md shadow-lg pointer-events-auto"
              style={{ background: 'rgba(46,16,101,0.55)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: '#FBBF24', fontSize: '11px' }}>★</span>
                ))}
              </div>
              <span>4.9 valoración</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur-md shadow-lg pointer-events-auto"
              style={{ background: 'rgba(126,34,206,0.55)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span style={{ fontSize: '12px' }}>🎉</span>
              <span>500+ pedidos felices</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur-md shadow-lg pointer-events-auto"
              style={{ background: 'rgba(236,72,153,0.55)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span style={{ fontSize: '12px' }}>🚚</span>
              <span>Entrega en Ciego de Ávila</span>
            </div>
          </div>

          {/* Trust badges compactos (mobile) */}
          <div className="md:hidden absolute bottom-2 right-2 z-20 flex gap-1.5 pointer-events-none">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white backdrop-blur-md"
              style={{ background: 'rgba(46,16,101,0.55)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span style={{ color: '#FBBF24' }}>★</span>
              <span>4.9</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white backdrop-blur-md"
              style={{ background: 'rgba(236,72,153,0.55)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span>🎉</span>
              <span>500+</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SECCIÓN 2: BENEFICIOS (banda de confianza) ────────────────────────────

export function BenefitsSection() {
  const config = useSiteConfig();
  const benefits = (() => {
    if (!config) return FALLBACK_BENEFITS;
    try {
      const p = JSON.parse(config.homeBenefits || '[]');
      if (!Array.isArray(p) || p.length === 0) return FALLBACK_BENEFITS;
      // Filtrar solo los beneficios visibles (visible !== false).
      return p.filter((b: { visible?: boolean }) => b.visible !== false);
    } catch { return FALLBACK_BENEFITS; }
  })();

  return (
    <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-4 md:py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {benefits.map((b: { icon: string; title: string; desc: string; color: string; bg: string }, i: number) => {
          const Icon = ICON_MAP[b.icon] || ShieldCheck;
          return (
            <div
              key={i}
              className={`${b.bg} rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 flex items-center gap-2 sm:gap-3 border border-gray-100 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${b.color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm md:text-base text-gray-900 leading-tight">{b.title}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-snug hidden sm:block">{b.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── SECCIÓN: CARRUSEL DE OFERTAS DESTACADAS ──────────────────────────────

export function OffersSection() {
  // El OffersCarousel tiene su propio toggle interno (offersCarousel.enabled),
  // pero esta sección solo se renderiza si el admin la activó en el
  // SectionOrderEditor. El HomeView ya filtra las secciones desactivadas,
  // así que si llegamos aquí, la sección está activa.
  return <OffersCarousel />;
}

// ─── SECCIÓN: CATÁLOGO POR CATEGORÍAS (carruseles) ───────────────────────

export function CatalogSection() {
  return (
    <div id="catalogo-categorias" className="scroll-mt-20">
      <HomeCatalogByCategories />
    </div>
  );
}

// ─── SECCIÓN: CATÁLOGO VENTA INMEDIATA ─────────────────────────────────────

export function ImmediateSaleSection() {
  return (
    <section id="venta-inmediata" className="scroll-mt-20 py-12 md:py-16" style={{ background: '#FFFFFF' }}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#FCE7F3', color: '#BE185D' }}>
            🛒 Venta Directa
          </span>
          <h2 className="font-bold" style={{ fontSize: '28px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
            Catálogo de Productos
          </h2>
          <p className="mt-2" style={{ fontSize: '15px', color: '#6B7280' }}>
            Listo para llevar. Pídelo hoy y lo recibes fresco en Ciego de Ávila.
          </p>
        </div>
      </div>
      <HomeCatalogByCategories />
    </section>
  );
}

// ─── SECCIÓN: CATÁLOGO PARA RESERVAS ───────────────────────────────────────

export function ReservationCatalogSection() {
  return (
    <section id="catalogo-reservas" className="scroll-mt-20 py-12 md:py-16" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FDF2F8 100%)' }}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
            📅 Reserva con Anticipación
          </span>
          <h2 className="font-bold" style={{ fontSize: '28px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
            Tartas y Combos para Eventos
          </h2>
          <p className="mt-2 max-w-2xl mx-auto" style={{ fontSize: '15px', color: '#6B7280' }}>
            ¿Tienes un evento especial? Reserva con 48h de anticipación y personaliza tu pedido. Diseños únicos para cumpleaños, 15 años, bodas y más.
          </p>
        </div>
        <HomeCatalogByCategories />
      </div>
    </section>
  );
}

// ─── SECCIÓN: SERVICIOS PARA EVENTOS ───────────────────────────────────────

export function ServicesHomeSection() {
  return <ServicesSection />;
}

// ─── SECCIÓN: PROMOCIONES ──────────────────────────────────────────────────

export function PromotionsHomeSection() {
  return <PromotionsSection />;
}

// ─── SECCIÓN: GALERÍA ──────────────────────────────────────────────────────

export function GalleryHomeSection() {
  return <GallerySection />;
}

// ─── SECCIÓN: CÓMO FUNCIONA ──────────────────────────────────────────────

export function HowItWorksSection() {
  const config = useSiteConfig();

  // Cargar pasos desde la config guardada. Si está vacía o inválida,
  // usar los defaults. Filtrar solo los pasos visibles (visible !== false).
  const steps = (() => {
    if (!config?.howItWorksSteps || !config.howItWorksSteps.trim()) {
      return DEFAULT_HOW_IT_WORKS_STEPS;
    }
    try {
      const parsed = JSON.parse(config.howItWorksSteps) as Array<{ icon: string; title: string; desc: string; visible?: boolean }>;
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_HOW_IT_WORKS_STEPS;
      const filtered = parsed.filter((s) => s && s.visible !== false);
      return filtered.length > 0 ? filtered : DEFAULT_HOW_IT_WORKS_STEPS;
    } catch {
      return DEFAULT_HOW_IT_WORKS_STEPS;
    }
  })();

  return (
    <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-8 md:py-12">
      <div id="como-funciona" className="scroll-mt-20">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900">Comprar es muy fácil</h2>
          <p className="text-gray-500 mt-2 text-sm md:text-base">En solo {steps.length} pasos tu familia recibe lo que necesita</p>
        </div>
        <div className={`grid gap-3 md:gap-4 ${steps.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
          {steps.map((step, i) => {
            const Icon = HOW_IT_WORKS_ICON_MAP[step.icon] || Package;
            return (
              <div key={i} className="text-center group">
                <div className="relative inline-flex">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-brand-light flex items-center justify-center shadow-sm group-hover:shadow-card group-hover:scale-105 transition-all duration-200">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 md:h-9 md:w-9 text-brand-dark" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand text-white text-xs sm:text-sm font-bold flex items-center justify-center shadow-md">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-xs sm:text-sm md:text-base text-gray-900 mt-3 md:mt-4">{step.title}</h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 mt-1 leading-snug max-w-[180px] mx-auto">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── SECCIÓN 5: HORARIO Y ENTREGAS ─────────────────────────────────────────

export function ScheduleSection() {
  const config = useSiteConfig();
  const cards: HorarioCard[] = (() => {
    if (!config) return [];
    try {
      const parsed = JSON.parse(config.horarioCards || '[]') as HorarioCard[];
      // Filtrar solo las tarjetas visibles (visible !== false).
      return parsed.filter((c) => c.visible !== false);
    } catch { return []; }
  })();

  if (cards.length === 0) return null;

  return (
    <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-8 md:py-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl py-6 md:py-12 border border-gray-200">
        <div className="relative max-w-[1600px] mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-light text-brand-dark px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase mb-3 md:mb-4">
            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
            Horario y Entregas
          </div>
          <h2 className="text-lg sm:text-xl md:text-4xl font-bold mb-2 md:mb-3 leading-tight text-gray-900">
            {config?.horarioSectionTitle || 'Pide cuando quieras, recíbelo en casa'}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6 md:mb-8 text-sm md:text-base">
            {config?.horarioSectionDesc || 'Tres cosas que debes saber sobre cómo trabajamos para que tu compra llegue siempre a tiempo.'}
          </p>
          <div className="grid sm:grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto">
            {cards.map((card, idx) => {
              const colorInfo = CARD_COLORS[card.color] || CARD_COLORS.amber;
              return (
                <div
                  key={idx}
                  className={`${colorInfo.bg} rounded-xl sm:rounded-2xl p-4 md:p-6 border ${colorInfo.border} hover:shadow-card hover:-translate-y-1 transition-all duration-200`}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 mx-auto ${colorInfo.iconBg} rounded-2xl flex items-center justify-center mb-3`}>
                    <span className="text-2xl md:text-3xl" aria-hidden>{card.icon}</span>
                  </div>
                  <h3 className="font-bold text-base md:text-lg leading-tight text-gray-900">{card.title}</h3>
                  <p className="text-xs md:text-sm text-gray-600 mt-1.5 leading-snug">
                    {renderDescription(card.description)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SECCIÓN: HORARIO DETALLADO POR DÍAS ──────────────────────────────────

const DAYS_OF_WEEK = [
  { key: 'scheduleLunes', label: 'Lunes', short: 'Lun' },
  { key: 'scheduleMartes', label: 'Martes', short: 'Mar' },
  { key: 'scheduleMiercoles', label: 'Miércoles', short: 'Mié' },
  { key: 'scheduleJueves', label: 'Jueves', short: 'Jue' },
  { key: 'scheduleViernes', label: 'Viernes', short: 'Vie' },
  { key: 'scheduleSabado', label: 'Sábado', short: 'Sáb' },
  { key: 'scheduleDomingo', label: 'Domingo', short: 'Dom' },
] as const;

export function ScheduleDetailedSection() {
  const config = useSiteConfig();

  // El horario viene en SiteConfig como scheduleLunes, scheduleMartes, etc.
  // Cada campo es un string tipo "15:00 - 18:00" o "Cerrado".
  const scheduleData = DAYS_OF_WEEK.map((day) => {
    const value = (config as Record<string, string> | null)?.[day.key] || '';
    const isClosed = !value || value.toLowerCase() === 'cerrado';
    return { ...day, value, isClosed };
  });

  // Día actual para resaltarlo.
  const today = new Date().getDay(); // 0=Domingo, 1=Lunes, ...
  const todayIndex = today === 0 ? 6 : today - 1; // Mapear a nuestro array (Lunes=0).

  // Determinar si la tienda está abierta AHORA usando la zona horaria de Cuba.
  // El horario puede tener varios turnos: "09:00 - 12:00, 15:00 - 18:00".
  const isOpenNow = (() => {
    if (!config) return false;
    const todayValue = scheduleData[todayIndex]?.value || '';
    if (!todayValue || todayValue.toLowerCase() === 'cerrado') return false;
    // Hora actual en zona horaria America/Havana (Cuba).
    const nowCuba = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Havana' })
    );
    const nowMinutes = nowCuba.getHours() * 60 + nowCuba.getMinutes();
    // Procesar cada turno (separado por coma).
    const shifts = todayValue.split(',').map((s) => s.trim()).filter(Boolean);
    for (const shift of shifts) {
      const match = shift.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
      if (!match) continue;
      const startH = parseInt(match[1], 10);
      const startM = parseInt(match[2], 10);
      const endH = parseInt(match[3], 10);
      const endM = parseInt(match[4], 10);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      if (nowMinutes >= startMin && nowMinutes < endMin) return true;
    }
    return false;
  })();

  return (
    <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-8 md:py-12">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Horario de Atención</h2>
        <p className="text-sm text-gray-500 mt-1">Estamos disponibles para atenderte en los siguientes horarios</p>
        {config && (
          <span
            className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
              isOpenNow
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isOpenNow ? 'Abierto ahora' : 'Cerrado ahora'}
          </span>
        )}
      </div>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {scheduleData.map((day, i) => (
            <div
              key={day.key}
              className={`flex items-center justify-between px-4 py-3 ${
                i === todayIndex ? 'bg-brand-light/30' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              } ${i < scheduleData.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{day.label}</span>
                {i === todayIndex && (
                  <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-medium">
                    Hoy
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {day.isClosed ? (
                  <span className="text-sm text-red-500 font-medium">Cerrado</span>
                ) : (
                  <span className="text-sm text-gray-700 font-mono">{day.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SECCIÓN 6: BANNER PROMOCIONAL (Entrega Prioritaria) ──────────────────

export function PromoBannerSection() {
  const config = useSiteConfig();
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  // Textos editables desde el admin (con defaults si están vacíos)
  const title = config?.promoBannerTitle || '¿Quieres una tarta personalizada?';
  const subtitle = config?.promoBannerSubtitle || 'Diseños únicos para cumpleaños, bodas y eventos especiales. Coordinamos cada detalle contigo.';
  const buttonText = config?.promoBannerButtonText || 'Ver opciones de entrega';
  return (
    <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-6 md:py-10">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-brand-dark p-5 sm:p-6 md:p-10 shadow-card">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden
        />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{title}</h2>
            <p className="text-brand-light mt-2 text-sm md:text-base">
              {subtitle}
            </p>
          </div>
          <Button
            size="lg"
            className="bg-white text-brand-dark hover:bg-brand-light shadow-lg shrink-0 transition-transform hover:scale-105 h-11 sm:h-12"
            onClick={() => setPriorityModalOpen(true)}
          >
            <Zap className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {buttonText}
          </Button>
        </div>
      </div>
      <PriorityDeliveryModal open={priorityModalOpen} onOpenChange={setPriorityModalOpen} />
    </section>
  );
}

// ─── SECCIÓN 7a: ESTADÍSTICAS (solo números) ──────────────────────────────
// Sección independiente controlada por el toggle `socialStats`.
// Antes estaba combinada con testimonios bajo el ID `socialProof`, pero eso
// impedía activar/desactivar cada parte por separado. Ahora cada componente
// tiene su propio ID en HOME_SECTIONS.

export function SocialStatsSection() {
  const config = useSiteConfig();
  const stats = (() => {
    if (!config) return FALLBACK_STATS;
    try {
      const p = JSON.parse(config.socialStats || '[]');
      // Filtrar visibles (visible !== false), igual que en BenefitsSection.
      const visible = Array.isArray(p) ? p.filter((s: { visible?: boolean }) => s.visible !== false) : [];
      return visible.length > 0 ? visible : FALLBACK_STATS;
    } catch { return FALLBACK_STATS; }
  })();

  if (stats.length === 0) return null;

  return (
    <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-6 md:py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {stats.map((stat: { value: string; label: string }, i: number) => (
          <div key={i} className="text-center bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-gray-100">
            <p className="text-xl sm:text-2xl md:text-4xl font-bold text-brand-dark">{stat.value}</p>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── SECCIÓN 7b: LEGACY socialProof — alias de SocialStatsSection ─────────
// Mantenido por retrocompatibilidad con plantillas / bases de datos antiguas
// donde el ID `socialProof` ya estaba guardado.
//
// NOTA: La sección de Testimonios del admin (SiteConfig.testimonials) NO
// es una sección independiente del home — la renderiza `StoreReviewsSection`
// (junto con las reseñas reales del negocio) bajo el ID `storeReviews`.
// Por eso NO existe `TestimonialsSection` como sección separada: would
// duplicar el contenido de `storeReviews`.

export function SocialProofSection() {
  return <SocialStatsSection />;
}

// ─── MAPA DE SECCIONES DISPONIBLES ─────────────────────────────────────────

export type HomeSectionId =
  | 'hero'
  | 'benefits'
  | 'offers'
  | 'catalog'
  | 'schedule'
  | 'scheduleDetailed'
  | 'deliveryZones'
  | 'storeReviews'   // Reseñas + testimonios (unificados)
  | 'promoBanner'
  | 'socialStats'    // Estadísticas (números) — toggle independiente
  | 'socialProof'    // Legacy: alias de socialStats (retrocompat)
  | 'testimonials'   // Legacy: alias de storeReviews (retrocompat — v48 lo creó como sección separada, v49 lo une a storeReviews)
  | 'buyFrom'
  | 'immediateSale'
  | 'reservationCatalog'
  | 'services'
  | 'promotions'
  | 'gallery'
  | 'topSelling'     // Carrusel "Más Vendidos" (productos destacados)
  | 'quickContact'  // Tarjeta "Contacto Rápido" (WhatsApp, horario, ubicación)
  | 'featuredCategories' // Grid visual de categorías con conteo de productos
  | 'specialDate';  // Countdown timer a próxima fecha especial (San Valentín, etc.)

export const HOME_SECTIONS: { id: HomeSectionId; label: string; icon: string }[] = [
  { id: 'hero', label: 'Hero (banner rotativo)', icon: '🖼️' },
  { id: 'topSelling', label: 'Más Vendidos (carrusel destacados)', icon: '⭐' },
  { id: 'featuredCategories', label: 'Categorías Destacadas (grid visual)', icon: '🗂️' },
  { id: 'specialDate', label: 'Próxima Fecha Especial (countdown)', icon: '🎉' },
  { id: 'buyFrom', label: 'Comprar desde (países)', icon: '🌍' },
  { id: 'benefits', label: 'Beneficios (banda de confianza)', icon: '✅' },
  { id: 'offers', label: 'Carrusel de Ofertas Destacadas', icon: '🔥' },
  { id: 'catalog', label: 'Catálogo por categorías', icon: '🛒' },
  { id: 'immediateSale', label: 'Catálogo Venta Directa', icon: '⚡' },
  { id: 'reservationCatalog', label: 'Catálogo para Reservas', icon: '📅' },
  { id: 'services', label: 'Servicios para Eventos', icon: '🎨' },
  { id: 'promotions', label: 'Promociones por fechas', icon: '💝' },
  { id: 'gallery', label: 'Galería de eventos', icon: '🖼️' },
  { id: 'schedule', label: 'Horario y Entregas (resumen)', icon: '🕐' },
  { id: 'scheduleDetailed', label: 'Horario detallado por días', icon: '📅' },
  { id: 'deliveryZones', label: 'Zonas de Entrega (precios)', icon: '🚚' },
  { id: 'storeReviews', label: 'Reseñas y Testimonios', icon: '💬' },
  { id: 'quickContact', label: 'Contacto Rápido (WhatsApp+Teléfono)', icon: '💬' },
  { id: 'promoBanner', label: 'Banner entrega prioritaria', icon: '⚡' },
  { id: 'socialStats', label: 'Estadísticas (números)', icon: '📊' },
];

// ─── SECCIÓN: Comprar desde (países habilitados) ──────────────────────────
function BuyFromSection() {
  const config = useSiteConfig();
  const countries = (config?.activeCountries || 'US,CU').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (countries.length === 0) return null;
  return (
    <section className="max-w-[1600px] mx-auto px-3 sm:px-4 py-4 md:py-6">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <span className="text-sm text-gray-500 font-medium">Compra desde:</span>
        {countries.map(code => (
          <CountryFlag key={code} code={code} showName className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-sm" />
        ))}
      </div>
    </section>
  );
}

// ─── SECCIÓN: TOP SELLING (productos destacados) ─────────────────────────
// Wrapper que re-exporta el TopSellingCarousel para integrarse en el
// sistema de secciones del home (HOME_SECTION_COMPONENTS).
function TopSellingSection() {
  // Lazy import para evitar cargar el componente si la sección está desactivada
  // y para mantener el bundle inicial más liviano.
  // Nota: en el HomeView real, VitrinaHome gestiona esta sección internamente,
  // pero la registramos aquí también para que aparezca en el SectionOrderEditor.
  return null;
}

// ─── SECCIÓN: CONTACTO RÁPIDO ─────────────────────────────────────────────
function QuickContactSection() {
  // Igual que TopSellingSection, VitrinaHome gestiona internamente esta
  // sección. La registramos aquí solo para que aparezca en el editor.
  return null;
}

// ─── SECCIÓN: CATEGORÍAS DESTACADAS (grid visual) ─────────────────────────
// VitrinaHome gestiona internamente esta sección. La registramos aquí solo
// para que aparezca en el SectionOrderEditor del admin.
function FeaturedCategoriesSection() {
  return null;
}

// ─── SECCIÓN: PRÓXIMA FECHA ESPECIAL (countdown) ──────────────────────────
// VitrinaHome gestiona internamente esta sección. La registramos aquí solo
// para que aparezca en el SectionOrderEditor del admin.
function SpecialDateSection() {
  return null;
}

export const HOME_SECTION_COMPONENTS: Record<HomeSectionId, React.FC> = {
  hero: HeroSection,
  topSelling: TopSellingSection,
  featuredCategories: FeaturedCategoriesSection,
  specialDate: SpecialDateSection,
  buyFrom: BuyFromSection,
  benefits: BenefitsSection,
  offers: OffersSection,
  catalog: CatalogSection,
  immediateSale: ImmediateSaleSection,
  reservationCatalog: ReservationCatalogSection,
  services: ServicesHomeSection,
  promotions: PromotionsHomeSection,
  gallery: GalleryHomeSection,
  schedule: ScheduleSection,
  scheduleDetailed: ScheduleDetailedSection,
  deliveryZones: DeliveryZonesSection,
  storeReviews: StoreReviewsSection,
  quickContact: QuickContactSection,
  promoBanner: PromoBannerSection,
  socialStats: SocialStatsSection,
  // Legacy: si una base antigua tiene `socialProof` en el orden, lo
  // renderizamos como Estadísticas para no romper la tienda.
  socialProof: SocialProofSection,
  // Legacy: `testimonials` (v48) se redirige a `storeReviews` porque
  // los testimonios son parte de esa sección (reseñas + testimonios
  // unificados). Evita duplicar contenido.
  testimonials: StoreReviewsSection,
};

export const DEFAULT_HOME_SECTIONS_ORDER: HomeSectionId[] = [
  'hero',
  'topSelling',          // ⭐ Carrusel "Más Vendidos" (justo después del hero)
  'featuredCategories',  // 🗂️ Grid visual de categorías
  'specialDate',         // 🎉 Countdown a próxima fecha especial
  'buyFrom',
  'benefits',
  'offers',
  'immediateSale',
  'reservationCatalog',
  'services',
  'promotions',
  'gallery',
  'schedule',
  'deliveryZones',
  'storeReviews',
  'quickContact',         // 💬 Contacto Rápido (antes del banner final)
  'promoBanner',
  'socialStats',
];
