'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { DEFAULT_SPECIAL_DATES, type SpecialDate } from '@/lib/special-dates';

/**
 * SpecialDateCountdown
 *
 * Sección que muestra un countdown timer a la próxima fecha especial
 * relevante para la repostería (Día de las Madres, San Valentín, Fin de Año,
 * etc.). El objetivo es crear urgencia y dirigir tráfico a las promociones.
 *
 * Funcionamiento:
 *  1. Calcula la próxima fecha especial desde hoy.
 *  2. Muestra countdown en días / horas / minutos / segundos (actualizado cada 1s).
 *  3. Muestra el nombre + emoji + descripción de la fecha.
 *  4. CTA "Ver promociones" que navega a la vista 'promotions'.
 *
 * Si la fecha especial está a más de 60 días, no se renderiza la sección
 * (return null) para no saturar el home con un countdown irrelevante.
 *
 * Lista de fechas especiales (año agnóstico: se calcula el próximo evento):
 */

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getNextSpecialDate(now: Date, dates: SpecialDate[]): { date: SpecialDate; targetDate: Date; daysUntil: number } | null {
  const currentYear = now.getFullYear();
  let best: { date: SpecialDate; targetDate: Date; daysUntil: number } | null = null;

  for (const sd of dates) {
    // Try current year first
    for (const year of [currentYear, currentYear + 1]) {
      const target = new Date(year, sd.month, sd.day, 0, 0, 0, 0);
      const diff = target.getTime() - now.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      if (days > 0) {
        // Solo considerar fechas a 60 días o menos
        if (days <= 60) {
          if (!best || days < best.daysUntil) {
            best = { date: sd, targetDate: target, daysUntil: days };
          }
        }
        break; // No probar el año siguiente si ya encontramos una fecha futura en este año
      }
    }
  }

  return best;
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

export function SpecialDateCountdown() {
  const { setView } = useAppStore();
  // `now` se inicializa como `null` tanto en el servidor como en el cliente
  // para evitar mismatch de hidratación. El useEffect lo actualiza a
  // `new Date()` después del mount, lo que dispara un re-render con el countdown.
  // Esto es el patrón correcto para componentes que dependen del tiempo real.
  const [now, setNow] = useState<Date | null>(null);
  // Fechas especiales configuradas por el admin (fallback: lista por defecto)
  const [dates, setDates] = useState<SpecialDate[]>(DEFAULT_SPECIAL_DATES);

  useEffect(() => {
    // Inicializar `now` con la fecha actual y arrancar el timer del reloj.
    // El eslint-disable es necesario porque este es un caso legítimo de
    // sincronización con un sistema externo (el reloj del navegador).
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
            // Validar cada fecha: month 0-11, day 1-31, name presente
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

  const next = useMemo(() => (now ? getNextSpecialDate(now, dates) : null), [now, dates]);
  const remaining = useMemo(
    () => (next && now ? calculateTimeRemaining(next.targetDate, now) : null),
    [next, now]
  );

  // No renderizar hasta que esté montado (evita hydration mismatch)
  // y solo si hay una fecha especial a 60 días o menos.
  if (!now || !next || !remaining || remaining.total <= 0) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  const timeUnits = [
    { label: 'Días', value: remaining.days, max: 365 },
    { label: 'Horas', value: remaining.hours, max: 24 },
    { label: 'Min', value: remaining.minutes, max: 60 },
    { label: 'Seg', value: remaining.seconds, max: 60 },
  ];

  return (
    <section className="py-12 md:py-16" style={{ background: '#FFFFFF' }}>
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: next.date.gradient }}
        >
          {/* Imagen de fondo subida por el admin (opcional) */}
          {next.date.image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={next.date.image}
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
            style={{ background: `radial-gradient(circle, ${next.date.accent} 0%, transparent 70%)` }}
            aria-hidden
          />
          <div
            className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${next.date.accent} 0%, transparent 70%)` }}
            aria-hidden
          />

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 p-6 sm:p-8 md:p-12 items-center">
            {/* Lado izquierdo: info de la fecha */}
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.18)', color: '#FFF', border: '1px solid rgba(255,255,255,0.3)' }}>
                <Sparkles className="h-3 w-3" /> Próxima fecha especial
              </div>
              <div className="text-5xl sm:text-6xl mb-3 drop-shadow-lg">
                {next.date.emoji}
              </div>
              <h2 className="font-bold text-white mb-3" style={{ fontSize: '28px', fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                {next.date.name}
              </h2>
              <p className="text-sm mb-5 max-w-md mx-auto md:mx-0" style={{ color: 'rgba(255,255,255,0.92)' }}>
                {next.date.description}
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
        </motion.div>
      </div>
    </section>
  );
}
