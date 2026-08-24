'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { DEFAULT_SPECIAL_DATES, type SpecialDate } from '@/lib/special-dates';

/**
 * SpecialDateCountdown
 *
 * Sección de fechas especiales (configurables desde el admin):
 *
 *  - Se muestran TODAS las fechas que el admin tenga ACTIVAS (toggle).
 *    Si dos fechas caen el mismo día, se muestran las dos.
 *  - Se ordenan por la próxima ocurrencia (la más cercana primero);
 *    el `order` del admin desempata.
 *  - Sin límite de días: una fecha activa siempre se muestra (el countdown
 *    apunta a su próxima ocurrencia, este año o el siguiente).
 *  - Cada fecha puede tener imagen de fondo y una lista de "combos"
 *    (productIds) que se muestran como mini-tarjetas dentro de la sección.
 *  - Si el admin no configura nada, se usa la lista por defecto
 *    (src/lib/special-dates.ts).
 */

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

/** Próxima ocurrencia de un mes/día (este año; si ya pasó, el siguiente). */
function nextOccurrence(sd: SpecialDate, now: Date): Date {
  const y = now.getFullYear();
  const esteAnio = new Date(y, sd.month, sd.day, 0, 0, 0, 0);
  return esteAnio.getTime() > now.getTime() ? esteAnio : new Date(y + 1, sd.month, sd.day, 0, 0, 0, 0);
}

function calculateTimeRemaining(target: Date, now: Date): TimeRemaining {
  const total = target.getTime() - now.getTime();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, total };
}

interface ProductLite {
  id: string;
  name: string;
  price: number;
  image: string;
}

export function SpecialDateCountdown() {
  const { setView } = useAppStore();
  // `now` se inicializa como `null` tanto en el servidor como en el cliente
  // para evitar mismatch de hidratación. El useEffect lo actualiza después
  // del mount (patrón correcto para componentes que dependen del tiempo real).
  const [now, setNow] = useState<Date | null>(null);
  // Fechas especiales configuradas por el admin (fallback: lista por defecto)
  const [dates, setDates] = useState<SpecialDate[]>(DEFAULT_SPECIAL_DATES);
  // Catálogo de productos (para los "combos" de cada fecha)
  const [products, setProducts] = useState<ProductLite[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar fechas especiales configuradas desde el admin (SiteConfig.specialDates)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((cfg) => {
        if (cancelled || !cfg?.specialDates) return;
        try {
          const parsed = typeof cfg.specialDates === 'string' ? JSON.parse(cfg.specialDates) : cfg.specialDates;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter(
              (d: Partial<SpecialDate>) =>
                d && typeof d.month === 'number' && d.month >= 0 && d.month <= 11 &&
                typeof d.day === 'number' && d.day >= 1 && d.day <= 31 && !!d.name
            );
            if (valid.length > 0) setDates(valid as SpecialDate[]);
          }
        } catch { /* config inválida → seguir con defaults */ }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Cargar catálogo una sola vez (para mostrar los combos de cada fecha)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/products')
      .then((r) => r.json())
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setProducts(list.map((p: ProductLite) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, image: p.image || '' })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Tarjetas: solo fechas ACTIVAS, ordenadas por próxima ocurrencia (y orden admin)
  const cards = useMemo(() => {
    if (!now) return [];
    return dates
      .filter((d) => d.active !== false)
      .map((d) => ({
        date: d,
        target: nextOccurrence(d, now),
        order: typeof d.order === 'number' ? d.order : 0,
      }))
      .sort((a, b) => a.target.getTime() - b.target.getTime() || a.order - b.order)
      .map((c) => ({ ...c, remaining: calculateTimeRemaining(c.target, now) }));
  }, [now, dates]);

  // No renderizar hasta estar montado (evita hydration mismatch)
  if (!now || cards.length === 0) return null;

  return (
    <section className="py-12 md:py-16" style={{ background: '#FFFFFF' }}>
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6 space-y-8">
        {cards.map(({ date, target, remaining }) => {
          if (remaining.total <= 0) return null;
          const pad = (n: number) => String(n).padStart(2, '0');
          const timeUnits = [
            { label: 'Días', value: remaining.days },
            { label: 'Horas', value: remaining.hours },
            { label: 'Min', value: remaining.minutes },
            { label: 'Seg', value: remaining.seconds },
          ];
          const fechaStr = target.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
          const combos = (date.productIds || [])
            .map((id) => products.find((p) => p.id === id))
            .filter((p): p is ProductLite => Boolean(p));

          return (
            <motion.div
              key={`${date.name}-${date.month}-${date.day}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: date.gradient }}
            >
              {/* Imagen de fondo subida por el admin (opcional) */}
              {date.image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={date.image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    aria-hidden
                  />
                  {/* Velo oscuro para legibilidad del texto sobre la foto */}
                  <div className="absolute inset-0 bg-black/45" aria-hidden />
                </>
              )}
              {/* Pattern decorativo */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                  backgroundSize: '32px 32px',
                }}
                aria-hidden
              />
              {/* Glow accent */}
              <div
                className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${date.accent} 0%, transparent 70%)` }}
                aria-hidden
              />

              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 p-6 sm:p-8 md:p-12 items-center">
                {/* Lado izquierdo: info de la fecha */}
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.18)', color: '#FFF', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <Sparkles className="h-3 w-3" /> {fechaStr}
                  </div>
                  <div className="text-5xl sm:text-6xl mb-3 drop-shadow-lg">
                    {date.emoji}
                  </div>
                  <h2 className="font-bold text-white mb-3" style={{ fontSize: '28px', fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    {date.name}
                  </h2>
                  <p className="text-sm mb-5 max-w-md mx-auto md:mx-0" style={{ color: 'rgba(255,255,255,0.92)' }}>
                    {date.description}
                  </p>
                  <button
                    onClick={() => setView('promotions')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-transform hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)' }}
                  >
                    <Heart className="h-4 w-4 fill-white" /> Ver promociones
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Lado derecho: countdown timer */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {timeUnits.map((unit, i) => (
                    <motion.div
                      key={unit.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 200 }}
                      className="rounded-2xl p-2 sm:p-3 md:p-4 text-center"
                      style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}
                    >
                      <div
                        key={`${unit.label}-${unit.value}`}
                        className="font-bold text-white tabular-nums"
                        style={{
                          fontSize: 'clamp(20px, 4vw, 36px)',
                          fontFamily: 'Georgia, serif',
                          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {pad(unit.value)}
                      </div>
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {unit.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Combos / ofertas de la fecha (productos agrupados por el admin) */}
              {combos.length > 0 && (
                <div className="relative border-t px-6 sm:px-8 md:px-12 py-5" style={{ borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.18)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    🎁 Ofertas para esta fecha
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {combos.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2 shrink-0"
                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
                      >
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt={p.name} className="h-11 w-11 rounded-xl object-cover" />
                        ) : (
                          <div className="h-11 w-11 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>🧁</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate max-w-[160px]">{p.name}</p>
                          <p className="text-xs font-bold" style={{ color: date.accent }}>₱{p.price.toLocaleString('es-CU')} CUP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
