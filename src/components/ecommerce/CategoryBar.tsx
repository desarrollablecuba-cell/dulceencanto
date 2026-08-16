'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  _count?: { products: number };
}

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect?: (slug: string | null) => void;
}

export function CategoryBar({ categories, selectedCategory, onSelect }: CategoryBarProps) {
  const { selectCategory } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSelect = (slug: string | null) => {
    if (onSelect) {
      onSelect(slug);
    } else {
      selectCategory(slug);
    }
  };

  const scrollToSelected = useCallback((slug: string | null) => {
    const container = scrollRef.current;
    if (!container) return;
    if (slug === null) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-cat-slug]');
    const target = Array.from(buttons).find((b) => b.dataset.catSlug === slug);
    if (!target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetLeft = target.offsetLeft;
    const targetWidth = target.offsetWidth;
    const containerWidth = container.clientWidth;

    const isVisible = targetRect.left >= containerRect.left && targetRect.right <= containerRect.right;
    if (isVisible) return;

    let newScrollLeft: number;
    if (targetRect.left < containerRect.left) {
      newScrollLeft = targetLeft - 16;
    } else if (targetRect.right > containerRect.right) {
      newScrollLeft = targetLeft + targetWidth - containerWidth + 16;
    } else {
      newScrollLeft = targetLeft - (containerWidth - targetWidth) / 2;
    }

    const maxScroll = container.scrollWidth - containerWidth;
    newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => scrollToSelected(selectedCategory), 50);
    return () => clearTimeout(timer);
  }, [selectedCategory, categories, scrollToSelected]);

  const scrollByAmount = (amount: number) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="border-b sticky top-[120px] sm:top-[60px] z-30" style={{ background: 'linear-gradient(90deg, #FAF5FF 0%, #FDF2F8 50%, #FAF5FF 100%)' }}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-2 py-2.5">
          {/* View toggle — Ver todo */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-full shrink-0" style={{ background: '#FCE7F3', border: '1px solid #FBCFE8' }}>
            <button
              onClick={() => handleSelect(null)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all"
              style={{
                background: selectedCategory === null ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : 'transparent',
                color: selectedCategory === null ? '#FFF' : '#BE185D',
                boxShadow: selectedCategory === null ? '0 2px 8px rgba(236,72,153,0.3)' : 'none',
              }}
            >
              ✨ Todo
            </button>
          </div>

          {/* Separator */}
          <div className="h-6 w-px shrink-0" style={{ background: '#FBCFE8' }} />

          {/* Botón flecha izquierda */}
          <button
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: '#FFF', border: '1px solid #FBCFE8', color: '#7E22CE' }}
            onClick={() => scrollByAmount(-200)}
            title="Desplazar a la izquierda"
            aria-label="Desplazar a la izquierda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Contenedor scrollable de categorías */}
          <div className="relative flex-1 min-w-0">
            <div
              ref={scrollRef}
              className="dpe-catbar-scroll overflow-x-auto scroll-smooth"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <style>{`
                .dpe-catbar-scroll::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="flex gap-1.5 sm:gap-2 py-0.5">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      data-cat-slug={cat.slug}
                      style={{ scrollSnapAlign: 'start' }}
                      className="shrink-0 rounded-full transition-all duration-200"
                      onClick={() => handleSelect(cat.slug)}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(236,72,153,0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold"
                        style={{
                          background: isActive ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FFF',
                          color: isActive ? '#FFF' : '#2E1065',
                          border: isActive ? 'none' : '1px solid #FBCFE8',
                          boxShadow: isActive ? '0 4px 12px rgba(168,85,247,0.3)' : 'none',
                        }}
                      >
                        {cat.image ? (
                          <img src={cat.image} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : cat.icon ? (
                          <span style={{ fontSize: '14px' }}>{cat.icon}</span>
                        ) : null}
                        <span>{cat.name}</span>
                        {cat._count?.products !== undefined && (
                          <span
                            className="text-[9px] font-bold rounded-full px-1.5 py-0.5"
                            style={{
                              background: isActive ? 'rgba(255,255,255,0.25)' : '#F3E8FF',
                              color: isActive ? '#FFF' : '#7E22CE',
                            }}
                          >
                            {cat._count.products}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Degradado sutil en el borde derecho (móvil) */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 right-0 h-full w-8 md:hidden"
              style={{ background: 'linear-gradient(to left, #FAF5FF, transparent)' }}
            />
          </div>

          {/* Botón flecha derecha */}
          <button
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: '#FFF', border: '1px solid #FBCFE8', color: '#7E22CE' }}
            onClick={() => scrollByAmount(200)}
            title="Desplazar a la derecha"
            aria-label="Desplazar a la derecha"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
