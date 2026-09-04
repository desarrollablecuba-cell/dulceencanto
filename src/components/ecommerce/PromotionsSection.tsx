'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Tag, Calendar, ShoppingBag, Check, Sparkles, Package, ChevronRight, MessageCircle, Timer, Share2, X, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCartStore } from '@/store/cart-store';

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

// ── Tipos compartidos (fechas especiales + combos v2 + productos) ──
export interface SpecialDateCfg {
  month: number;
  day: number;
  name: string;
  emoji: string;
  description: string;
  image?: string;
  accent?: string;
  gradient?: string;
  active?: boolean;
  order?: number;
  productIds?: string[];
  combos?: SpecialDateComboCfg[];
}

export interface SpecialDateComboCfg {
  id: string;
  name: string;
  description?: string;
  image?: string;
  discountPct?: number;
  productIds: string[];
  active?: boolean;
  order?: number;
}

export interface ProductLite {
  id: string;
  name: string;
  price: number;
  image: string;
  stock?: number;
  reservationDays?: number;
}

export function PromotionsSection() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const addItem = useCartStore((s) => s.addItem);
  const { toast } = useToast();

  // ── Combos por fecha especial (configurados en Ajustes → Inicio) ──
  const [specialDates, setSpecialDates] = useState<SpecialDateCfg[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');

  // ── Lightbox de productos del combo (galería gigante) ──
  const [lightbox, setLightbox] = useState<{ images: string[]; idx: number } | null>(null);

  const lightboxNext = useCallback(() => {
    setLightbox((lb) => (lb ? { ...lb, idx: (lb.idx + 1) % lb.images.length } : lb));
  }, []);
  const lightboxPrev = useCallback(() => {
    setLightbox((lb) => (lb ? { ...lb, idx: (lb.idx - 1 + lb.images.length) % lb.images.length } : lb));
  }, []);

  // Navegación con teclado dentro del lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      else if (e.key === 'ArrowRight') lightboxNext();
      else if (e.key === 'ArrowLeft') lightboxPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, lightboxNext, lightboxPrev]);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((cfg) => {
        try {
          const parsed = typeof cfg?.specialDates === 'string' ? JSON.parse(cfg.specialDates) : cfg?.specialDates;
          if (Array.isArray(parsed)) setSpecialDates(parsed);
        } catch { /* ignore */ }
        if (cfg?.whatsappNumber) setWhatsapp(String(cfg.whatsappNumber));
      })
      .catch(() => {});
    fetch('/api/products')
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) {
          setProducts(
            list.map((pr: ProductLite) => ({
              id: pr.id,
              name: pr.name,
              price: Number(pr.price) || 0,
              image: pr.image || '',
              stock: typeof pr.stock === 'number' ? pr.stock : undefined,
              reservationDays: typeof pr.reservationDays === 'number' ? pr.reservationDays : undefined,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Grupos: solo fechas ACTIVAS con combos (v2) o productos legacy asignados,
  // ordenadas por próxima ocurrencia (la más cercana primero).
  const comboGroups = (() => {
    const now = new Date();
    return specialDates
      .map((d) => {
        const y = now.getFullYear();
        const este = new Date(y, d.month, d.day, 0, 0, 0, 0);
        const target = este.getTime() > now.getTime() ? este : new Date(y + 1, d.month, d.day);
        return { d, target };
      })
      .filter(({ d }) => {
        if (d.active === false) return false;
        const combos = (d.combos || []).filter(
          (c) => c.active !== false && (c.productIds || []).length > 0
        );
        const legacy = (d.productIds || []).length > 0;
        return combos.length > 0 || legacy;
      })
      .sort((a, b) => a.target.getTime() - b.target.getTime() || (a.d.order ?? 0) - (b.d.order ?? 0))
      .map((g) => {
        // Combos v2 (multi-producto) — resueltos contra el catálogo real
        const combos = (g.d.combos || [])
          .filter((c) => c.active !== false && (c.productIds || []).length > 0)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((c) => ({
            cfg: c,
            items: (c.productIds || [])
              .map((id) => products.find((pr) => pr.id === id))
              .filter((pr): pr is ProductLite => Boolean(pr)),
          }))
          .filter((c) => c.items.length > 0);
        // Legacy: productos sueltos (formato anterior)
        const legacyProducts = (g.d.productIds || [])
          .map((id) => products.find((pr) => pr.id === id))
          .filter((pr): pr is ProductLite => Boolean(pr));
        return { ...g, combos, legacyProducts };
      })
      .filter((g) => g.combos.length > 0 || g.legacyProducts.length > 0);
  })();

  useEffect(() => {
    fetch('/api/promotions')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPromos(data); })
      .catch(() => {});
  }, []);

  // Añadir todos los productos del combo al carrito y abrir el drawer
  const orderCombo = (comboName: string, items: ProductLite[]) => {
    let added = 0;
    let blocked = '';
    for (const it of items) {
      // V52.7 — canal de venta: sin stock → reservable ($USD); con stock →
      // venta directa (₡CUP). Los items del combo siguen la misma regla.
      const mode: 'direct' | 'reservation' = (it.stock ?? 0) <= 0 ? 'reservation' : 'direct';
      const res = addItem({
        productId: it.id,
        name: it.name,
        price: it.price,
        basePrice: it.price,
        image: it.image,
        stock: mode === 'reservation' ? undefined : it.stock,
        isReservation: mode === 'reservation' ? true : undefined,
        saleMode: mode,
        reservationDays: mode === 'reservation' ? it.reservationDays : undefined,
      });
      if (res.ok) added++;
      else blocked = res.reason || '';
    }
    if (added > 0) {
      toast({
        title: '🎁 Combo añadido al carrito',
        description: `${comboName} — ${added} ${added === 1 ? 'producto' : 'productos'} listos para tu pedido`,
        duration: 3000,
      });
      window.dispatchEvent(new Event('toggleCart'));
    } else {
      toast({
        title: 'No se pudo añadir el combo',
        description: blocked || 'Inténtalo de nuevo o contáctanos por WhatsApp.',
        duration: 3500,
      });
    }
  };

  // Compartir un combo por WhatsApp (resumen con productos y precio final)
  const shareCombo = (comboName: string, items: ProductLite[], finalPrice: number, pct: number, promoName: string) => {
    const lista = items.slice(0, 4).map((it) => `• ${it.name}`).join('\n');
    const extra = items.length > 4 ? `\n• … y ${items.length - 4} más\n` : '\n';
    const msg = `🎁 *${comboName}* — promo de ${promoName} en Dulce Encanto\n\n${lista}${extra}\nTotal: ₱${finalPrice.toLocaleString('es-CU')}${pct > 0 ? ` (−${pct}% descuento)` : ''}\n\n¿Me lo reservan? 🍰`;
    const url = `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener');
    toast({ title: '↗ Compartiendo combo', description: 'Se abrió WhatsApp con el resumen del combo', duration: 2500 });
  };

  // Compartir la promoción COMPLETA (banner) por WhatsApp: enumera sus combos
  const sharePromo = (promoName: string, combos: { cfg: SpecialDateComboCfg; items: ProductLite[] }[], fechaStr: string) => {
    const lines = combos.slice(0, 5).map((c) => {
      const total = c.items.reduce((n, it) => n + it.price, 0);
      const pct = Math.min(100, Math.max(0, Number(c.cfg.discountPct) || 0));
      const final = Math.round(total * (1 - pct / 100));
      return `• *${c.cfg.name}* — ${c.items.length} productos, ₱${final.toLocaleString('es-CU')}${pct > 0 ? ` (−${pct}%)` : ''}`;
    }).join('\n');
    const extra = combos.length > 5 ? `\n• … y ${combos.length - 5} combos más` : '';
    const msg = `💝 *${promoName}* (${fechaStr}) en Dulce Encanto\n\n${lines}${extra}\n\nMira las promos: pregunta por los combos 🎁`;
    const url = `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener');
    toast({ title: '↗ Compartiendo promoción', description: 'Se abrió WhatsApp con los combos de la promo', duration: 2500 });
  };

  if (loaded && promos.length === 0 && comboGroups.length === 0) return null;

  return (
    <section id="promociones" className="py-16 relative" style={{ background: '#FEF7F0' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-3 px-4 py-1.5 rounded-full" style={{ background: '#FCE7F3', color: '#BE185D', border: '1px solid #FBCFE8' }}>
            <Tag className="h-3.5 w-3.5" /> Promociones Especiales
          </span>
          <h2 className="font-bold" style={{ fontSize: '32px', color: '#2E1065', fontFamily: 'Georgia, serif', textShadow: '0 1px 2px rgba(236,72,153,0.15)' }}>
            Ofertas por fechas especiales
          </h2>
          <p className="mt-3" style={{ fontSize: '15px', color: '#6B7280', lineHeight: 1.6 }}>
            Elige un combo armado por nosotros o arma el tuyo. Celebra los momentos que más importan
          </p>
        </div>

        {/* Skeletons mientras cargan combos y productos */}
        {!loaded && (
          <div className="space-y-4 mb-10">
            {[0, 1].map((i) => (
              <div key={`sk-promo-${i}`} className="overflow-hidden rounded-3xl" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
                <div className="shimmer-bg h-28" />
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="overflow-hidden rounded-2xl" style={{ border: '1px solid #FCE7F3' }}>
                      <div className="shimmer-bg h-48" />
                      <div className="p-4 space-y-2">
                        <div className="shimmer-bg h-4 rounded w-2/3" />
                        <div className="shimmer-bg h-3 rounded w-full" />
                        <div className="shimmer-bg h-3 rounded w-4/5" />
                        <div className="shimmer-bg h-9 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Cards de promoción (Día de las Madres, etc.) con combos dentro ── */}
        {comboGroups.map(({ d, target, combos, legacyProducts }) => {
          const fechaStr = target.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
          const totalCombos = combos.length + (legacyProducts.length > 0 ? 1 : 0);
          const daysLeft = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86400000));
          return (
            <motion.article
              key={`promo-card-${d.name}-${d.month}-${d.day}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="mb-10 overflow-hidden rounded-3xl"
              style={{ background: '#FFF', border: '1px solid #FBCFE8', boxShadow: '0 10px 34px -8px rgba(236,72,153,0.18)' }}
            >
              {/* Banner de la promoción */}
              <div
                className="relative overflow-hidden px-5 sm:px-8 py-6"
                style={{ background: d.gradient || 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)' }}
              >
                {d.image && (
                  <>
                    <img src={d.image} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
                    <div className="absolute inset-0 bg-black/45" aria-hidden />
                  </>
                )}
                {/* Brillo decorativo */}
                <div
                  className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${d.accent || '#F472B6'} 0%, transparent 70%)` }}
                  aria-hidden
                />
                <div className="relative flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-4xl sm:text-5xl drop-shadow-lg shrink-0">{d.emoji}</span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate" style={{ fontSize: '24px', fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        {d.name}
                      </h3>
                      <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {fechaStr} · {totalCombos > 0 ? `${totalCombos} ${totalCombos === 1 ? 'oferta' : 'ofertas'}` : 'próximamente'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    {/* Countdown: urgencia visual */}
                    <span
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white"
                      style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(6px)' }}
                      title={daysLeft <= 1 ? '¡La fecha es hoy o mañana!' : `Faltan ${daysLeft} días para el ${fechaStr}`}
                    >
                      <Timer className="h-3.5 w-3.5" />
                      {daysLeft <= 0 ? '¡Es hoy!' : daysLeft === 1 ? '¡Mañana!' : `Faltan ${daysLeft} días`}
                    </span>
                    {combos.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white"
                        style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(6px)' }}
                      >
                        <Gift className="h-3.5 w-3.5" /> {combos.length} {combos.length === 1 ? 'combo' : 'combos'}
                      </span>
                    )}
                    {/* Compartir la promoción completa */}
                    {whatsapp && combos.length > 0 && (
                      <button
                        onClick={() => sharePromo(d.name, combos, fechaStr)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'rgba(37,211,102,0.35)', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(6px)' }}
                        aria-label={`Compartir promoción ${d.name} por WhatsApp`}
                        title="Compartir promoción por WhatsApp"
                      >
                        <Share2 className="h-3.5 w-3.5" /> Compartir
                      </button>
                    )}
                  </div>
                </div>
                {d.description && (
                  <p className="relative text-sm mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.92)' }}>
                    {d.description}
                  </p>
                )}
              </div>

              {/* Cuerpo: cards de combos (multi-producto) dentro de la promoción */}
              {combos.length > 0 && (
                <div className="p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-1.5" style={{ color: '#9CA3AF' }}>
                    <Sparkles className="h-3.5 w-3.5" style={{ color: '#EC4899' }} /> Combos de esta promoción — conformados con varios productos
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {combos.map(({ cfg: c, items }, ci) => {
                      const total = items.reduce((n, it) => n + it.price, 0);
                      const pct = Math.min(100, Math.max(0, Number(c.discountPct) || 0));
                      const finalPrice = Math.round(total * (1 - pct / 100));
                      const ahorro = total - finalPrice;
                      return (
                        <motion.div
                          key={c.id || c.name}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: '-30px' }}
                          transition={{ duration: 0.35, delay: Math.min(ci * 0.07, 0.28), ease: 'easeOut' }}
                          className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1.5"
                          style={{ background: '#FFFDFA', border: '1px solid #FBCFE8', boxShadow: '0 6px 20px -6px rgba(236,72,153,0.14)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 18px 38px -10px rgba(190,24,93,0.32)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px -6px rgba(236,72,153,0.14)'; }}
                        >
                          {/* Zona de imagen: foto del combo o collage de los productos (clic → lightbox) */}
                          <div className="relative h-48 sm:h-52 overflow-hidden" style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)' }}>
                            {c.image ? (
                              <button
                                type="button"
                                onClick={() => setLightbox({ images: [c.image as string, ...items.map((it) => it.image).filter(Boolean)], idx: 0 })}
                                className="w-full h-full cursor-zoom-in"
                                aria-label={`Ampliar foto de ${c.name}`}
                              >
                                <img
                                  src={c.image}
                                  alt={c.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                              </button>
                            ) : items[0]?.image ? (
                              <button
                                type="button"
                                onClick={() => setLightbox({ images: items.map((it) => it.image).filter(Boolean), idx: 0 })}
                                className="w-full h-full cursor-zoom-in"
                                aria-label={`Ampliar fotos de los productos de ${c.name}`}
                              >
                                <img
                                  src={items[0].image}
                                  alt={items[0].name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                                {/* Collage: miniaturas de los demás productos del combo */}
                                {items.length > 1 && (
                                  <span className="absolute bottom-2 left-2 flex gap-1.5">
                                    {items.slice(1, 4).map((it) => (
                                      <img
                                        key={it.id}
                                        src={it.image}
                                        alt=""
                                        className="h-12 w-12 rounded-xl object-cover"
                                        style={{ border: '2.5px solid #FFF', boxShadow: '0 3px 10px rgba(0,0,0,0.18)' }}
                                        loading="lazy"
                                      />
                                    ))}
                                    {items.length > 4 && (
                                      <span
                                        className="h-12 w-12 rounded-xl flex items-center justify-center text-[11px] font-bold"
                                        style={{ background: 'rgba(46,16,101,0.85)', color: '#FFF', border: '2.5px solid #FFF' }}
                                      >
                                        +{items.length - 4}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-5xl">🎁</div>
                            )}
                            {/* Cinta de descuento (esquina, estilo promo) */}
                            {pct > 0 && (
                              <span className="ribbon-discount">−{pct}%</span>
                            )}
                            {/* Badge de cantidad de productos */}
                            <span
                              className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                              style={{ background: 'rgba(46,16,101,0.78)', backdropFilter: 'blur(4px)' }}
                            >
                              <Package className="h-3 w-3" /> {items.length} {items.length === 1 ? 'producto' : 'productos'}
                            </span>
                          </div>

                          {/* Contenido del combo */}
                          <div className="flex flex-col flex-1 p-4">
                            <h4 className="font-bold leading-tight mb-1" style={{ fontSize: '16px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                              {c.name}
                            </h4>
                            {c.description && (
                              <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#6B7280' }}>
                                {c.description}
                              </p>
                            )}
                            {/* Lista de productos del combo */}
                            <ul className="space-y-1.5 mb-3">
                              {items.slice(0, 4).map((it) => (
                                <li key={it.id} className="flex items-center gap-2 text-xs">
                                  <Check className="h-3.5 w-3.5 shrink-0" style={{ color: '#EC4899' }} />
                                  <span className="flex-1 truncate min-w-0" style={{ color: '#374151' }}>{it.name}</span>
                                  <span className="shrink-0 font-semibold tabular-nums" style={{ color: '#6B7280' }}>
                                    ₱{it.price.toLocaleString('es-CU')}
                                  </span>
                                </li>
                              ))}
                              {items.length > 4 && (
                                <li className="text-xs italic pl-6" style={{ color: '#9CA3AF' }}>
                                  + {items.length - 4} productos más
                                </li>
                              )}
                            </ul>
                            {/* Precios */}
                            <div className="mt-auto pt-3 border-t flex items-end justify-between gap-3" style={{ borderColor: '#FCE7F3' }}>
                              <div>
                                {pct > 0 && (
                                  <p className="text-xs line-through" style={{ color: '#9CA3AF' }}>
                                    ₱{total.toLocaleString('es-CU')}
                                  </p>
                                )}
                                <p className="font-bold leading-tight" style={{ fontSize: '22px', color: '#BE185D', fontFamily: 'Georgia, serif' }}>
                                  ₱{finalPrice.toLocaleString('es-CU')}
                                  <span className="text-[11px] font-semibold ml-1" style={{ color: '#9CA3AF' }}>CUP</span>
                                </p>
                                {ahorro > 0 && (
                                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#059669' }}>
                                    ✓ Ahorras ₱{ahorro.toLocaleString('es-CU')}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Acciones: pedir + compartir por WhatsApp */}
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={() => orderCombo(c.name, items)}
                                className="card-cta flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 6px 16px -4px rgba(236,72,153,0.45)' }}
                              >
                                <ShoppingBag className="h-4 w-4" /> Pedir combo
                                <ChevronRight className="h-4 w-4" />
                              </button>
                              {whatsapp && (
                                <button
                                  onClick={() => shareCombo(c.name, items, finalPrice, pct, d.name)}
                                  className="inline-flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-all hover:scale-105 active:scale-95"
                                  style={{ background: '#FFF', border: '2px solid #25D366', color: '#128C7E' }}
                                  aria-label={`Compartir ${c.name} por WhatsApp`}
                                  title="Compartir por WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Legacy: productos sueltos (formato anterior, compatibilidad) */}
              {legacyProducts.length > 0 && (
                <div className={combos.length > 0 ? 'px-5 sm:px-7 pb-6' : 'p-5 sm:p-7'}>
                  {combos.length > 0 && (
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
                      También disponibles por separado
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {legacyProducts.map((pr) => (
                      <div
                        key={`legacy-${pr.id}`}
                        className="group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
                        style={{ background: '#FFF', border: '1px solid #FBCFE8', boxShadow: '0 6px 20px -4px rgba(236,72,153,0.12)' }}
                      >
                        <div className="h-36 overflow-hidden bg-gray-100">
                          {pr.image ? (
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
              )}
            </motion.article>
          );
        })}

        {/* Grid clásico de promociones (siempre; vacío no renderiza cards) */}
        {/* Grid de promociones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promos.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{
                background: '#FFF',
                border: '1px solid #FBCFE8',
                boxShadow: '0 6px 20px -4px rgba(236,72,153,0.12)',
              }}
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

      {/* ═══ LIGHTBOX: fotos del combo a pantalla completa (teclado ←/→/Esc) ═══ */}
      <AnimatePresence>
        {lightbox && lightbox.images.length > 0 && (
          <motion.div
            key="combo-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(10, 5, 16, 0.97)' }}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-label="Fotos del combo ampliadas"
          >
            {/* Cerrar */}
            <button
              className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
              onClick={() => setLightbox(null)}
              aria-label="Cerrar vista ampliada"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Flechas (si hay varias fotos) */}
            {lightbox.images.length > 1 && (
              <>
                <button
                  className="absolute left-3 sm:left-6 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                  style={{ background: 'rgba(236,72,153,0.3)', backdropFilter: 'blur(6px)' }}
                  onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  className="absolute right-3 sm:right-6 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                  style={{ background: 'rgba(236,72,153,0.3)', backdropFilter: 'blur(6px)' }}
                  onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}

            {/* Imagen gigante */}
            <motion.img
              key={lightbox.idx}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              src={lightbox.images[lightbox.idx]}
              alt={`Foto ${lightbox.idx + 1} del combo`}
              className="max-w-[94vw] max-h-[88vh] object-contain rounded-2xl"
              style={{ boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Contador + miniaturas */}
            <div
              className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs font-bold text-white/80 tabular-nums">
                {lightbox.idx + 1} / {lightbox.images.length}
              </span>
              {lightbox.images.length > 1 && (
                <div className="flex gap-2 justify-center flex-wrap px-4">
                  {lightbox.images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      onClick={() => setLightbox((lb) => (lb ? { ...lb, idx: i } : lb))}
                      className="h-14 w-14 rounded-xl overflow-hidden transition-all"
                      style={{
                        outline: i === lightbox.idx ? '3px solid #EC4899' : '2px solid rgba(255,255,255,0.15)',
                        outlineOffset: '2px',
                        opacity: i === lightbox.idx ? 1 : 0.55,
                      }}
                      aria-label={`Ir a foto ${i + 1}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
