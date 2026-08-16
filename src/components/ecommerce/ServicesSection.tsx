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
            Decoración, entretenimiento y detalles personalizados. Combina los servicios que necesites para un evento inolvidable.
          </p>

          {/* Indicador de moneda (solo informativo — el toggle global está en el Header) */}
          <div className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: '#FCE7F3', color: '#7E22CE', border: '1px solid #FBCFE8' }} aria-live="polite">
            {currency === 'CUP' ? '₱ CUP' : '$ USD (Zelle)'}
          </div>
        </div>

        {/* Grid de servicios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => {
            const color = CATEGORY_COLORS[s.category] || '#A855F7';
            const price = currency === 'CUP' ? s.price : s.priceUsd;
            const symbol = currency === 'CUP' ? '₱' : '$';
            return (
              <div
                key={s.id}
                className="group flex flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: '#FFF',
                  border: '1px solid #FBCFE8',
                  boxShadow: '0 4px 14px -2px rgba(236,72,153,0.08)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 12px 28px -6px ${color}33`; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px -2px rgba(236,72,153,0.08)'; }}
              >
                <div className="flex items-start gap-4 mb-3">
                  <div
                    className="flex items-center justify-center rounded-2xl shrink-0 transition-transform group-hover:scale-110 overflow-hidden"
                    style={{ width: '56px', height: '56px', background: `${color}1A`, border: `2px solid ${color}33` }}
                  >
                    {s.image ? (
                      <img src={s.image} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span style={{ fontSize: '28px' }}>{s.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                      {CATEGORY_LABELS[s.category] || s.category}
                    </span>
                    <h3 className="font-semibold leading-tight" style={{ fontSize: '16px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                      {s.name}
                    </h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: '#6B7280' }}>
                  {s.description}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Desde</span>
                    <p className="font-bold" style={{ fontSize: '20px', color, fontFamily: 'Georgia, serif' }}>
                      {symbol}{price.toLocaleString('es-CU')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      toast({ title: '✓ Servicio añadido', description: `${s.name} — lo incluirás en tu reserva de evento`, duration: 2500 });
                      openReservation();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white transition-all"
                    style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`, boxShadow: `0 4px 12px ${color}44` }}
                  >
                    <CalendarHeart className="h-3.5 w-3.5" /> Reservar
                  </button>
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
