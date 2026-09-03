'use client';

import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

interface SectionPageProps {
  title: string;
  subtitle?: string;
  icon: string;
  children: React.ReactNode;
  /** Imagen de fondo del banner (opcional) */
  bannerImage?: string;
}

/**
 * Wrapper para páginas de sección independientes.
 * Mantiene Header + Footer (gestionados por page.tsx) y provee:
 *  - Banner con imagen de fondo + título + ícono + subtítulo
 *  - Botón "Volver a la vitrina"
 *  - Animación de entrada
 */
export function SectionPage({ title, subtitle, icon, children, bannerImage }: SectionPageProps) {
  const { setView } = useAppStore();
  return (
    <div>
      {/* Banner de la sección con imagen de fondo — altura compacta en móvil */}
      <section className="relative overflow-hidden" style={{ minHeight: '180px' }}>
        {bannerImage && (
          <img
            src={bannerImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(46,16,101,0.88) 0%, rgba(126,34,206,0.75) 50%, rgba(168,85,247,0.6) 100%)' }} />
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-10 md:py-14 relative z-10">
          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-1.5 text-sm font-medium mb-3 sm:mb-4 transition-opacity hover:opacity-80"
            style={{ color: '#E9D5FF' }}
          >
            <ChevronLeft className="h-4 w-4" /> Volver al inicio
          </button>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3 sm:gap-4"
          >
            <span className="text-3xl sm:text-5xl">{icon}</span>
            <div className="min-w-0">
              <h1 className="font-bold text-white leading-tight text-2xl sm:text-3xl md:text-[32px]" style={{ fontFamily: 'Georgia, serif' }}>
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 max-w-2xl text-[13px] sm:text-[15px]" style={{ color: '#E9D5FF' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </section>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
