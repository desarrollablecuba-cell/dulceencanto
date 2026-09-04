'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CalendarHeart, ArrowRight, Eye, MessageCircle, Share2, X, ZoomIn, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyStore } from '@/store/currency-store';
import { USD_RATE } from '@/store/currency-store';
import type { ServiceVariant } from '@/lib/service-variants';
import { variantEffectiveUsd, serviceFromUsd } from '@/lib/service-variants';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  image?: string;
  price: number;
  priceUsd: number;
  category: string;
  /** V52.5 — variantes activas del servicio (foto + precio propios). */
  variants?: ServiceVariant[];
}

const CATEGORY_LABELS: Record<string, string> = {
  decoracion: 'Decoración',
  entretenimiento: 'Entretenimiento',
  personalizado: 'Personalizado',
  suenos_sorpresa: 'Sueños Sorpresa',
};

const CATEGORY_EMOJIS: Record<string, string> = {
  decoracion: '🎨',
  entretenimiento: '🎪',
  personalizado: '✨',
  suenos_sorpresa: '🙀',
};

const CATEGORY_COLORS: Record<string, string> = {
  decoracion: '#A855F7',
  entretenimiento: '#EC4899',
  personalizado: '#F59E0B',
  suenos_sorpresa: '#8B5CF6',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('es-CU');

export function ServicesSection({ onReserve }: { onReserve?: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>('todos');
  const [search, setSearch] = useState(''); // búsqueda por texto (V52.3)
  const [quickView, setQuickView] = useState<Service | null>(null);
  const [selVariantId, setSelVariantId] = useState<string | null>(null); // variante elegida en el modal (V52.5)
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [zoom, setZoom] = useState(false); // lightbox a pantalla completa desde el modal de detalle
  const [expanded, setExpanded] = useState(false); // "Ver más" (V52.4) — por defecto 8 cards
  // Moneda global (sincronizada con el Header). Ya no hay toggle local.
  const currency = useCurrencyStore((s) => s.currency);
  const { toast } = useToast();

  const openReservation = () => {
    if (onReserve) onReserve();
    else window.dispatchEvent(new Event('dulce-encanto:open-reservation'));
  };

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setServices(data); })
      .catch(() => {})
      .finally(() => setLoaded(true));
    // WhatsApp para "consultar" desde el detalle (número del Footer)
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((cfg) => { if (cfg?.whatsappNumber) setWhatsapp(String(cfg.whatsappNumber)); })
      .catch(() => {});
  }, []);

  // Categorías presentes (con conteo) para los chips de filtro
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) counts.set(s.category, (counts.get(s.category) || 0) + 1);
    return Array.from(counts.entries())
      .map(([id, n]) => ({ id, n, label: CATEGORY_LABELS[id] || id, emoji: CATEGORY_EMOJIS[id] || '✨', color: CATEGORY_COLORS[id] || '#A855F7' }))
      .sort((a, b) => b.n - a.n);
  }, [services]);

  const visible = useMemo(() => {
    // Búsqueda por texto (nombre + descripción, sin mayúsculas/minúsculas)
    const q = search.trim().toLowerCase();
    const byText = q
      ? services.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            (CATEGORY_LABELS[s.category] || '').toLowerCase().includes(q)
        )
      : services;
    return filter === 'todos' ? byText : byText.filter((s) => s.category === filter);
  }, [services, filter, search]);

  // "Ver más" (V52.4): mostrar los primeros PAGE_SIZE y expandir bajo demanda.
  // Al filtrar o buscar se colapsa de nuevo (menos ruido para el usuario).
  const PAGE_SIZE = 8;
  const shown = expanded ? visible : visible.slice(0, PAGE_SIZE);
  const hiddenCount = visible.length - Math.min(PAGE_SIZE, visible.length);

  const setFilterAndCollapse = (id: string) => { setFilter(id); setExpanded(false); };
  const setSearchAndCollapse = (v: string) => { setSearch(v); setExpanded(false); };

  // V52.5 — helpers de variantes
  const activeVariants = (s: Service): ServiceVariant[] => (s.variants ?? []).filter((v) => v.active);
  /** Foto que muestra la card: la del servicio o la 1ª variante con foto. */
  const cardImage = (s: Service): string | undefined => {
    if (s.image) return s.image;
    return activeVariants(s).find((v) => v.image)?.image;
  };
  /** Precio "Desde" (USD) considerando variantes con precio propio. */
  const fromUsd = (s: Service): number => serviceFromUsd(s.priceUsd, activeVariants(s));
  /** Precio "Desde" en la moneda activa. */
  const fromPrice = (s: Service): number =>
    currency === 'CUP' ? Math.round(fromUsd(s) * USD_RATE) : fromUsd(s);

  const waLink = (msg: string) =>
    `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;

  // ── Skeleton shimmer mientras cargan los servicios ──
  const SkeletonCard = () => (
    <div className="overflow-hidden rounded-2xl" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
      <div className="shimmer-bg" style={{ aspectRatio: '3 / 4' }} />
      <div className="p-3.5 space-y-2">
        <div className="shimmer-bg h-4 rounded w-3/4" />
        <div className="shimmer-bg h-3 rounded w-full" />
        <div className="shimmer-bg h-3 rounded w-5/6" />
      </div>
    </div>
  );

  if (loaded && services.length === 0) return null;

  return (
    <section id="servicios" className="py-16 relative" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF5FF 100%)' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-3 px-4 py-1.5 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>
            <Sparkles className="h-3.5 w-3.5" /> Servicios para Eventos
          </span>
          <h2 className="font-bold" style={{ fontSize: '32px', color: '#2E1065', fontFamily: 'Georgia, serif', textShadow: '0 1px 2px rgba(236,72,153,0.15)' }}>
            Hacemos realidad tu celebración
          </h2>
          <p className="mt-3 max-w-2xl mx-auto" style={{ fontSize: '15px', lineHeight: 1.6, color: '#6B7280' }}>
            Decoración, entretenimiento y detalles personalizados con fotos reales de nuestro trabajo. Combina los servicios que necesites para un evento inolvidable.
          </p>
        </div>

        {/* Chips de filtro por categoría (con conteo) */}
        {loaded && categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-5" role="tablist" aria-label="Filtrar servicios por categoría">
            <button
              role="tab"
              aria-selected={filter === 'todos'}
              onClick={() => setFilterAndCollapse('todos')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${filter === 'todos' ? 'text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}
              style={filter === 'todos'
                ? { background: 'linear-gradient(135deg, #7E22CE 0%, #EC4899 100%)' }
                : { background: '#F5F3FF', border: '1px solid #E9D5FF' }}
            >
              ✨ Todos <span className="ml-1 opacity-75">({services.length})</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={filter === c.id}
                onClick={() => setFilterAndCollapse(c.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${filter === c.id ? 'text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}
                style={filter === c.id
                  ? { background: `linear-gradient(135deg, ${c.color} 0%, ${c.color}CC 100%)` }
                  : { background: '#F5F3FF', border: '1px solid #E9D5FF' }}
              >
                {c.emoji} {c.label} <span className="ml-1 opacity-75">({c.n})</span>
              </button>
            ))}
          </div>
        )}

        {/* Búsqueda de servicios por texto (V52.3) */}
        {loaded && services.length > 0 && (
          <div className="flex justify-center mb-8">
            <div
              className="relative w-full max-w-md transition-shadow duration-200 focus-within:shadow-lg"
              style={{ background: '#FFF', border: '1.5px solid #E9D5FF', borderRadius: '999px' }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0" style={{ color: '#A855F7' }} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearchAndCollapse(e.target.value)}
                placeholder="Buscar servicio (ej: payasita, globos, sublimación…)"
                aria-label="Buscar servicios por nombre o descripción"
                className="w-full bg-transparent pl-11 pr-10 py-2.5 text-sm outline-none"
                style={{ color: '#2E1065', borderRadius: '999px' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearchAndCollapse('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-purple-50"
                  style={{ color: '#9CA3AF' }}
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grid de servicios — cards VERTICALES con imagen protagonista */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {!loaded && [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonCard key={`sk-${i}`} />)}
          {loaded && shown.map((s, i) => {
            const color = CATEGORY_COLORS[s.category] || '#A855F7';
            const variants = activeVariants(s);
            const img = cardImage(s);
            const price = fromPrice(s);
            const symbol = currency === 'CUP' ? '₱' : '$';
            return (
              <motion.div
                key={`${filter}-${s.id}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.35), ease: 'easeOut' }}
                className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1.5"
                style={{
                  background: '#FFF',
                  border: '1px solid #FBCFE8',
                  boxShadow: '0 4px 14px -2px rgba(236,72,153,0.08)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 14px 32px -8px ${color}44`; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px -2px rgba(236,72,153,0.08)'; }}
              >
                {/* Imagen protagonista (vertical, ~65% de la card) — clic = ver detalle */}
                <button
                  type="button"
                  onClick={() => { setQuickView(s); setSelVariantId(null); }}
                  className="relative w-full overflow-hidden text-left cursor-pointer"
                  style={{ aspectRatio: '3 / 4', background: `linear-gradient(160deg, ${color}26 0%, ${color}0D 100%)` }}
                  aria-label={`Ver detalle de ${s.name}`}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={`${s.name} — foto real de Dulce Encanto`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center">
                      <span className="transition-transform duration-300 group-hover:scale-110" style={{ fontSize: '64px', filter: 'drop-shadow(0 6px 14px rgba(46,16,101,0.22))' }}>
                        {s.icon}
                      </span>
                    </span>
                  )}
                  {/* Scrim inferior para legibilidad del badge */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(46,16,101,0.45) 100%)' }}
                    aria-hidden
                  />
                  {/* Hint "Ver detalle" (aparece en hover / siempre en táctil) */}
                  <span
                    className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(46,16,101,0.55)', backdropFilter: 'blur(4px)' }}
                  >
                    <Eye className="h-3 w-3" /> Ver detalle
                  </span>
                  {/* Badge de categoría sobre la imagen */}
                  <span
                    className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: 'rgba(46,16,101,0.78)', backdropFilter: 'blur(4px)' }}
                  >
                    {CATEGORY_EMOJIS[s.category] || ''} {CATEGORY_LABELS[s.category] || s.category}
                  </span>
                  {/* ⭐ V52.5 — badge de variantes disponibles */}
                  {variants.length > 0 && (
                    <span
                      className="absolute top-2.5 left-2.5 mt-7 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 4px 10px rgba(236,72,153,0.45)' }}
                    >
                      🎭 {variants.length} {variants.length === 1 ? 'variante' : 'variantes'}
                    </span>
                  )}
                  {/* Precio destacado sobre la imagen */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        Desde
                      </span>
                      <span className="font-bold text-white leading-tight drop-shadow-md" style={{ fontSize: '19px', fontFamily: 'Georgia, serif' }}>
                        {symbol}{fmt(price)}
                      </span>
                    </span>
                  </div>
                </button>

                {/* Contenido */}
                <div className="flex flex-col flex-1 p-3.5">
                  <h3 className="font-semibold leading-snug line-clamp-2" style={{ fontSize: '14px', color: '#2E1065', fontFamily: 'Georgia, serif', minHeight: '2.4em' }}>
                    {s.name}
                  </h3>
                  <p className="text-xs mt-1.5 line-clamp-3 flex-1" style={{ color: '#6B7280', lineHeight: 1.55 }}>
                    {s.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        toast({ title: '✓ Servicio añadido', description: `${s.name} — lo incluirás en tu reserva de evento`, duration: 2500 });
                        openReservation();
                      }}
                      className="card-cta flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-95"
                      style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`, boxShadow: `0 4px 12px ${color}55` }}
                      aria-label={`Reservar ${s.name}`}
                    >
                      <CalendarHeart className="h-3.5 w-3.5" /> Reservar
                    </button>
                    <button
                      onClick={() => setQuickView(s)}
                      className="card-cta inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-500 transition-all hover:scale-105 hover:text-purple-700 active:scale-95"
                      style={{ background: '#F5F3FF', border: '1px solid #E9D5FF' }}
                      aria-label={`Ver detalle de ${s.name}`}
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Mensaje cuando el filtro/búsqueda no arroja resultados */}
          {loaded && (filter !== 'todos' || search.trim() !== '') && visible.length === 0 && (
            <div className="col-span-full text-center py-12">
              <span className="text-5xl">🧁</span>
              <p className="mt-3 text-sm font-semibold" style={{ color: '#6B7280' }}>
                {search.trim() !== ''
                  ? `No encontramos servicios para «${search.trim()}».`
                  : 'No hay servicios en esta categoría todavía.'}
              </p>
              <div className="mt-2 flex items-center justify-center gap-3 flex-wrap">
                {search.trim() !== '' && (
                  <button onClick={() => setSearchAndCollapse('')} className="text-xs font-bold underline" style={{ color: '#7E22CE' }}>
                    Limpiar búsqueda
                  </button>
                )}
                {filter !== 'todos' && (
                  <button onClick={() => setFilterAndCollapse('todos')} className="text-xs font-bold underline" style={{ color: '#7E22CE' }}>
                    Ver todos los servicios
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* "Ver más / Ver menos" (V52.4) + contador de resultados al filtrar */}
        {loaded && (
          <div className="mt-6 flex flex-col items-center gap-2.5">
            {(filter !== 'todos' || search.trim() !== '') && visible.length > 0 && (
              <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }} aria-live="polite">
                Mostrando {shown.length} de {visible.length} {visible.length === 1 ? 'servicio' : 'servicios'}
              </p>
            )}
            {hiddenCount > 0 && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
                style={{ background: '#FFF', border: '1.5px solid #E9D5FF', color: '#7E22CE', boxShadow: '0 4px 12px -4px rgba(168,85,247,0.25)' }}
                aria-label={`Ver ${hiddenCount} servicios más`}
              >
                <ChevronDown className="h-4 w-4" /> Ver {hiddenCount} {hiddenCount === 1 ? 'servicio más' : 'servicios más'}
              </button>
            )}
            {expanded && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => { setExpanded(false); document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
                style={{ background: '#F5F3FF', border: '1px solid #E9D5FF', color: '#6B7280' }}
                aria-label="Ver menos servicios"
              >
                <ChevronUp className="h-4 w-4" /> Ver menos
              </button>
            )}
          </div>
        )}

        {/* Indicador de moneda (informativo — el toggle global está en el Header) */}
        {loaded && services.length > 0 && (
          <p className="mt-6 text-center text-[11px] font-semibold" style={{ color: '#9CA3AF' }} aria-live="polite">
            Precios mostrados en {currency === 'CUP' ? '₱ CUP' : '$ USD (Zelle)'} · cambia la moneda desde el encabezado
          </p>
        )}

        {/* CTA Reserva de Evento */}
        <div className="mt-10 text-center">
          <div className="inline-block rounded-3xl p-8 sm:p-10 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
            <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #F472B6 0%, transparent 70%)' }} aria-hidden />
            <h3 className="font-bold text-white mb-2 relative" style={{ fontSize: '24px', fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
              ¿Planeas un evento especial?
            </h3>
            <p className="text-sm mb-5 max-w-md mx-auto relative" style={{ color: '#E9D5FF', lineHeight: 1.6 }}>
              Reserva tu fecha y elige todo lo que necesitas: tartas, servicios y decoración. Te confirmamos por WhatsApp.
            </p>
            <button
              onClick={openReservation}
              className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 8px 20px -4px rgba(236,72,153,0.5)' }}
            >
              <CalendarHeart className="h-4 w-4" /> Reservar mi evento
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal "Ver detalle" del servicio ── */}
      <Dialog open={Boolean(quickView)} onOpenChange={(open) => { if (!open) setQuickView(null); }}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden gap-0" style={{ background: '#FFF', border: '1px solid #FBCFE8', borderRadius: '20px' }}>
          {quickView && (() => {
            const color = CATEGORY_COLORS[quickView.category] || '#A855F7';
            // V52.5 — variantes y selección actual
            const variants = activeVariants(quickView);
            const selVariant = variants.find((v) => v.id === selVariantId) || null;
            const modalImg = selVariant?.image || quickView.image || variants.find((v) => v.image)?.image;
            const shownUsd = selVariant ? variantEffectiveUsd(selVariant, quickView.priceUsd) : (variants.length ? serviceFromUsd(quickView.priceUsd, variants) : quickView.priceUsd);
            const price = currency === 'CUP' ? Math.round(shownUsd * USD_RATE) : shownUsd;
            const otherUsd = shownUsd;
            const other = currency === 'CUP' ? otherUsd : Math.round(otherUsd * USD_RATE);
            const symbol = currency === 'CUP' ? '₱' : '$';
            const otherSymbol = currency === 'CUP' ? '$' : '₱';
            const otherLabel = currency === 'CUP' ? 'USD (Zelle)' : 'CUP';
            return (
              <div className="grid sm:grid-cols-[minmax(0,45%)_minmax(0,55%)] max-h-[88vh]">
                {/* Foto grande (clic → lightbox a pantalla completa) */}
                <div className="relative overflow-hidden max-h-[38vh] sm:max-h-[88vh]" style={{ background: `linear-gradient(160deg, ${color}26 0%, ${color}0D 100%)` }}>
                  {modalImg ? (
                    <button
                      type="button"
                      onClick={() => setZoom(true)}
                      className="w-full h-full cursor-zoom-in relative group/img"
                      aria-label={`Ampliar foto de ${quickView.name}`}
                    >
                      <img
                        src={modalImg}
                        alt={`${quickView.name}${selVariant ? ` — ${selVariant.name}` : ''} — foto real de Dulce Encanto`}
                        className="w-full h-full object-cover"
                      />
                      {/* Hint de zoom */}
                      <span className="absolute bottom-14 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold text-white opacity-0 group-hover/img:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(46,16,101,0.6)', backdropFilter: 'blur(4px)' }}>
                        <ZoomIn className="h-3.5 w-3.5" /> Ampliar
                      </span>
                    </button>
                  ) : (
                    <div className="w-full h-full min-h-[240px] flex items-center justify-center">
                      <span style={{ fontSize: '88px', filter: 'drop-shadow(0 8px 18px rgba(46,16,101,0.25))' }}>{quickView.icon}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(46,16,101,0.5) 100%)' }} aria-hidden />
                  <span
                    className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: 'rgba(46,16,101,0.78)', backdropFilter: 'blur(4px)' }}
                  >
                    {CATEGORY_EMOJIS[quickView.category] || ''} {CATEGORY_LABELS[quickView.category] || quickView.category}
                  </span>
                  <button
                    onClick={() => setQuickView(null)}
                    className="sm:hidden absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'rgba(46,16,101,0.6)' }}
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Contenido */}
                <div className="flex flex-col p-5 sm:p-7 overflow-y-auto">
                  <DialogTitle className="font-bold leading-tight pr-6" style={{ fontSize: '24px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
                    {quickView.name}
                  </DialogTitle>
                  <p className="text-sm mt-3" style={{ color: '#6B7280', lineHeight: 1.65 }}>
                    {quickView.description}
                  </p>

                  {/* ⭐ V52.5 — Selector de variantes (foto + nombre c/u) */}
                  {variants.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#7E22CE' }}>
                        🎭 Elige tu variante {!selVariant && <span className="font-normal normal-case tracking-normal text-gray-400">(opcional — mira las fotos)</span>}
                      </p>
                      <div className="flex gap-2.5 overflow-x-auto pb-2 nice-scroll" role="tablist" aria-label={`Variantes de ${quickView.name}`}>
                        {variants.map((v) => {
                          const sel = v.id === selVariantId;
                          return (
                            <button
                              key={v.id}
                              role="tab"
                              aria-selected={sel}
                              onClick={() => setSelVariantId(sel ? null : v.id)}
                              className="shrink-0 w-[86px] rounded-2xl overflow-hidden text-center transition-all hover:-translate-y-0.5"
                              style={{
                                background: sel ? 'linear-gradient(160deg, #FDF2F8 0%, #F3E8FF 100%)' : '#FAFAFA',
                                border: sel ? '2px solid #EC4899' : '1.5px solid #E9D5FF',
                                boxShadow: sel ? '0 8px 18px -6px rgba(236,72,153,0.45)' : 'none',
                              }}
                            >
                              <span className="block w-full aspect-[3/4] overflow-hidden" style={{ background: '#F3E8FF' }}>
                                {v.image ? (
                                  <img src={v.image} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <span className="w-full h-full flex items-center justify-center text-xl">🎭</span>
                                )}
                              </span>
                              <span className="block px-1 pt-1 pb-1.5 text-[10px] font-bold leading-tight" style={{ color: sel ? '#BE185D' : '#6B7280' }}>
                                {v.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Precios (ambas monedas) */}
                  <div className="mt-5 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)', border: '1px solid #E9D5FF' }}>
                    <span className="block text-[10px] uppercase tracking-widest font-bold" style={{ color: '#7E22CE' }}>{selVariant ? 'Precio de la variante' : 'Desde'}</span>
                    <span className="font-bold leading-tight" style={{ fontSize: '30px', color: '#BE185D', fontFamily: 'Georgia, serif' }}>
                      {symbol}{fmt(price)}
                    </span>
                    <span className="text-xs font-semibold ml-2" style={{ color: '#9CA3AF' }}>
                      ≈ {otherSymbol}{fmt(other)} {otherLabel}
                    </span>
                    <p className="text-[11px] mt-1.5" style={{ color: '#9CA3AF' }}>
                      Precio orientativo — el presupuesto final se confirma según los detalles de tu evento.
                    </p>
                  </div>

                  {/* CTAs */}
                  <div className="mt-5 flex flex-col gap-2.5">
                    <button
                      onClick={() => {
                        setQuickView(null);
                        toast({ title: '✓ Servicio añadido', description: `${quickView.name}${selVariant ? ` (${selVariant.name})` : ''} — lo incluirás en tu reserva de evento`, duration: 2500 });
                        openReservation();
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: `linear-gradient(135deg, ${color} 0%, #7E22CE 100%)`, boxShadow: `0 8px 20px -6px ${color}66` }}
                    >
                      <CalendarHeart className="h-4 w-4" /> Reservar este servicio
                    </button>
                    {whatsapp && (
                      <a
                        href={waLink(`¡Hola Dulce Encanto! 👋 Quiero consultar por el servicio "${quickView.name}"${selVariant ? ` — variante ${selVariant.name}` : ''}. ¿Me pueden dar más detalles?`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: '#FFF', border: '2px solid #25D366', color: '#128C7E' }}
                      >
                        <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                      </a>
                    )}
                    {/* Compartir servicio (V52.4) — WhatsApp con nombre + precio "desde" */}
                    {whatsapp && (
                      <a
                        href={waLink(`Mira este servicio de Dulce Encanto ✨:\n• ${quickView.name}${selVariant ? ` — ${selVariant.name}` : ''}\n• Desde ${symbol}${fmt(price)} ${currency === 'CUP' ? 'CUP' : 'USD'}\n\n¡Reserva tu fecha! 🎉`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: '#F5F3FF', border: '1.5px solid #E9D5FF', color: '#7E22CE' }}
                      >
                        <Share2 className="h-4 w-4" /> Compartir servicio
                      </a>
                    )}
                  </div>

                  <p className="mt-4 text-[11px] text-center" style={{ color: '#9CA3AF' }}>
                    ✦ Foto real de nuestro trabajo · confirmamos disponibilidad por WhatsApp
                  </p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ LIGHTBOX: foto del servicio/variante a pantalla completa ═══ */}
      <AnimatePresence>
        {zoom && quickView && (() => {
          const variants = activeVariants(quickView);
          const selVariant = variants.find((v) => v.id === selVariantId) || null;
          const lbImg = selVariant?.image || quickView.image || variants.find((v) => v.image)?.image;
          if (!lbImg) return null;
          return (
          <motion.div
            key="service-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] flex items-center justify-center"
            style={{ background: 'rgba(10, 5, 16, 0.97)' }}
            onClick={() => setZoom(false)}
            role="dialog"
            aria-label={`Foto ampliada de ${quickView.name}`}
          >
            <button
              className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
              onClick={() => setZoom(false)}
              aria-label="Cerrar vista ampliada"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              key={lbImg}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              src={lbImg}
              alt={`${quickView.name}${selVariant ? ` — ${selVariant.name}` : ''} — foto ampliada de Dulce Encanto`}
              className="max-w-[94vw] max-h-[90vh] object-contain rounded-2xl"
              style={{ boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}
              onClick={(e) => e.stopPropagation()}
            />
            {/* Pie con nombre del servicio */}
            <div className="absolute bottom-5 left-0 right-0 text-center px-6" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-bold text-white/90" style={{ fontFamily: 'Georgia, serif' }}>
                {quickView.icon} {quickView.name}{selVariant && <span className="opacity-80"> · {selVariant.name}</span>}
              </p>
              <p className="text-[11px] text-white/60 mt-1">Foto real de nuestro trabajo · Dulce Encanto</p>
            </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </section>
  );
}
