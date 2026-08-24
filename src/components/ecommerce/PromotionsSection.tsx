'use client';

import { useState, useEffect } from 'react';
import { Gift, Tag, Calendar } from 'lucide-react';

interface Promotion {
  id: string;
  title: string;
  description: string;
  image: string;
  occasion: string;
  discountPct: number;
  startDate: string;
  endDate: string;
}

const OCCASION_LABELS: Record<string, string> = {
  dia_madres: 'Día de las Madres',
  dia_padres: 'Día de los Padres',
  san_valentin: 'San Valentín',
  dia_mujer: 'Día de la Mujer',
  fin_anio: 'Fin de Año',
};

const OCCASION_EMOJI: Record<string, string> = {
  dia_madres: '💐',
  dia_padres: '👔',
  san_valentin: '💖',
  dia_mujer: '🌸',
  fin_anio: '🎉',
};

export function PromotionsSection() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [active, setActive] = useState(0);

  // ── Combos por fecha especial (configurados en Ajustes → Inicio) ──
  interface SpecialDateCfg { month: number; day: number; name: string; emoji: string; description: string; image?: string; accent?: string; gradient?: string; active?: boolean; order?: number; productIds?: string[]; }
  interface ProductLite { id: string; name: string; price: number; image: string; }
  const [specialDates, setSpecialDates] = useState<SpecialDateCfg[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((cfg) => {
        try {
          const parsed = typeof cfg?.specialDates === 'string' ? JSON.parse(cfg.specialDates) : cfg?.specialDates;
          if (Array.isArray(parsed)) setSpecialDates(parsed);
        } catch { /* ignore */ }
      })
      .catch(() => {});
    fetch('/api/products')
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) {
          setProducts(list.map((pr: ProductLite) => ({ id: pr.id, name: pr.name, price: Number(pr.price) || 0, image: pr.image || '' })));
        }
      })
      .catch(() => {});
  }, []);

  // Grupos: solo fechas ACTIVAS con combos asignados, ordenadas por próxima
  // ocurrencia (la más cercana primero — ej: 6 combos para Día de los Padres)
  const comboGroups = (() => {
    const now = new Date();
    return specialDates
      .filter((d) => d.active !== false && (d.productIds || []).length > 0)
      .map((d) => {
        const y = now.getFullYear();
        const este = new Date(y, d.month, d.day, 0, 0, 0, 0);
        const target = este.getTime() > now.getTime() ? este : new Date(y + 1, d.month, d.day);
        return { d, target };
      })
      .sort((a, b) => a.target.getTime() - b.target.getTime() || (a.d.order ?? 0) - (b.d.order ?? 0))
      .map((g) => ({
        ...g,
        combos: (g.d.productIds || [])
          .map((id) => products.find((pr) => pr.id === id))
          .filter((pr): pr is ProductLite => Boolean(pr)),
      }))
      .filter((g) => g.combos.length > 0);
  })();

  useEffect(() => {
    fetch('/api/promotions')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPromos(data); })
      .catch(() => {});
  }, []);

  if (promos.length === 0 && comboGroups.length === 0) return null;

  return (
    <section id="promociones" className="py-16 relative" style={{ background: '#FEF7F0' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#FCE7F3', color: '#BE185D' }}>
            <Tag className="h-3.5 w-3.5" /> Promociones Especiales
          </span>
          <h2 className="font-bold" style={{ fontSize: '32px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
            Ofertas por fechas especiales
          </h2>
          <p className="mt-2" style={{ fontSize: '15px', color: '#6B7280' }}>
            Combos especiales para celebrar los momentos que más importan
          </p>
        </div>

        {/* ── Combos clasificados por fecha especial (del countdown) ── */}
        {comboGroups.map(({ d, target, combos }) => {
          const fechaStr = target.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
          return (
            <div key={`grupo-${d.name}-${d.month}-${d.day}`} className="mb-12">
              {/* Cabecera del grupo: imagen de fondo (si hay) o gradiente */}
              <div
                className="relative overflow-hidden rounded-2xl mb-5 px-5 sm:px-8 py-6"
                style={{ background: d.gradient || 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)' }}
              >
                {d.image && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.image} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
                    <div className="absolute inset-0 bg-black/45" aria-hidden />
                  </>
                )}
                <div className="relative flex items-center gap-4">
                  <span className="text-4xl drop-shadow-lg">{d.emoji}</span>
                  <div>
                    <h3 className="font-bold text-white" style={{ fontSize: '22px', fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      {d.name}
                    </h3>
                    <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {fechaStr} · {combos.length} {combos.length === 1 ? 'oferta' : 'ofertas'}
                    </p>
                  </div>
                </div>
                {d.description && (
                  <p className="relative text-sm mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.92)' }}>
                    {d.description}
                  </p>
                )}
              </div>

              {/* Combos de la fecha (imágenes reales de los productos) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {combos.map((pr) => (
                  <div
                    key={pr.id}
                    className="group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
                    style={{ background: '#FFF', border: '1px solid #FBCFE8', boxShadow: '0 6px 20px -4px rgba(236,72,153,0.12)' }}
                  >
                    <div className="h-36 overflow-hidden bg-gray-100">
                      {pr.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pr.image}
                          alt={pr.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🧁</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem]">{pr.name}</p>
                      <p className="mt-1.5 font-bold" style={{ color: '#BE185D' }}>
                        ₱{pr.price.toLocaleString('es-CU')} CUP
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Grid clásico de promociones (siempre; vacío no renderiza cards) */}
        {/* Grid de promociones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promos.map((p, i) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{
                background: '#FFF',
                border: '1px solid #FBCFE8',
                boxShadow: '0 6px 20px -4px rgba(236,72,153,0.12)',
              }}
              onMouseEnter={() => setActive(i)}
            >
              {/* Imagen / placeholder con emoji grande */}
              <div className="relative h-40 flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)' }}>
                <span style={{ fontSize: '72px', filter: 'drop-shadow(0 4px 8px rgba(236,72,153,0.2))' }} className="transition-transform group-hover:scale-110">
                  {OCCASION_EMOJI[p.occasion] || '🎁'}
                </span>
                {/* Badge descuento */}
                <span className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md" style={{ background: '#EC4899' }}>
                  -{p.discountPct}%
                </span>
              </div>

              <div className="p-5">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#EC4899' }}>
                  {OCCASION_LABELS[p.occasion] || p.occasion}
                </span>
                <h3 className="font-bold mb-1.5 leading-tight" style={{ fontSize: '18px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B7280' }}>
                  {p.description}
                </p>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                  <Calendar className="h-3 w-3" />
                  <span>
                    {p.startDate && p.endDate
                      ? `${new Date(p.startDate).toLocaleDateString('es-CU', { day: 'numeric', month: 'short' })} – ${new Date(p.endDate).toLocaleDateString('es-CU', { day: 'numeric', month: 'short' })}`
                      : 'Todo el año'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: '#6B7280' }}>
            <Gift className="inline h-4 w-4 mr-1" style={{ color: '#EC4899' }} />
            ¿Quieres una promoción personalizada para tu fecha especial?{' '}
            <a href="#servicios" className="font-semibold underline" style={{ color: '#7E22CE' }}>
              Conversemos
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
