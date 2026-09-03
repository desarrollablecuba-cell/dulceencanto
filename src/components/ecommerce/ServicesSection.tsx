'use client';

import { useState, useEffect } from 'react';
import { Sparkles, CalendarHeart, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyStore } from '@/store/currency-store';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  image?: string;
  price: number;
  priceUsd: number;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  decoracion: 'Decoración',
  entretenimiento: 'Entretenimiento',
  personalizado: 'Personalizado',
  suenos_sorpresa: 'Sueños Sorpresa',
};

const CATEGORY_COLORS: Record<string, string> = {
  decoracion: '#A855F7',
  entretenimiento: '#EC4899',
  personalizado: '#F59E0B',
  suenos_sorpresa: '#8B5CF6',
};

export function ServicesSection({ onReserve }: { onReserve?: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  // Moneda global (sincronizada con el Header). Ya no hay toggle local.
  const currency = useCurrencyStore((s) => s.currency);
  const { toast } = useToast();

  const openReservation = () => {
    if (onReserve) onReserve();
    else window.dispatchEvent(new Event('dulce-encanto:open-reservation'));
  };

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setServices(data); })
      .catch(() => {});
  }, []);

  if (services.length === 0) return null;

  return (
    <section id="servicios" className="py-16 relative" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF5FF 100%)' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
            <Sparkles className="h-3.5 w-3.5" /> Servicios para Eventos
          </span>
          <h2 className="font-bold" style={{ fontSize: '32px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
            Hacemos realidad tu celebración
          </h2>
          <p className="mt-2 max-w-2xl mx-auto" style={{ fontSize: '15px', color: '#6B7280' }}>
            Decoración, entretenimiento y detalles personalizados con fotos reales de nuestro trabajo. Combina los servicios que necesites para un evento inolvidable.
          </p>

          {/* Indicador de moneda (solo informativo — el toggle global está en el Header) */}
          <div className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: '#FCE7F3', color: '#7E22CE', border: '1px solid #FBCFE8' }} aria-live="polite">
            {currency === 'CUP' ? '₱ CUP' : '$ USD (Zelle)'}
          </div>
        </div>

        {/* Grid de servicios — cards VERTICALES con imagen protagonista */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {services.map((s) => {
            const color = CATEGORY_COLORS[s.category] || '#A855F7';
            const price = currency === 'CUP' ? s.price : s.priceUsd;
            const symbol = currency === 'CUP' ? '₱' : '$';
            return (
              <div
                key={s.id}
                className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1.5"
                style={{
                  background: '#FFF',
                  border: '1px solid #FBCFE8',
                  boxShadow: '0 4px 14px -2px rgba(236,72,153,0.08)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 14px 32px -8px ${color}44`; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px -2px rgba(236,72,153,0.08)'; }}
              >
                {/* Imagen protagonista (vertical, ~65% de la card) */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{ aspectRatio: '3 / 4', background: `linear-gradient(160deg, ${color}26 0%, ${color}0D 100%)` }}
                >
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.image}
                      alt={`${s.name} — foto real de Dulce Encanto`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="transition-transform duration-300 group-hover:scale-110" style={{ fontSize: '64px', filter: 'drop-shadow(0 6px 14px rgba(46,16,101,0.22))' }}>
                        {s.icon}
                      </span>
                    </div>
                  )}
                  {/* Scrim inferior para legibilidad del badge */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(46,16,101,0.45) 100%)' }}
                    aria-hidden
                  />
                  {/* Badge de categoría sobre la imagen */}
                  <span
                    className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: 'rgba(46,16,101,0.78)', backdropFilter: 'blur(4px)' }}
                  >
                    {CATEGORY_LABELS[s.category] || s.category}
                  </span>
                  {/* Precio destacado sobre la imagen */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        Desde
                      </span>
                      <span className="font-bold text-white leading-tight drop-shadow-md" style={{ fontSize: '19px', fontFamily: 'Georgia, serif' }}>
                        {symbol}{price.toLocaleString('es-CU')}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        toast({ title: '✓ Servicio añadido', description: `${s.name} — lo incluirás en tu reserva de evento`, duration: 2500 });
                        openReservation();
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold text-white transition-all hover:scale-105 active:scale-95 shrink-0"
                      style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`, boxShadow: `0 4px 12px ${color}55` }}
                      aria-label={`Reservar ${s.name}`}
                    >
                      <CalendarHeart className="h-3.5 w-3.5" /> Reservar
                    </button>
                  </div>
                </div>

                {/* Contenido */}
                <div className="flex flex-col flex-1 p-3.5">
                  <h3 className="font-semibold leading-snug line-clamp-2" style={{ fontSize: '14px', color: '#2E1065', fontFamily: 'Georgia, serif', minHeight: '2.4em' }}>
                    {s.name}
                  </h3>
                  <p className="text-xs leading-relaxed mt-1.5 line-clamp-3 flex-1" style={{ color: '#6B7280' }}>
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Reserva de Evento */}
        <div className="mt-10 text-center">
          <div className="inline-block rounded-3xl p-8 sm:p-10" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
            <h3 className="font-bold text-white mb-2" style={{ fontSize: '24px', fontFamily: 'Georgia, serif' }}>
              ¿Planeas un evento especial?
            </h3>
            <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: '#E9D5FF' }}>
              Reserva tu fecha y elige todo lo que necesitas: tartas, servicios y decoración. Te confirmamos por WhatsApp.
            </p>
            <button
              onClick={openReservation}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 8px 20px -4px rgba(236,72,153,0.5)' }}
            >
              <CalendarHeart className="h-4 w-4" /> Reservar mi evento
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
