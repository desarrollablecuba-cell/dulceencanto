'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { Skeleton } from '@/components/ui/skeleton';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  _count?: { products: number };
}

/**
 * Showcase de categorías optimizado para UX móvil.
 *
 * Patrones adoptados del diseño de referencia:
 *  - Cuadrícula de 2 columnas en móvil (mayor área táctil por categoría).
 *  - 3 columnas en tablet, 6 en desktop.
 *  - Cada categoría es un botón grande (mínimo ~120px de alto) con
 *    imagen/icono grande + nombre + contador de productos.
 *  - Espaciado compacto (gap-2 en móvil) para reducir scroll.
 *  - Touch target cómodo para el dedo.
 */
export function CategoryShowcase() {
  const { selectCategory } = useAppStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const colors = [
    'from-blue-500 to-cyan-500',
    'from-pink-500 to-rose-500',
    'from-green-500 to-emerald-500',
    'from-purple-500 to-violet-500',
    'from-orange-500 to-red-500',
    'from-teal-500 to-cyan-500',
  ];

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-3 sm:px-4 py-6 md:py-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Comprar por Categoría</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 py-6 md:py-8">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Comprar por Categoría</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        {categories.map((category, i) => (
          <button
            key={category.id}
            type="button"
            onClick={() => selectCategory(category.slug)}
            className="flex flex-col gap-1.5 p-2 rounded-xl bg-white border border-gray-100 shadow-card hover:shadow-hover transition-all hover:-translate-y-0.5 overflow-hidden group text-left"
          >
            <div className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden ${category.image ? '' : `bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center`}`}>
              {category.image ? (
                <>
                  <img
                    src={category.image}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <span className="absolute bottom-1 right-1.5 text-lg drop-shadow-lg">
                    {category.icon}
                  </span>
                </>
              ) : (
                <span className="text-3xl sm:text-4xl">{category.icon}</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-1 px-0.5">
              <span className="text-xs sm:text-sm font-semibold text-gray-800 leading-tight line-clamp-1">
                {category.name}
              </span>
              {category._count && (
                <span className="text-[10px] text-gray-400 shrink-0">
                  {category._count.products}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
