'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

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

interface SpecialDate {
  month: number;  // 0-11 (Jan=0)
  day: number;    // 1-31
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  accent: string;
}

const SPECIAL_DATES: SpecialDate[] = [
  {
    month: 1, day: 14,  // 14 de febrero
    name: 'Día de San Valentín',
    emoji: '💖',
    description: 'Sorprende a tu persona especial con una tarta romántica, cupcakes de corazones y detalles dulces.',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    accent: '#F472B6',
  },
  {
    month: 4, day: 11,  // Segundo domingo de mayo (aproximación: 11 de mayo)
    name: 'Día de las Madres',
    emoji: '👩‍👧',
    description: 'Celebra a mamá con la tarta favorita, un combo de dulces finos y un detalle personalizado.',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
    accent: '#C084FC',
  },
  {
    month: 6, day: 15,  // Tercer domingo de julio (aprox)
    name: 'Día de los Niños',
    emoji: '🧒',
    description: 'Tartas temáticas de personajes, máquina de burbujas, decoración colorida. Diversión asegurada.',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    accent: '#FBBF24',
  },
  {
    month: 8, day: 8,   // Segundo domingo de septiembre (aprox, Día del Padre en Cuba a veces)
    name: 'Día de los Padres',
    emoji: '👨',
    description: 'Tartas temáticas de fútbol, sublimación de pullovers y detalles para papá.',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    accent: '#60A5FA',
  },
  {
    month: 9, day: 10,  // 10 de octubre — Día de la Mujer Cubana
    name: 'Día de la Mujer Cubana',
    emoji: '🌹',
    description: 'Honra a las mujeres de tu vida con postres elegantes, tartas florales y detalles únicos.',
    gradient: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
    accent: '#F9A8D4',
  },
  {
    month: 11, day: 24, // Nochebuena
    name: 'Nochebuena',
    emoji: '🎄',
    description: 'Tartas navideñas, panetelas, galleticas temáticas y combos para celebrar en familia.',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%)',
    accent: '#F87171',
  },
  {
    month: 11, day: 31, // Fin de Año
    name: 'Fin de Año',
    emoji: '🎉',
    description: 'Despide el año con estilo: tartas de gala, mesa de dulces completa y promociones especiales.',
    gradient: 'linear-gradient(135deg, #7E22CE 0%, #2E1065 100%)',
    accent: '#C084FC',
  },
  {
    month: 0, day: 1,   // Año Nuevo
    name: 'Año Nuevo',
    emoji: '🥂',
    description: 'Recibe el año con postres frescos y tartas personalizadas para empezar con dulzura.',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)',
    accent: '#67E8F9',
  },
];

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getNextSpecialDate(now: Date): { date: SpecialDate; targetDate: Date; daysUntil: number } | null {
  const currentYear = now.getFullYear();
  let best: { date: SpecialDate; targetDate: Date; daysUntil: number } | null = null;

  for (const sd of SPECIAL_DATES) {
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

  useEffect(() => {
    // Inicializar `now` con la fecha actual y arrancar el timer del reloj.
    // El eslint-disable es necesario porque este es un caso legítimo de
    // sincronización con un sistema externo (el reloj del navegador).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const next = useMemo(() => (now ? getNextSpecialDate(now) : null), [now]);
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
