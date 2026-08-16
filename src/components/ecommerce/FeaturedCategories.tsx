'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Package } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  _count?: { products: number };
}

/**
 * FeaturedCategories
 *
 * Sección "Categorías Destacadas" del homepage.
 *
 * Muestra las categorías disponibles como cards visuales grandes con:
 *  - Imagen de la categoría (si existe) o gradient colorido como fallback.
 *  - Icono emoji grande (siempre visible).
 *  - Nombre de la categoría.
 *  - Conteo de productos ("12 productos").
 *  - CTA "Ver productos" con flecha.
 *
 * Al hacer click en una card, navega al catálogo general con esa categoría
 * pre-seleccionada (vía selectCategory del app-store).
 *
 * Se muestra entre el Hero/TopSelling y las section cards grandes, para dar
 * acceso visual rápido a las categorías sin necesidad de entrar a cada
 * sección individual.
 */
const CATEGORY_GRADIENTS: { bg: string; accent: string; shadow: string }[] = [
  { bg: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)', accent: '#C084FC', shadow: 'rgba(168,85,247,0.35)' },
  { bg: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', accent: '#F472B6', shadow: 'rgba(236,72,153,0.35)' },
  { bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', accent: '#FBBF24', shadow: 'rgba(245,158,11,0.35)' },
  { bg: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', accent: '#A78BFA', shadow: 'rgba(139,92,246,0.35)' },
  { bg: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)', accent: '#F9A8D4', shadow: 'rgba(244,114,182,0.35)' },
  { bg: 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)', accent: '#D8B4FE', shadow: 'rgba(192,132,252,0.35)' },
];

export function FeaturedCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectCategory, setView } = useAppStore();

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Ordenar por cantidad de productos descendente (más populares primero)
          const sorted = [...data].sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0));
          setCategories(sorted);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (slug: string) => {
    selectCategory(slug);
  };

  if (!loading && categories.length === 0) return null;

  return (
    <section className="py-12 md:py-16" style={{ background: 'linear-gradient(180deg, #FAF5FF 0%, #FFFFFF 100%)' }}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#FCE7F3', color: '#BE185D' }}>
            🗂️ Explora por categoría
          </span>
          <h2 className="font-bold" style={{ fontSize: '28px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
            Categorías Destacadas
          </h2>
          <p className="mt-2 max-w-xl mx-auto" style={{ fontSize: '14px', color: '#6B7280' }}>
            Encuentra justo lo que buscas. Cada categoría tiene productos frescos y personalizados para ti.
          </p>
        </div>

        {/* Grid de categorías */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden shadow-lg"
                style={{ background: '#FFF', border: '1px solid #FBCFE8' }}
              >
                <div className="aspect-[4/3] animate-pulse" style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)' }} />
                <div className="p-3 space-y-2">
                  <div className="h-4 rounded bg-gray-100 w-2/3 animate-pulse" />
                  <div className="h-3 rounded bg-gray-100 w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((cat, i) => {
              const gradient = CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length];
              const productCount = cat._count?.products ?? 0;
              const hasImage = !!cat.image;

              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
                  whileHover={{ y: -6 }}
                  onClick={() => handleClick(cat.slug)}
                  className="group relative rounded-2xl overflow-hidden text-left transition-shadow duration-300 cursor-pointer"
                  style={{
                    background: '#FFF',
                    border: '1px solid #FBCFE8',
                    boxShadow: `0 4px 14px -4px ${gradient.shadow}`,
                  }}
                  aria-label={`Ver ${productCount} productos de ${cat.name}`}
                >
                  {/* Imagen / Gradient header */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {hasImage ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500"
                        style={{ background: gradient.bg }}
                      >
                        {/* Decorative pattern */}
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                            backgroundSize: '20px 20px',
                          }}
                          aria-hidden
                        />
                        <span className="relative text-5xl sm:text-6xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
                          {cat.icon}
                        </span>
                      </div>
                    )}

                    {/* Overlay gradient para legibilidad */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(to top, rgba(46,16,101,0.55) 0%, transparent 50%)' }}
                    />

                    {/* Badge de cantidad */}
                    <div className="absolute top-2 right-2">
                      <span
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white backdrop-blur-sm"
                        style={{ background: 'rgba(46,16,101,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
                      >
                        <Package className="h-2.5 w-2.5" />
                        {productCount}
                      </span>
                    </div>

                    {/* CTA hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
                        style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)' }}
                      >
                        Ver productos <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>

                  {/* Footer con nombre */}
                  <div className="p-3 text-center">
                    <h3 className="font-bold text-sm leading-tight line-clamp-1 mb-0.5" style={{ color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                      <span className="mr-1">{cat.icon}</span>{cat.name}
                    </h3>
                    <p className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>
                      {productCount} {productCount === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* CTA ver todo el catálogo */}
        {!loading && categories.length > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={() => setView('catalog')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', boxShadow: '0 6px 18px -3px rgba(168,85,247,0.5)' }}
            >
              Ver catálogo completo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
