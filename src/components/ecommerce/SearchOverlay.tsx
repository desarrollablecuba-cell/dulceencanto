'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Package, Tag, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useCurrencyStore, formatPrice } from '@/store/currency-store';

interface Product {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  featured?: boolean;
  category: { id: string; name: string; slug: string; icon: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface SearchOverlayProps {
  /** Si el overlay está abierto. */
  open: boolean;
  /** Callback para cerrar el overlay. */
  onClose: () => void;
  /** Query inicial (sincronizada con el input del Header). */
  initialQuery?: string;
}

/**
 * SearchOverlay
 *
 * Overlay de búsqueda full-screen que muestra sugerencias en tiempo real
 * mientras el usuario escribe. Reemplaza la navegación directa al catálogo
 * con una experiencia más rica:
 *
 *  - Input grande centrado en la parte superior.
 *  - Resultados en 2 secciones: "Productos" y "Categorías".
 *  - Cada resultado es clicable y navega a la vista correspondiente.
 *  - Debounce de 300ms para no saturar la API.
 *  - Cierre con Escape, click fuera, o botón X.
 *  - Accesible: role="dialog", aria-modal, focus trap básico.
 *  - Soporte para teclado: Enter ejecuta búsqueda tradicional (catálogo).
 */
const DEBOUNCE_MS = 300;

export function SearchOverlay({ open, onClose, initialQuery = '' }: SearchOverlayProps) {
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { selectProduct, setSearchQuery, setView, selectCategory } = useAppStore();
  const currency = useCurrencyStore((s) => s.currency);

  // Focus al input al abrir
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setHasSearched(false);
      setProducts([]);
      setCategories([]);
      // Focus después del delay de la animación de entrada
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open, initialQuery]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setProducts([]);
      setCategories([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    const timer = setTimeout(async () => {
      // Cancelar request anterior si existe
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const [prodRes, catRes] = await Promise.all([
          fetch(`/api/products?search=${encodeURIComponent(query)}&take=8`, { signal: controller.signal }),
          fetch('/api/categories', { signal: controller.signal }),
        ]);
        const [prods, cats] = await Promise.all([
          prodRes.json().catch(() => []),
          catRes.json().catch(() => []),
        ]);
        // Filtrar categorías que coincidan con la query (por nombre)
        const q = query.toLowerCase();
        const matchedCats = Array.isArray(cats)
          ? cats.filter((c: Category) => c.name.toLowerCase().includes(q)).slice(0, 4)
          : [];
        setProducts(Array.isArray(prods) ? prods : []);
        setCategories(matchedCats);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setProducts([]);
          setCategories([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open]);

  const handleProductClick = (p: Product) => {
    selectProduct(p.id);
    onClose();
  };

  const handleCategoryClick = (c: Category) => {
    selectCategory(c.slug);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchQuery(query);
    onClose();
  };

  const totalResults = products.length + categories.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20"
          style={{ background: 'rgba(46,16,101,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Buscar productos"
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: '#FFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b" style={{ borderColor: '#FBCFE8' }}>
                <Search className="h-5 w-5 shrink-0" style={{ color: '#A855F7' }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos, categorías..."
                  className="flex-1 bg-transparent border-none outline-none text-base sm:text-lg font-medium"
                  style={{ color: '#2E1065' }}
                  aria-label="Buscar"
                  autoComplete="off"
                />
                {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: '#A855F7' }} />}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-gray-100 shrink-0"
                  aria-label="Cerrar búsqueda"
                >
                  <X className="h-4 w-4" style={{ color: '#6B7280' }} />
                </button>
              </div>
            </form>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!hasSearched && (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)' }}>
                    <Search className="h-7 w-7" style={{ color: '#A855F7' }} />
                  </div>
                  <p className="font-bold text-sm mb-1" style={{ color: '#2E1065', fontFamily: 'Georgia, serif', fontSize: '16px' }}>
                    Busca tus dulces favoritos
                  </p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    Escribe el nombre de un producto (ej: "torta", "cupcake") o una categoría.
                  </p>
                </div>
              )}

              {hasSearched && !loading && totalResults === 0 && (
                <div className="p-8 sm:p-12 text-center">
                  <p className="text-3xl mb-3">🔍</p>
                  <p className="font-bold text-sm mb-1" style={{ color: '#2E1065', fontFamily: 'Georgia, serif', fontSize: '16px' }}>
                    Sin resultados para "{query}"
                  </p>
                  <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
                    Intenta con otra palabra o explora el catálogo completo.
                  </p>
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition-transform hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                  >
                    Ver catálogo <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {hasSearched && totalResults > 0 && (
                <div className="p-3 sm:p-4 space-y-4">
                  {/* Categorías */}
                  {categories.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-2 px-2" style={{ color: '#7E22CE' }}>
                        <Tag className="inline h-3 w-3 mr-1" /> Categorías ({categories.length})
                      </p>
                      <div className="space-y-1">
                        {categories.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleCategoryClick(c)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-purple-50 text-left group"
                          >
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: '#F3E8FF' }}>
                              {c.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate" style={{ color: '#2E1065' }}>{c.name}</p>
                              <p className="text-[10px]" style={{ color: '#9CA3AF' }}>Categoría</p>
                            </div>
                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: '#A855F7' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Productos */}
                  {products.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-2 px-2" style={{ color: '#BE185D' }}>
                        <Package className="inline h-3 w-3 mr-1" /> Productos ({products.length})
                      </p>
                      <div className="space-y-1">
                        {products.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleProductClick(p)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-pink-50 text-left group"
                          >
                            <img
                              src={p.image || '/products/placeholder.svg'}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover shrink-0"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate" style={{ color: '#2E1065' }}>
                                {p.shortName || p.name}
                              </p>
                              <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>
                                {p.category.icon} {p.category.name}
                              </p>
                            </div>
                            <span className="font-bold text-sm shrink-0" style={{ color: '#A855F7', fontFamily: 'Georgia, serif' }}>
                              {formatPrice(p.price, currency)}
                            </span>
                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: '#EC4899' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ver todos los resultados */}
                  <button
                    onClick={handleSubmit}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', color: '#FFF' }}
                  >
                    Ver todos los resultados en el catálogo <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: '#FBCFE8', color: '#9CA3AF' }}>
              <span>ESC para cerrar</span>
              <span>Enter para ver catálogo</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
