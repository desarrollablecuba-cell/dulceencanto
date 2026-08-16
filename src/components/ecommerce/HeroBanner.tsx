'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Truck, Globe, Heart, Package, CreditCard, CheckCircle2, Truck as TruckIcon, Send } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { CountryFlag, COUNTRY_INFO } from '@/components/ecommerce/CountryFlag';
import { PriorityDeliveryModal } from '@/components/ecommerce/PriorityDeliveryModal';

interface HorarioCard {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface SiteConfigData {
  horarioSectionTitle: string;
  horarioSectionDesc: string;
  horarioCards: string;
  cover: string;
  socialStats: string;
  testimonials: string;
  homeBenefits: string;
  activeCountries: string;
  heroTitle: string;
  heroSubtitle: string;
}

const CARD_COLORS: Record<string, { bg: string; iconBg: string; border: string }> = {
  blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', border: 'border-blue-100' },
  emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', border: 'border-emerald-100' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', border: 'border-purple-100' },
  amber: { bg: 'bg-brand-light', iconBg: 'bg-brand-light', border: 'border-brand-light' },
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

const BENEFITS = [
  { icon: ShieldCheck, title: 'Pago seguro', desc: 'Tus transacciones protegidas', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: Truck, title: 'Entrega garantizada', desc: 'Llegamos a tu puerta', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: Globe, title: 'Compra desde cualquier país', desc: 'Entregamos en Cuba', color: 'text-brand-dark', bg: 'bg-brand-light' },
  { icon: Heart, title: 'Atención personalizada', desc: 'Estamos para ayudarte', color: 'text-rose-600', bg: 'bg-rose-50' },
];

const STEPS = [
  { icon: Package, title: 'Elige tus dulces', desc: 'Explora nuestro catálogo de tartas, cupcakes y postres.' },
  { icon: Send, title: 'Haz tu pedido', desc: 'Completa el formulario con los datos de tu evento.' },
  { icon: CheckCircle2, title: 'Confirmamos tu diseño', desc: 'Validamos detalles, decoración y fecha de entrega.' },
  { icon: CreditCard, title: 'Realiza el pago', desc: 'Paga en efectivo o por transferencia (CUP).' },
  { icon: TruckIcon, title: 'Entregamos fresco', desc: 'Tu pedido llega el día del evento, recién horneado.' },
];

// Estos arrays ahora se cargan dinámicamente desde la API
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
  { icon: 'shield', title: 'Pago seguro', desc: 'Tus transacciones protegidas', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: 'truck', title: 'Entrega garantizada', desc: 'Llegamos a tu puerta', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: 'globe', title: 'Compra desde cualquier país', desc: 'Entregamos en Cuba', color: 'text-brand-dark', bg: 'bg-brand-light' },
  { icon: 'heart', title: 'Atención personalizada', desc: 'Estamos para ayudarte', color: 'text-rose-600', bg: 'bg-rose-50' },
];

const ICON_MAP: Record<string, typeof ShieldCheck> = {
  shield: ShieldCheck, truck: Truck, globe: Globe, heart: Heart,
};

export function HeroBanner() {
  const { setView } = useAppStore();
  const [config, setConfig] = useState<SiteConfigData | null>(null);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          horarioSectionTitle: data.horarioSectionTitle || 'Pide cuando quieras, recíbelo en casa',
          horarioSectionDesc: data.horarioSectionDesc || 'Tres cosas que debes saber sobre cómo trabajamos para que tu compra llegue siempre a tiempo.',
          horarioCards: data.horarioCards || '[]',
          cover: data.cover || '/products/cover-real.webp',
          socialStats: data.socialStats || '[]',
          testimonials: data.testimonials || '[]',
          homeBenefits: data.homeBenefits || '[]',
          activeCountries: data.activeCountries || 'US,CU',
          heroTitle: data.heroTitle || '',
          heroSubtitle: data.heroSubtitle || '',
        });
      })
      .catch(() => {});
  }, []);

  const stats = (() => {
    if (!config) return FALLBACK_STATS;
    try { const p = JSON.parse(config.socialStats || '[]'); return Array.isArray(p) && p.length > 0 ? p : FALLBACK_STATS; } catch { return FALLBACK_STATS; }
  })();

  const testimonials = (() => {
    if (!config) return FALLBACK_TESTIMONIALS;
    try { const p = JSON.parse(config.testimonials || '[]'); return Array.isArray(p) && p.length > 0 ? p : FALLBACK_TESTIMONIALS; } catch { return FALLBACK_TESTIMONIALS; }
  })();

  const benefits = (() => {
    if (!config) return FALLBACK_BENEFITS;
    try { const p = JSON.parse(config.homeBenefits || '[]'); return Array.isArray(p) && p.length > 0 ? p : FALLBACK_BENEFITS; } catch { return FALLBACK_BENEFITS; }
  })();

  const cards: HorarioCard[] = (() => {
    if (!config) return [];
    try { return JSON.parse(config.horarioCards || '[]') as HorarioCard[]; } catch { return []; }
  })();

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* ═══ 1. HERO BANNER ═══ */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl">
          <img
            src={config?.cover || '/products/hero-dessert-table.webp'}
            alt="Dulce Encanto — Repostería artesanal para tus momentos especiales"
            className="w-full h-[280px] sm:h-[400px] md:h-[500px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-16">
            <h1 className="text-white font-bold text-2xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight max-w-2xl drop-shadow-2xl">
              {(() => {
                const title = config?.heroTitle || 'Envía alimentos y productos a tu familia en **Ciego de Ávila**';
                const parts = title.split(/(\*\*[^*]+\*\*)/g);
                return parts.map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <span key={i} className="text-brand">{part.slice(2, -2)}</span>;
                  }
                  return <span key={i}>{part}</span>;
                });
              })()}
            </h1>
            <p className="text-white/90 text-sm sm:text-lg md:text-xl mt-3 md:mt-4 max-w-xl drop-shadow-lg">
              {config?.heroSubtitle || 'Compra desde cualquier país y nosotros nos encargamos de la entrega en Cuba.'}
            </p>
            <div className="flex flex-wrap gap-3 mt-5 md:mt-8">
              <Button
                size="lg"
                className="bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark text-white shadow-xl shadow-brand/30 transition-transform hover:scale-105"
                onClick={() => setView('catalog')}
              >
                🧁 Ver catálogo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/40 text-white hover:bg-white/20 hover:text-white transition-transform hover:scale-105"
                onClick={() => {
                  const el = document.getElementById('como-funciona');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                📦 Cómo funciona
              </Button>
            </div>
          </div>
        </div>

        {/* ═══ 2. BANDA DE CONFIANZA ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 md:mt-8">
          {benefits.map((b: { icon: string; title: string; desc: string; color: string; bg: string }, i: number) => {
            const Icon = ICON_MAP[b.icon] || ShieldCheck;
            return (
              <div
                key={i}
                className={`${b.bg} rounded-2xl p-4 md:p-5 flex items-center gap-3 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 ${b.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm md:text-base text-gray-900 leading-tight">{b.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug hidden sm:block">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ PAÍSES HABILITADOS ═══ */}
        {(() => {
          const countries = (config?.activeCountries || 'US,CU').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          if (countries.length === 0) return null;
          return (
            <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-2 md:gap-3">
              <span className="text-sm text-gray-500 font-medium">Compra desde:</span>
              {countries.map(code => (
                <CountryFlag key={code} code={code} showName className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-sm" />
              ))}
            </div>
          );
        })()}

        {/* ═══ 3. CÓMO FUNCIONA ═══ */}
        <div id="como-funciona" className="mt-12 md:mt-16 scroll-mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900">Hacer tu pedido es muy fácil</h2>
            <p className="text-gray-500 mt-2 text-sm md:text-base">En solo 5 pasos tienes tu tarta lista para tu evento</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="text-center group">
                  <div className="relative inline-flex">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-brand-light to-brand-light flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                      <Icon className="h-7 w-7 md:h-9 md:w-9 text-brand-dark" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center shadow-md">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm md:text-base text-gray-900 mt-4">{step.title}</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1 leading-snug max-w-[200px] mx-auto">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ 4. HORARIO Y ENTREGAS ═══ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl mt-12 md:mt-16 py-8 md:py-12 border border-gray-200">
          <div className="relative max-w-7xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-brand-light text-brand-dark px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
              <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
              Horario y Entregas
            </div>
            <h2 className="text-xl md:text-4xl font-bold mb-3 leading-tight text-gray-900">
              {config?.horarioSectionTitle || 'Pide cuando quieras, recíbelo en casa'}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8 text-sm md:text-base">
              {config?.horarioSectionDesc || 'Tres cosas que debes saber sobre cómo trabajamos para que tu compra llegue siempre a tiempo.'}
            </p>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {cards.map((card, idx) => {
                const colorInfo = CARD_COLORS[card.color] || CARD_COLORS.amber;
                return (
                  <div
                    key={idx}
                    className={`${colorInfo.bg} rounded-2xl p-6 border ${colorInfo.border} hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
                  >
                    <div className={`w-14 h-14 mx-auto ${colorInfo.iconBg} rounded-2xl flex items-center justify-center mb-3`}>
                      <span className="text-3xl" aria-hidden>{card.icon}</span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight text-gray-900">{card.title}</h3>
                    <p className="text-sm text-gray-600 mt-1.5 leading-snug">
                      {renderDescription(card.description)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ 5. BANNER PROMOCIONAL ═══ */}
        <div className="mt-12 md:mt-16">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-brand-dark p-6 md:p-10 shadow-xl">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
              aria-hidden
            />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-white">¿Quieres una tarta personalizada?</h2>
                <p className="text-brand-light mt-2 text-sm md:text-base">
                  Diseños únicos para cumpleaños, bodas y eventos especiales. Coordinamos cada detalle contigo.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-white text-brand-dark hover:bg-brand-light shadow-lg shrink-0 transition-transform hover:scale-105"
                onClick={() => setPriorityModalOpen(true)}
              >
                Ver opciones de entrega
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <PriorityDeliveryModal open={priorityModalOpen} onOpenChange={setPriorityModalOpen} />

        {/* ═══ 6. PRUEBA SOCIAL ═══ */}
        <div className="mt-12 md:mt-16">
          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {stats.map((stat: { value: string; label: string }, i: number) => (
              <div key={i} className="text-center bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <p className="text-2xl md:text-4xl font-bold text-brand-dark">{stat.value}</p>
                <p className="text-xs md:text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          {/* Testimonios */}
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t: { name: string; location: string; text: string; rating: number }, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <span key={j} className="text-brand text-lg">★</span>
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
