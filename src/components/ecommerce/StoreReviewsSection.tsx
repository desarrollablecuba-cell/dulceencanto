'use client';

import { useState, useEffect } from 'react';
import { Star, MessageCircle, Loader2, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCustomerStore } from '@/store/customer-store';
import { useAppStore } from '@/store/app-store';

interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  adminReply: string;
  createdAt: string;
}

interface Testimonial {
  name: string;
  location: string;
  text: string;
  rating: number;
}

interface SiteConfig {
  testimonials: string;
}

/**
 * Sección unificada de "Lo que dicen nuestros clientes".
 *
 * Fusiona:
 *  1. Reseñas reales del negocio (productId='store', aprobadas por admin).
 *  2. Testimonios manuales del admin (SiteConfig.testimonials).
 *
 * Se muestran en un carrusel horizontal (igual que los productos).
 * Los clientes logueados pueden escribir reseñas nuevas (requiere registro
 * para jalar nombre y país automáticamente).
 */
export function StoreReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [scrollIndex, setScrollIndex] = useState(0);
  const { toast } = useToast();
  const customer = useCustomerStore((s) => s.customer);
  const { setView } = useAppStore();

  useEffect(() => {
    Promise.all([
      fetch('/api/reviews?productId=store').then((r) => r.json()),
      fetch('/api/siteconfig').then((r) => r.json()),
    ])
      .then(([reviewsData, configData]) => {
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        try {
          const parsed = JSON.parse(configData?.testimonials || '[]');
          setTestimonials(Array.isArray(parsed) ? parsed : []);
        } catch { setTestimonials([]); }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Combinar reseñas reales + testimonios en una sola lista.
  const allItems: { type: 'review' | 'testimonial'; name: string; location: string; text: string; rating: number; date?: string }[] = [
    ...reviews.map((r) => ({
      type: 'review' as const,
      name: r.authorName,
      location: '',
      text: r.comment,
      rating: r.rating,
      date: r.createdAt,
    })),
    ...testimonials.map((t) => ({
      type: 'testimonial' as const,
      name: t.name,
      location: t.location,
      text: t.text,
      rating: t.rating,
    })),
  ];

  const avgRating = allItems.length > 0
    ? (allItems.reduce((sum, i) => sum + i.rating, 0) / allItems.length).toFixed(1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.comment.trim()) return;
    if (!customer) {
      toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para escribir una reseña.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'store',
          rating: form.rating,
          comment: form.comment,
        }),
      });
      if (res.ok) {
        toast({
          title: '¡Gracias por tu reseña!',
          description: 'Tu reseña será publicada después de ser aprobada.',
        });
        setForm({ rating: 5, comment: '' });
        setShowForm(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: err.error || 'No se pudo enviar la reseña.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar la reseña.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollByCards = (direction: 1 | -1) => {
    const container = document.getElementById('reviews-carousel-track');
    if (!container) return;
    container.scrollBy({ left: direction * container.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 py-6 md:py-8">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <MessageCircle className="h-6 w-6 text-brand" />
          Lo que dicen nuestros clientes
        </h2>
        {avgRating && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">{avgRating}</span>
            <span className="text-xs text-gray-400">({allItems.length} reseña{allItems.length === 1 ? '' : 's'})</span>
          </div>
        )}
      </div>

      {/* Botón escribir reseña */}
      <div className="text-center mb-4">
        {customer ? (
          <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-1.5" />
            {showForm ? 'Cancelar' : 'Escribir reseña'}
          </Button>
        ) : (
          <Button onClick={() => setView('account')} variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-1.5" />
            Inicia sesión para reseñar
          </Button>
        )}
      </div>

      {/* Formulario de reseña (solo logueados) */}
      {showForm && customer && (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-6 bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
          <p className="text-xs text-gray-500">
            Reseñando como: <strong>{customer.name}</strong> ({customer.country})
          </p>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Calificación</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} className="p-0.5">
                  <Star className={`h-6 w-6 transition-colors ${n <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 hover:text-amber-200'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tu reseña *</label>
            <Textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Cuéntanos sobre tu experiencia…"
              rows={3}
              className="text-sm"
              required
            />
          </div>
          <Button type="submit" disabled={submitting} size="sm" className="bg-brand hover:bg-brand-dark w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Enviar reseña
          </Button>
        </form>
      )}

      {/* Carrusel de reseñas + testimonios */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : allItems.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-8">
          Aún no hay reseñas. ¡Sé el primero en compartir tu experiencia!
        </p>
      ) : (
        <div className="relative">
          {/* Flecha izquierda (desktop) */}
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 z-20 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-700 hover:bg-brand hover:text-white hover:scale-110 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Track scrollable */}
          <div
            id="reviews-carousel-track"
            className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.carousel-track::-webkit-scrollbar { display: none; }`}</style>
            {allItems.map((item, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[85%] sm:w-[45%] md:w-[31%] lg:w-[23%] bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-bold text-xs">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-900">{item.name}</p>
                      {item.location && <p className="text-[10px] text-gray-400">{item.location}</p>}
                      {!item.location && item.date && <p className="text-[10px] text-gray-400">{new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`h-3 w-3 ${j < item.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">"{item.text}"</p>
              </div>
            ))}
          </div>

          {/* Flecha derecha (desktop) */}
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 z-20 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-700 hover:bg-brand hover:text-white hover:scale-110 transition-all"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  );
}
