'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Quote, CalendarHeart, Sparkles } from 'lucide-react';
import { useAppStore, type AppView } from '@/store/app-store';
import { HeroSection } from '@/components/ecommerce/HomeSections';

// Lazy-loaded home sections — estos componentes son pesados (carruseles,
// countdowns, cards con glassmorphism) y solo se necesitan cuando el usuario
// hace scroll. Al lazy-loadearlos, el bundle inicial del home es más liviano
// y el TTI mejora. Todos hacen SSR (sin `ssr: false`) para que el contenido
// aparezca inmediatamente y para SEO.
const TopSellingCarousel = dynamic(() => import('@/components/ecommerce/TopSellingCarousel').then(m => ({ default: m.TopSellingCarousel })));
const QuickContactCard = dynamic(() => import('@/components/ecommerce/QuickContactCard').then(m => ({ default: m.QuickContactCard })));
const FeaturedCategories = dynamic(() => import('@/components/ecommerce/FeaturedCategories').then(m => ({ default: m.FeaturedCategories })));
const SpecialDateCountdown = dynamic(() => import('@/components/ecommerce/SpecialDateCountdown').then(m => ({ default: m.SpecialDateCountdown })));

interface NavSection {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
}

interface Stat {
  value: string;
  label: string;
}

interface Testimonial {
  name: string;
  location: string;
  text: string;
  rating: number;
}

interface CategoryCount {
  id: string;
  count: number;
}

interface ProductCount {
  immediate: number;
  reservations: number;
  services: number;
  promotions: number;
  gallery: number;
}

const SECTION_DATA: Record<string, { title: string; desc: string; image: string; gradient: string; cta: string }> = {
  immediate: {
    title: 'Venta Directa',
    desc: 'Dulces finos y buffet listos para llevar. Empanadillas, cupcakes, galleticas, brownies, tequeños y mucho más. Pídelo hoy y recíbelo fresco en Ciego de Ávila.',
    image: '/card-venta-directa.webp',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
    cta: 'Ver catálogo',
  },
  reservations: {
    title: 'Reservas de Tartas y Pasteles',
    desc: 'Tortas personalizadas, pasteles de dos y tres pisos, cakes de bandeja y sueños sorpresa. Diseños únicos para cumpleaños, 15 años, bodas y eventos especiales.',
    image: '/card-reservas.webp',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    cta: 'Reservar tarta',
  },
  services: {
    title: 'Servicios para Eventos',
    desc: 'Decoración completa, muñecos sorpresa, cañón de confeti, máquina de burbujas, globos, sublimación de pullovers, jarras personalizadas y gigantografías.',
    image: '/card-servicios.webp',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
    cta: 'Ver servicios',
  },
  promotions: {
    title: 'Promociones Especiales',
    desc: 'Ofertas por fechas importantes: Día de las Madres, Día de los Padres, San Valentín, Día de la Mujer y Fin de Año. Combos especiales con descuento.',
    image: '/card-promociones.webp',
    gradient: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',
    cta: 'Ver promociones',
  },
  gallery: {
    title: 'Galería de Eventos',
    desc: 'Inspírate con nuestros trabajos anteriores: cumpleaños infantiles, 15 años, cumpleaños de adultos y bodas. Cada evento es único, como el tuyo.',
    image: '/card-galeria.webp',
    gradient: 'linear-gradient(135deg, #C084FC 0%, #A855F7 100%)',
    cta: 'Ver galería',
  },
};

const FALLBACK_STATS: Stat[] = [
  { value: '500+', label: 'Pedidos felices' },
  { value: '4.9★', label: 'Valoración media' },
  { value: '24h', label: 'Anticipación de pedidos' },
  { value: '100%', label: 'Horneado fresco' },
];

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  { name: 'Yanet Suárez', location: 'Ciego de Ávila', text: 'La tarta de chocolate de mi cumpleaños fue espectacular. Súper húmeda y con un sabor increíble. Todos quedaron encantados.', rating: 5 },
  { name: 'Roberto Méndez', location: 'Ciego de Ávila', text: 'Pedí los cupcakes surtidos para un baby shower y fueron un éxito. Hermosa presentación y deliciosos.', rating: 5 },
  { name: 'Lianet Pacheco', location: 'Majagua', text: 'El combo de cumpleaños salvó mi evento. Tarta, cupcakes y galletas, todo coordinado y a tiempo. ¡Recomendadísimo!', rating: 5 },
];

export function VitrinaHome() {
  const { setView } = useAppStore();
  const [navSections, setNavSections] = useState<NavSection[]>([]);
  const [stats, setStats] = useState<Stat[]>(FALLBACK_STATS);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS);
  const [sectionsEnabled, setSectionsEnabled] = useState<Record<string, boolean>>({});
  const [productCounts, setProductCounts] = useState<ProductCount>({
    immediate: 0,
    reservations: 0,
    services: 0,
    promotions: 0,
    gallery: 0,
  });
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        try {
          const ns = JSON.parse(data.navSections || '[]');
          if (Array.isArray(ns) && ns.length > 0) setNavSections(ns.filter((s: NavSection) => s.visible));
        } catch {}
        try {
          const st = JSON.parse(data.socialStats || '[]');
          if (Array.isArray(st) && st.length > 0) setStats(st);
        } catch {}
        try {
          const ts = JSON.parse(data.testimonials || '[]');
          if (Array.isArray(ts) && ts.length > 0) setTestimonials(ts);
        } catch {}
        try {
          const se = JSON.parse(data.homeSectionsEnabled || '{}');
          if (typeof se === 'object' && se !== null) setSectionsEnabled(se);
        } catch {}
      })
      .catch(() => {});
  }, []);

  // Cargar conteos de productos por catálogo y por categoría (para badges informativos en las cards)
  useEffect(() => {
    Promise.all([
      fetch('/api/products?catalog=immediate&take=200').then((r) => r.json().catch(() => [])),
      fetch('/api/products?catalog=reservation&take=200').then((r) => r.json().catch(() => [])),
      fetch('/api/categories').then((r) => r.json().catch(() => [])),
    ])
      .then(([immediateProds, reservationProds, cats]) => {
        const imm = Array.isArray(immediateProds) ? immediateProds.length : 0;
        const res = Array.isArray(reservationProds) ? reservationProds.length : 0;
        setProductCounts({
          immediate: imm,
          reservations: res,
          services: 0, // Los servicios se gestionan aparte; aquí solo como referencia
          promotions: 0,
          gallery: 0,
        });
        if (Array.isArray(cats)) {
          setCategoryCounts(cats.map((c: { id: string; _count?: { products: number } }) => ({ id: c.id, count: c._count?.products ?? 0 })));
        }
      })
      .catch(() => {});
  }, []);

  // Verificar si una sección del home está habilitada
  const isSectionEnabled = (id: string): boolean => sectionsEnabled[id] !== false;

  const sections = navSections.length > 0 ? navSections : [
    { id: 'immediate', label: 'Venta Directa', icon: '🛒', visible: true },
    { id: 'reservations', label: 'Reservas', icon: '📅', visible: true },
    { id: 'services', label: 'Servicios', icon: '🎨', visible: true },
    { id: 'promotions', label: 'Promociones', icon: '💝', visible: true },
    { id: 'gallery', label: 'Galería', icon: '🖼️', visible: true },
  ];

  // Conteo a mostrar en cada card de sección (si está disponible).
  // Para 'immediate' y 'reservations' usamos los conteos reales; para los
  // demás, ocultamos el badge (no aplica).
  const getCountFor = (sectionId: string): number | null => {
    if (sectionId === 'immediate') return productCounts.immediate || null;
    if (sectionId === 'reservations') return productCounts.reservations || null;
    return null;
  };

  return (
    <div>
      {/* Hero rotativo */}
      {isSectionEnabled('hero') && <HeroSection />}

      {/* Más Vendidos — carrusel de productos destacados */}
      {isSectionEnabled('topSelling') && <TopSellingCarousel />}

      {/* Categorías Destacadas — grid visual de categorías con conteo de productos */}
      {isSectionEnabled('featuredCategories') && <FeaturedCategories />}

      {/* Próxima Fecha Especial — countdown timer a Día de las Madres, San Valentín, etc. */}
      {isSectionEnabled('specialDate') && <SpecialDateCountdown />}

      {/* Secciones — full-width cards con imágenes hiperrealistas */}
      {isSectionEnabled('catalog') && (
      <section className="py-12 md:py-16" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF5FF 100%)' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
              <Sparkles className="h-3.5 w-3.5" /> Bienvenida a Dulce Encanto
            </span>
            <h2 className="font-bold" style={{ fontSize: '32px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
              Endulzamos tus momentos especiales
            </h2>
            <p className="mt-2 max-w-2xl mx-auto" style={{ fontSize: '15px', color: '#6B7280' }}>
              Repostería artesanal, tartas personalizadas y servicios para eventos en Ciego de Ávila. Explora nuestras secciones y encuentra lo que necesitas.
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((sec, i) => {
              const info = SECTION_DATA[sec.id];
              if (!info) return null;
              const isReversed = i % 2 === 1;
              return (
                <motion.button
                  key={sec.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                  onClick={() => setView(sec.id as AppView)}
                  className="group block w-full text-left rounded-3xl overflow-hidden shadow-xl"
                  style={{ background: '#FFF', border: '1px solid #FBCFE8' }}
                >
                  <div className={`grid grid-cols-1 md:grid-cols-2 ${isReversed ? 'md:[direction:rtl]' : ''}`}>
                    {/* Image */}
                    <div className="relative h-64 md:h-80 overflow-hidden [direction:ltr]">
                      <img
                        src={info.image}
                        alt={info.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0" style={{ background: `linear-gradient(${isReversed ? 'to left' : 'to right'}, ${info.gradient}40 0%, transparent 60%)` }} />
                      <div className="absolute top-4 left-4 [direction:ltr]">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-2xl shadow-lg" style={{ background: info.gradient }}>
                          {sec.icon}
                        </span>
                      </div>
                      {/* Badge de cantidad de productos (solo immediate/reservations) */}
                      {(() => {
                        const count = getCountFor(sec.id);
                        if (count === null) return null;
                        return (
                          <div className="absolute top-4 right-4 [direction:ltr]">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md backdrop-blur-sm" style={{ background: 'rgba(46,16,101,0.55)', border: '1px solid rgba(255,255,255,0.25)' }}>
                              {count} {count === 1 ? 'producto' : 'productos'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Content */}
                    <div className="p-6 md:p-10 flex flex-col justify-center [direction:ltr]">
                      <h3 className="font-bold mb-3" style={{ fontSize: '26px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                        {info.title}
                      </h3>
                      <p className="text-sm leading-relaxed mb-5" style={{ color: '#6B7280' }}>
                        {info.desc}
                      </p>
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white self-start transition-transform group-hover:scale-105" style={{ background: info.gradient }}>
                        {info.cta} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* CTA Reservar Evento */}
      {isSectionEnabled('promoBanner') && (
      <section className="py-10" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <CalendarHeart className="h-12 w-12 mx-auto mb-3" style={{ color: '#F9A8D4' }} />
            <h2 className="font-bold text-white mb-2" style={{ fontSize: '28px', fontFamily: 'Georgia, serif' }}>
              ¿Planeas un evento especial?
            </h2>
            <p className="text-sm mb-5 max-w-xl mx-auto" style={{ color: '#E9D5FF' }}>
              Reserva tu fecha y elige todo lo que necesitas: tartas, servicios y decoración. Te confirmamos por WhatsApp.
            </p>
            <button
              onClick={() => window.dispatchEvent(new Event('dulce-encanto:open-reservation'))}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 8px 20px -4px rgba(236,72,153,0.5)' }}
            >
              <CalendarHeart className="h-4 w-4" /> Reservar mi evento
            </button>
          </motion.div>
        </div>
      </section>
      )}

      {/* Contacto Rápido — WhatsApp + Teléfono + Horario */}
      {isSectionEnabled('quickContact') && <QuickContactCard />}

      {/* Estadísticas */}
      {isSectionEnabled('socialStats') && (
      <section className="py-10" style={{ background: '#FFFFFF' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="text-center"
              >
                <p className="font-bold" style={{ fontSize: '36px', fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-1 font-medium" style={{ color: '#6B7280' }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Reseñas */}
      {isSectionEnabled('storeReviews') && (
      <section className="py-12 md:py-16" style={{ background: 'linear-gradient(180deg, #FAF5FF 0%, #FFFFFF 100%)' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#FCE7F3', color: '#BE185D' }}>
              <Quote className="h-3.5 w-3.5" /> Lo que dicen nuestros clientes
            </span>
            <h2 className="font-bold" style={{ fontSize: '28px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
              Clientas felices, momentos dulces
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="rounded-2xl p-6"
                style={{ background: '#FFF', border: '1px solid #FBCFE8' }}
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4" style={{ fill: '#FBBF24', color: '#FBBF24' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#2E1065' }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#2E1065' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{t.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
