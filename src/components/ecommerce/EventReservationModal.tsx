'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarHeart, Sparkles, User, Phone, Mail, Check, ChevronRight, ChevronLeft, Search, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ServiceVariant } from '@/lib/service-variants';
import { variantEffectiveUsd } from '@/lib/service-variants';

interface Service {
  id: string;
  name: string;
  icon: string;
  image?: string;
  price: number;
  priceUsd: number;
  category: string;
  /** V52.5 — variantes activas (foto + precio propios). */
  variants?: ServiceVariant[];
}

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  featured: boolean;
  saleUnit?: string;
  reservationDays?: number;
  buffetEnabled?: boolean;
  /** V52.8 — precio de la docena del buffet (USD). */
  buffetPriceUsd?: number;
  categoryId: string;
  category: { id: string; name: string; icon: string };
}

interface EventReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EVENT_TYPES = [
  { id: '15_anos', label: '15 Años', emoji: '🎀', desc: 'Quinceañera soñada' },
  { id: 'cumple_ninos', label: 'Cumpleaños Infantil', emoji: '🧸', desc: 'Para los más pequeños' },
  { id: 'cumple_adultos', label: 'Cumpleaños Adulto', emoji: '🥂', desc: 'Celebración con estilo' },
  { id: 'boda', label: 'Boda', emoji: '💍', desc: 'El gran día' },
  { id: 'bautizo', label: 'Bautizo', emoji: '👼', desc: 'Bienvenida especial' },
  { id: 'otro', label: 'Otro Evento', emoji: '✨', desc: 'Cuéntanos tu idea' },
];

const PAYMENT_METHODS = [
  { id: 'zelle', label: 'Zelle (USD)', desc: 'Pago desde el exterior', emoji: '💵' },
  { id: 'cup', label: 'Efectivo CUP', desc: 'Pago en Cuba', emoji: '₱' },
  { id: 'mixto', label: 'Mixto', desc: 'Parte Zelle + parte CUP', emoji: '🔀' },
];

const USD_RATE = 700;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function prettyDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CU', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function EventReservationModal({ open, onOpenChange }: EventReservationModalProps) {
  // V52.7 — orden de pasos: la SELECCIÓN va antes de la FECHA para poder
  // calcular la fecha más cercana reservable a partir de la antelación
  // máxima de todos los productos/servicios elegidos.
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('todos');
  const { toast } = useToast();

  const [form, setForm] = useState({
    eventType: '',
    eventDate: '',
    eventTime: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    guestCount: 0,
    budget: 0,
    paymentMethod: '',
    notes: '',
  });
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({}); // serviceId → variantId (V52.5)
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    fetch('/api/services').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setServices(d); }).catch(() => {});
    // V52.7 — catálogo COMPLETO de reservables (tortas, pasteles, dulces finos
    // y el grupo Buffet para Repartir), no solo los destacados.
    fetch('/api/products?catalog=reservation&take=300').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setProducts(d); }).catch(() => {});
  }, [open]);

  // ── V52.8 — helpers de precio del BUFFET (docena en USD) ──
  // Los productos del grupo "Buffet para Repartir" se venden por docena a
  // buffetPriceUsd USD (30 por defecto), igual que los dulces finos.
  const buffetUsd = (p: Product): number => Number(p.buffetPriceUsd) || 30;
  const productUsd = (p: Product): number => (p.buffetEnabled ? buffetUsd(p) : Math.round((p.price / 700) * 100) / 100);
  const productCup = (p: Product): number => (p.buffetEnabled ? Math.round(buffetUsd(p) * 700) : p.price);
  const productIsDozen = (p: Product): boolean => p.buffetEnabled === true || p.saleUnit === 'docena';

  // ── V52.7 — antelación máxima de la selección ──
  // La fecha más cercana a reservar = hoy + mayor reservationDays de los
  // productos del pedido (los servicios no requieren antelación).
  const maxLeadDays = useMemo(() => {
    let max = 0;
    for (const [id, qty] of Object.entries(selectedProducts)) {
      if (qty <= 0) continue;
      const p = products.find((x) => x.id === id);
      if (p && Number(p.reservationDays || 0) > max) max = Number(p.reservationDays);
    }
    return max;
  }, [selectedProducts, products]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const minDate = useMemo(() => addDays(todayStr, maxLeadDays), [todayStr, maxLeadDays]);

  const reset = () => {
    setStep(0);
    setDone(false);
    setQuery('');
    setGroup('todos');
    setForm({ eventType: '', eventDate: '', eventTime: '', customerName: '', customerEmail: '', customerPhone: '', guestCount: 0, budget: 0, paymentMethod: '', notes: '' });
    setSelectedServices({});
    setSelectedVariants({});
    setSelectedProducts({});
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const toggleItem = (type: 'service' | 'product', id: string) => {
    const state = type === 'service' ? selectedServices : selectedProducts;
    const setState = type === 'service' ? setSelectedServices : setSelectedProducts;
    setState({ ...state, [id]: state[id] ? 0 : 1 });
    // Al quitar un servicio, también limpiamos su variante elegida
    if (type === 'service' && state[id]) {
      const next = { ...selectedVariants };
      delete next[id];
      setSelectedVariants(next);
    }
  };

  /** V52.5 — precio USD efectivo de un servicio según la variante elegida. */
  const serviceUsd = (s: Service): number => {
    const variants = (s.variants ?? []).filter((v) => v.active);
    const sel = variants.find((v) => v.id === selectedVariants[s.id]);
    return sel ? variantEffectiveUsd(sel, s.priceUsd) : s.priceUsd;
  };

  /** V52.5 — nombre del ítem con la variante elegida. */
  const serviceItemName = (s: Service): string => {
    const variants = (s.variants ?? []).filter((v) => v.active);
    const sel = variants.find((v) => v.id === selectedVariants[s.id]);
    return sel ? `${s.name} — ${sel.name}` : s.name;
  };

  /** V52.7 — miniatura del ítem: foto de la variante o del servicio. */
  const serviceItemImage = (s: Service): string => {
    const variants = (s.variants ?? []).filter((v) => v.active);
    const sel = variants.find((v) => v.id === selectedVariants[s.id]);
    return (sel?.image || (s as any).image || '') as string;
  };

  const setQty = (type: 'service' | 'product', id: string, qty: number) => {
    const state = type === 'service' ? selectedServices : selectedProducts;
    const setState = type === 'service' ? setSelectedServices : setSelectedProducts;
    setState({ ...state, [id]: Math.max(0, qty) });
  };

  const removeItem = (type: 'service' | 'product', id: string) => {
    if (type === 'service') {
      setSelectedServices((cur) => { const n = { ...cur }; delete n[id]; return n; });
      setSelectedVariants((cur) => { const n = { ...cur }; delete n[id]; return n; });
    } else {
      setSelectedProducts((cur) => { const n = { ...cur }; delete n[id]; return n; });
    }
  };

  // ── V52.7 — grupos y búsqueda para la selección visual ──
  const buffetProducts = useMemo(() => products.filter((p) => p.buffetEnabled), [products]);
  const categoryGroups = useMemo(() => {
    const map: Record<string, { name: string; icon: string; products: Product[] }> = {};
    for (const p of products) {
      if (p.buffetEnabled) continue; // los del buffet van en su propio grupo
      const key = p.categoryId;
      if (!map[key]) map[key] = { name: p.category?.name || 'Productos', icon: p.category?.icon || '🍰', products: [] };
      map[key].products.push(p);
    }
    return map;
  }, [products]);

  const matchesQuery = (name: string): boolean => {
    if (!query.trim()) return true;
    return name.toLowerCase().includes(query.trim().toLowerCase());
  };

  const visibleServices = useMemo(
    () => services.filter((s) => matchesQuery(s.name)),
    [services, query]
  );
  const visibleBuffet = useMemo(
    () => buffetProducts.filter((p) => matchesQuery(p.name)),
    [buffetProducts, query]
  );
  const visibleCategory = useMemo(() => {
    if (!(group in categoryGroups)) return [];
    return categoryGroups[group].products.filter((p) => matchesQuery(p.name));
  }, [group, categoryGroups, query]);

  const totalCup =
    Object.entries(selectedServices).reduce((sum, [id, qty]) => {
      const s = services.find((x) => x.id === id);
      return sum + (s ? Math.round(serviceUsd(s) * 700) * qty : 0);
    }, 0) +
    Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
      const p = products.find((x) => x.id === id);
      return sum + (p ? productCup(p) * qty : 0);
    }, 0);

  const totalUsd =
    Object.entries(selectedServices).reduce((sum, [id, qty]) => {
      const s = services.find((x) => x.id === id);
      return sum + (s ? serviceUsd(s) * qty : 0);
    }, 0) +
    Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
      const p = products.find((x) => x.id === id);
      return sum + (p ? productUsd(p) * qty : 0);
    }, 0);

  const itemCount =
    Object.values(selectedServices).filter((q) => q > 0).length +
    Object.values(selectedProducts).filter((q) => q > 0).length;

  const canNext = () => {
    if (step === 0) return !!form.eventType;
    if (step === 1) return itemCount > 0;
    if (step === 2) return !!form.eventDate && form.eventDate >= minDate;
    if (step === 3) return !!form.customerName && !!form.customerPhone && !!form.paymentMethod;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const items = [
      ...Object.entries(selectedServices).filter(([, q]) => q > 0).map(([id, qty]) => {
        const s = services.find((x) => x.id === id)!;
        const usd = serviceUsd(s);
        return { itemType: 'service', itemId: id, name: serviceItemName(s), quantity: qty, priceCup: Math.round(usd * 700), priceUsd: usd, image: serviceItemImage(s) };
      }),
      ...Object.entries(selectedProducts).filter(([, q]) => q > 0).map(([id, qty]) => {
        const p = products.find((x) => x.id === id)!;
        const isBuffet = p.buffetEnabled === true;
        const cup = productCup(p);
        const usd = productUsd(p);
        // V52.8 — el buffet se reserva por docena: dejarlo claro en el nombre
        const name = isBuffet ? `${p.name} — Docena` : (p.saleUnit === 'docena' ? `${p.name} — Docena` : p.name);
        return { itemType: 'product', itemId: id, name, quantity: qty, priceCup: cup, priceUsd: usd, image: p.image };
      }),
    ];

    try {
      const res = await fetch('/api/event-reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setDone(true);
      toast({ title: '🎉 ¡Reserva enviada!', description: 'Te contactaremos por WhatsApp para confirmar.', duration: 4000 });
      // Abrir WhatsApp del negocio con el mensaje de la reserva
      if (data.whatsappUrl) {
        setTimeout(() => window.open(data.whatsappUrl, '_blank'), 1500);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // V52.7 — pasos: Evento → Selección → Fecha → Contacto → Confirmar
  const steps = ['Evento', 'Selección', 'Fecha', 'Contacto', 'Confirmar'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(46,16,101,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            /* V52.8 — APROVECHA LAS PANTALLAS: max-w-6xl (antes 2xl) y
               altura casi completa. En móvil es prácticamente a pantalla
               completa. El paso de Selección usa 2 columnas en desktop. */
            className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-6xl h-[100dvh] sm:h-[94vh] sm:max-h-[94vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Reservar evento"
          >
            {/* Header */}
            <div className="relative px-4 sm:px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
              <button onClick={handleClose} className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2.5 mb-1 flex-wrap pr-12">
                <CalendarHeart className="h-5 w-5 text-pink-300" />
                <h2 className="font-bold text-white" style={{ fontSize: '20px', fontFamily: 'Georgia, serif' }}>
                  {done ? '¡Reserva Enviada!' : 'Reservar Evento'}
                </h2>
                {/* Antelación en vivo, siempre visible */}
                {!done && maxLeadDays > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white ml-1 flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.35)', border: '1px solid rgba(253,230,138,0.5)' }}>
                    <Clock className="h-3 w-3" /> {maxLeadDays} {maxLeadDays === 1 ? 'día' : 'días'} de antelación
                  </span>
                )}
              </div>
              {!done && (
                <p className="text-xs" style={{ color: '#E9D5FF' }}>
                  Paso {step + 1} de {steps.length}: <strong className="text-white">{steps[step]}</strong>
                </p>
              )}
            </div>

            {/* Progress bar */}
            {!done && (
              <div className="h-1.5 shrink-0" style={{ background: '#F3E8FF' }}>
                <motion.div
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, #A855F7 0%, #EC4899 100%)' }}
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Body — V52.8: en desktop, 2 columnas (contenido + resumen vivo) */}
            <div className="flex-1 min-h-0 flex">
              {/* Columna izquierda: contenido del paso */}
              <div className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-5 nice-scroll">
                {done ? (
                  <div className="text-center py-8">
                    {/* Success check animado */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', delay: 0.1, stiffness: 200, damping: 15 }}
                      className="relative w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', boxShadow: '0 8px 24px -4px rgba(34,197,94,0.5)' }}
                    >
                      <motion.div
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full"
                        style={{ border: '2px solid #22C55E' }}
                      />
                      <motion.svg
                        width="48"
                        height="48"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <motion.path
                          d="M10 24 L20 34 L38 14"
                          stroke="white"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
                        />
                      </motion.svg>
                    </motion.div>
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="font-bold mb-2"
                      style={{ fontSize: '22px', color: '#2E1065', fontFamily: 'Georgia, serif' }}
                    >
                      ¡Gracias, {form.customerName.split(' ')[0]}!
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="text-sm mb-4 max-w-md mx-auto"
                      style={{ color: '#6B7280' }}
                    >
                      Hemos recibido tu solicitud de reserva para <strong>{EVENT_TYPES.find((e) => e.id === form.eventType)?.label}</strong> el{' '}
                      <strong>{new Date(form.eventDate).toLocaleDateString('es-CU', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.
                      Te contactaremos por WhatsApp al <strong>{form.customerPhone}</strong> para confirmar detalles.
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="rounded-2xl p-4 mx-auto max-w-sm"
                      style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}
                    >
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7E22CE' }}>Resumen</p>
                      <p className="text-sm" style={{ color: '#2E1065' }}>
                        Total estimado: <strong>${totalUsd.toFixed(2)} USD</strong>
                        {totalCup > 0 && <> · <strong>₡{totalCup.toLocaleString('es-CU')}</strong> CUP</>}
                      </p>
                    </motion.div>
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      onClick={handleClose}
                      className="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                    >
                      Cerrar
                    </motion.button>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* STEP 0: Tipo de evento */}
                      {step === 0 && (
                        <div>
                          <p className="text-sm font-medium mb-3" style={{ color: '#2E1065' }}>¿Qué tipo de evento quieres celebrar?</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {EVENT_TYPES.map((et) => (
                              <button
                                key={et.id}
                                onClick={() => setForm({ ...form, eventType: et.id })}
                                className="p-4 rounded-2xl text-center transition-all"
                                style={{
                                  background: form.eventType === et.id ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FDF2F8',
                                  border: form.eventType === et.id ? 'none' : '1px solid #FBCFE8',
                                  color: form.eventType === et.id ? '#FFF' : '#2E1065',
                                }}
                              >
                                <span className="block text-3xl mb-1">{et.emoji}</span>
                                <span className="block text-xs font-semibold">{et.label}</span>
                                <span className="block text-[10px] opacity-80 mt-0.5">{et.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* STEP 1: Selección de servicios + TODOS los productos reservables */}
                      {step === 1 && (
                        <div>
                          {/* Buscador */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#C084FC' }} />
                            <input
                              type="text"
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder="Buscar tortas, dulces finos, servicios…"
                              className="w-full pl-10 pr-9 py-2.5 rounded-xl border focus:outline-none text-sm"
                              style={{ borderColor: '#FBCFE8', color: '#2E1065' }}
                            />
                            {query && (
                              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ color: '#9CA3AF' }} aria-label="Limpiar búsqueda">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {/* Chips de grupo (visualmente fáciles) */}
                          <div className="flex gap-1.5 flex-wrap mb-3">
                            <button
                              onClick={() => setGroup('todos')}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                              style={{
                                background: group === 'todos' ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FAFAFA',
                                color: group === 'todos' ? '#FFF' : '#6B7280',
                                border: group === 'todos' ? 'none' : '1px solid #F3F4F6',
                              }}
                            >
                              ✨ Todo
                            </button>
                            {services.length > 0 && (
                              <button
                                onClick={() => setGroup('servicios')}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                                style={{
                                  background: group === 'servicios' ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FAFAFA',
                                  color: group === 'servicios' ? '#FFF' : '#6B7280',
                                  border: group === 'servicios' ? 'none' : '1px solid #F3F4F6',
                                }}
                              >
                                🎪 Servicios
                              </button>
                            )}
                            {Object.entries(categoryGroups).map(([key, g]) => (
                              <button
                                key={key}
                                onClick={() => setGroup(key)}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                                style={{
                                  background: group === key ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FAFAFA',
                                  color: group === key ? '#FFF' : '#6B7280',
                                  border: group === key ? 'none' : '1px solid #F3F4F6',
                                }}
                              >
                                {g.icon} {g.name}
                              </button>
                            ))}
                            {buffetProducts.length > 0 && (
                              <button
                                onClick={() => setGroup('buffet')}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                                style={{
                                  background: group === 'buffet' ? 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)' : '#FFF7ED',
                                  color: group === 'buffet' ? '#FFF' : '#9A3412',
                                  border: group === 'buffet' ? 'none' : '1px solid #FED7AA',
                                }}
                              >
                                🍽️ Buffet para Repartir
                              </button>
                            )}
                          </div>

                          {/* Contador + antelación */}
                          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
                              {itemCount} {itemCount === 1 ? 'item seleccionado' : 'items seleccionados'}
                            </span>
                            {maxLeadDays > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1" style={{ background: '#FEF3C7', color: '#92400E' }}>
                                <Clock className="h-3 w-3" /> Antelación requerida: {maxLeadDays} {maxLeadDays === 1 ? 'día' : 'días'}
                              </span>
                            )}
                          </div>

                          {/* ── SERVICIOS: V52.8 cards VISUALES con la FOTO REAL ──
                              (antes se mostraba sólo el emoji). El cliente ve
                              la foto protagonista, el precio USD y, al añadir,
                              elige variante con miniaturas. */}
                          {(group === 'todos' || group === 'servicios') && services.length > 0 && (
                            <div className="mb-5">
                              <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1" style={{ color: '#EC4899' }}>
                                <Sparkles className="h-3 w-3" /> Servicios
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                                {visibleServices.map((s) => {
                                  const qty = selectedServices[s.id] || 0;
                                  const variants = (s.variants ?? []).filter((v) => v.active);
                                  const selVar = variants.find((v) => v.id === selectedVariants[s.id]) || null;
                                  const usd = serviceUsd(s);
                                  const photo = serviceItemImage(s);
                                  return (
                                    <div
                                      key={s.id}
                                      className="rounded-2xl overflow-hidden transition-all flex flex-col"
                                      style={{
                                        background: qty > 0 ? '#FDF2F8' : '#FAFAFA',
                                        border: qty > 0 ? '2px solid #EC4899' : '1px solid #F3F4F6',
                        boxShadow: qty > 0 ? '0 10px 20px -8px rgba(236,72,153,0.5)' : 'none',
                                      }}
                                    >
                                      {/* Foto protagonista del servicio */}
                                      <div className="relative aspect-[4/3] overflow-hidden bg-pink-50">
                                        {photo ? (
                                          <img src={photo} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-4xl">{s.icon || '✨'}</div>
                                        )}
                                        {qty > 0 && (
                                          <span
                                            className="absolute top-1.5 right-1.5 min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                                            style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                                          >
                                            {qty}
                                          </span>
                                        )}
                                        {variants.length > 0 && (
                                          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)' }}>
                                            🎭 {variants.length} {variants.length === 1 ? 'variante' : 'variantes'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="p-2 flex flex-col flex-1">
                                        <p className="text-[11px] font-semibold leading-tight line-clamp-2 min-h-[28px]" style={{ color: '#2E1065' }}>
                                          {s.name}
                                          {selVar && <span className="font-normal" style={{ color: '#BE185D' }}> · {selVar.name}</span>}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                                          <strong style={{ color: '#7E22CE' }}>${usd.toFixed(2)}</strong>
                                          <span className="opacity-70 text-[10px]"> · ₡{Math.round(usd * 700).toLocaleString('es-CU')}</span>
                                        </p>
                                        <div className="mt-auto pt-1.5">
                                          {qty > 0 ? (
                                            <div className="flex items-center justify-center gap-2">
                                              <button onClick={() => setQty('service', s.id, qty - 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#FBCFE8', color: '#BE185D' }} aria-label="Quitar uno">−</button>
                                              <span className="text-xs font-bold w-5 text-center" style={{ color: '#2E1065' }}>{qty}</span>
                                              <button onClick={() => setQty('service', s.id, qty + 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#EC4899' }} aria-label="Añadir uno">+</button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => toggleItem('service', s.id)}
                                              className="w-full py-1.5 rounded-full text-[11px] font-bold text-white transition-all hover:opacity-90"
                                              style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                                            >
                                              Añadir
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {/* ⭐ V52.5 — selector de variante (visible al añadir el servicio) */}
                                      {qty > 0 && variants.length > 0 && (
                                        <div className="px-2 pb-2">
                                          <div className="rounded-xl p-2" style={{ background: '#FDF2F8', border: '1px dashed #F9A8D4' }}>
                                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#BE185D' }}>
                                              Elige la variante {selVar ? '✓' : '(opcional)'}
                                            </p>
                                            <div className="flex gap-2 overflow-x-auto pb-1 nice-scroll">
                                              {variants.map((v) => {
                                                const sel = v.id === selectedVariants[s.id];
                                                return (
                                                  <button
                                                    key={v.id}
                                                    onClick={() => setSelectedVariants((prev) => {
                                                      const next = { ...prev };
                                                      if (sel) delete next[s.id]; else next[s.id] = v.id;
                                                      return next;
                                                    })}
                                                    className="shrink-0 w-[72px] rounded-xl overflow-hidden text-center transition-all"
                                                    style={{
                                                      background: '#FFF',
                                                      border: sel ? '2px solid #EC4899' : '1px solid #FBCFE8',
                                                      boxShadow: sel ? '0 6px 14px -4px rgba(236,72,153,0.45)' : 'none',
                                                    }}
                                                    aria-pressed={sel}
                                                    aria-label={`${s.name} — variante ${v.name}`}
                                                  >
                                                    <span className="block w-full aspect-[3/4] overflow-hidden bg-pink-50">
                                                      {v.image ? (
                                                        <img src={v.image} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
                                                      ) : (
                                                        <span className="w-full h-full flex items-center justify-center text-lg">🎭</span>
                                                      )}
                                                    </span>
                                                    <span className="block px-0.5 pt-0.5 pb-1 text-[9px] font-bold leading-tight truncate" style={{ color: sel ? '#BE185D' : '#6B7280' }}>
                                                      {v.name}
                                                    </span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {visibleServices.length === 0 && (
                                <p className="text-xs text-center py-3" style={{ color: '#9CA3AF' }}>No hay servicios que coincidan con «{query}».</p>
                              )}
                            </div>
                          )}

                          {/* Grupo Buffet para Repartir (V52.7 — V52.8 por docena) */}
                          {(group === 'todos' || group === 'buffet') && visibleBuffet.length > 0 && (
                            <div className="mb-5">
                              <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1" style={{ color: '#C2410C' }}>
                                🍽️ Buffet para Repartir <span className="normal-case font-normal text-[10px]">· por docena ($USD)</span>
                              </p>
                              <ProductPickerGrid
                                products={visibleBuffet}
                                selectedProducts={selectedProducts}
                                onToggle={toggleItem}
                                onQty={setQty}
                                accent="amber"
                                priceFn={productUsd}
                                isDozenFn={productIsDozen}
                              />
                            </div>
                          )}

                          {/* Categorías de productos reservables (V52.7 — grid visual con fotos) */}
                          {(group === 'todos' || (group in categoryGroups)) && group !== 'servicios' && group !== 'buffet' && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1" style={{ color: '#7E22CE' }}>
                                🎂 {group === 'todos' ? 'Tartas, Pasteles y Dulces Finos' : categoryGroups[group]?.name}
                              </p>
                              <ProductPickerGrid
                                products={group === 'todos'
                                  ? Object.values(categoryGroups).flatMap((g) => g.products).filter((p) => matchesQuery(p.name))
                                  : visibleCategory}
                                selectedProducts={selectedProducts}
                                onToggle={toggleItem}
                                onQty={setQty}
                                accent="purple"
                                priceFn={productUsd}
                                isDozenFn={productIsDozen}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* STEP 2: Fecha (respeta la antelación de la selección) */}
                      {step === 2 && (
                        <div className="space-y-4 max-w-xl">
                          {/* Aviso de antelación V52.7 */}
                          <div
                            className="rounded-2xl p-4"
                            style={{ background: maxLeadDays > 0 ? '#FEF3C7' : '#F3E8FF', border: maxLeadDays > 0 ? '1px solid #FDE68A' : '1px solid #DDD6FE' }}
                          >
                            <p className="text-sm font-semibold flex items-start gap-2" style={{ color: maxLeadDays > 0 ? '#92400E' : '#6D28D9' }}>
                              <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                              {maxLeadDays > 0 ? (
                                <>
                                  Tu selección incluye productos que requieren hasta <strong>{maxLeadDays} {maxLeadDays === 1 ? 'día' : 'días'}</strong> de elaboración.
                                  La fecha más cercana disponible es <strong>{prettyDate(minDate)}</strong>.
                                </>
                              ) : (
                                <>Tu selección no requiere antelación especial: puedes reservar para mañana mismo.</>
                              )}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Fecha del evento *</label>
                            <input
                              type="date"
                              value={form.eventDate}
                              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                              min={minDate}
                              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none"
                              style={{ borderColor: '#FBCFE8', color: '#2E1065' }}
                            />
                            {form.eventDate && form.eventDate < minDate && (
                              <p className="text-xs mt-1 font-semibold" style={{ color: '#B91C1C' }}>
                                ⚠️ Esa fecha no cumple la antelación requerida ({maxLeadDays} días). Elige desde {prettyDate(minDate)}.
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Hora aproximada</label>
                            <input
                              type="time"
                              value={form.eventTime}
                              onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none"
                              style={{ borderColor: '#FBCFE8', color: '#2E1065' }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Nº invitados</label>
                              <input
                                type="number"
                                min="0"
                                value={form.guestCount || ''}
                                onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full px-4 py-2.5 rounded-xl border focus:outline-none"
                                style={{ borderColor: '#FBCFE8', color: '#2E1065' }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Presupuesto (₡ CUP)</label>
                              <input
                                type="number"
                                min="0"
                                value={form.budget || ''}
                                onChange={(e) => setForm({ ...form, budget: Number(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full px-4 py-2.5 rounded-xl border focus:outline-none"
                                style={{ borderColor: '#FBCFE8', color: '#2E1065' }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: Contacto + pago */}
                      {step === 3 && (
                        <div className="space-y-4 max-w-xl">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Nombre completo *</label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
                              <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Tu nombre" className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none" style={{ borderColor: '#FBCFE8', color: '#2E1065' }} />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Teléfono / WhatsApp *</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
                              <input type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="+53 5 XXX XXXX" className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none" style={{ borderColor: '#FBCFE8', color: '#2E1065' }} />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Email (opcional)</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
                              <input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="tu@correo.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none" style={{ borderColor: '#FBCFE8', color: '#2E1065' }} />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block" style={{ color: '#2E1065' }}>Método de pago *</label>
                            <div className="grid grid-cols-3 gap-2">
                              {PAYMENT_METHODS.map((pm) => (
                                <button
                                  key={pm.id}
                                  onClick={() => setForm({ ...form, paymentMethod: pm.id })}
                                  className="p-3 rounded-xl text-center transition-all"
                                  style={{
                                    background: form.paymentMethod === pm.id ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FDF2F8',
                                    border: form.paymentMethod === pm.id ? 'none' : '1px solid #FBCFE8',
                                    color: form.paymentMethod === pm.id ? '#FFF' : '#2E1065',
                                  }}
                                >
                                  <span className="block text-xl mb-0.5">{pm.emoji}</span>
                                  <span className="block text-[11px] font-semibold">{pm.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Notas (opcional)</label>
                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Cuéntanos tu idea, temática, colores…" rows={2} className="w-full px-4 py-2.5 rounded-xl border focus:outline-none resize-none" style={{ borderColor: '#FBCFE8', color: '#2E1065' }} />
                          </div>
                        </div>
                      )}

                      {/* STEP 4: Confirmación */}
                      {step === 4 && (
                        <div className="max-w-xl">
                          <div className="rounded-2xl p-4 mb-3" style={{ background: '#FAF5FF', border: '1px solid #DDD6FE' }}>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Evento</p>
                                <p className="font-semibold" style={{ color: '#2E1065' }}>{EVENT_TYPES.find((e) => e.id === form.eventType)?.label}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Fecha</p>
                                <p className="font-semibold" style={{ color: '#2E1065' }}>{form.eventDate ? new Date(form.eventDate).toLocaleDateString('es-CU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} {form.eventTime}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Cliente</p>
                                <p className="font-semibold" style={{ color: '#2E1065' }}>{form.customerName}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Pago</p>
                                <p className="font-semibold" style={{ color: '#2E1065' }}>{PAYMENT_METHODS.find((p) => p.id === form.paymentMethod)?.label}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1.5 mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7E22CE' }}>Items seleccionados</p>
                            {Object.entries(selectedServices).filter(([, q]) => q > 0).map(([id, qty]) => {
                              const s = services.find((x) => x.id === id);
                              if (!s) return null;
                              return <div key={id} className="flex justify-between text-sm" style={{ color: '#2E1065' }}><span>{s.icon} {serviceItemName(s)} ×{qty}</span><span>${(serviceUsd(s) * qty).toFixed(2)}</span></div>;
                            })}
                            {Object.entries(selectedProducts).filter(([, q]) => q > 0).map(([id, qty]) => {
                              const p = products.find((x) => x.id === id);
                              if (!p) return null;
                              return <div key={id} className="flex justify-between text-sm" style={{ color: '#2E1065' }}><span>🍰 {productIsDozen(p) ? `${p.name} — Docena` : p.name} ×{qty}</span><span>${(productUsd(p) * qty).toFixed(2)}</span></div>;
                            })}
                          </div>
                          {maxLeadDays > 0 && (
                            <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: '#92400E' }}>
                              <Clock className="h-3.5 w-3.5" /> Requiere {maxLeadDays} {maxLeadDays === 1 ? 'día' : 'días'} de antelación — se respeta automáticamente en la fecha elegida.
                            </p>
                          )}
                          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
                            <div className="flex justify-between text-white">
                              <span className="text-sm opacity-90">Total estimado</span>
                              <div className="text-right">
                                <p className="font-bold" style={{ fontSize: '20px', fontFamily: 'Georgia, serif' }}>${totalUsd.toFixed(2)} USD</p>
                                {totalCup > 0 && <p className="text-xs opacity-80">₡{totalCup.toLocaleString('es-CU')} CUP</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {/* ── V52.8 — Columna derecha: RESUMEN VIVO del evento (desktop lg+) ──
                  El cliente ve SIEMPRE lo que lleva elegido, con miniaturas,
                  cantidades ajustables, antelación y total. Hace el flujo
                  mucho más fácil: no hay que ir al final para revisar. */}
              {!done && (
                <aside
                  className="hidden lg:flex flex-col w-[340px] xl:w-[380px] shrink-0 border-l"
                  style={{ background: '#FAF5FF', borderColor: '#F3E8FF' }}
                >
                  <div className="px-5 py-4 border-b" style={{ borderColor: '#F3E8FF' }}>
                    <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#7E22CE' }}>
                      <CalendarHeart className="h-3.5 w-3.5" /> Tu evento
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: '#2E1065' }}>
                      {form.eventType ? `${EVENT_TYPES.find((e) => e.id === form.eventType)?.emoji} ${EVENT_TYPES.find((e) => e.id === form.eventType)?.label}` : 'Elige el tipo de evento'}
                    </p>
                    {form.eventDate && (
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        📅 {prettyDate(form.eventDate)} {form.eventTime && `· ${form.eventTime}`}
                      </p>
                    )}
                  </div>

                  {/* Items con miniaturas y control de cantidad */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 nice-scroll">
                    {itemCount === 0 ? (
                      <div className="text-center py-10 px-3">
                        <span className="text-4xl" aria-hidden>🧁</span>
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: '#9CA3AF' }}>
                          Aún no has elegido nada.<br />Explora servicios, tortas y dulces en la izquierda.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(selectedServices).filter(([, q]) => q > 0).map(([id, qty]) => {
                          const s = services.find((x) => x.id === id);
                          if (!s) return null;
                          const photo = serviceItemImage(s);
                          return (
                            <div key={id} className="flex items-center gap-2.5 p-2 rounded-xl" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
                              {photo ? (
                                <img src={photo} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                              ) : (
                                <span className="w-11 h-11 rounded-lg flex items-center justify-center text-xl bg-pink-50 shrink-0">{s.icon}</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: '#2E1065' }}>{serviceItemName(s)}</p>
                                <p className="text-[10px]" style={{ color: '#6B7280' }}>${(serviceUsd(s) * qty).toFixed(2)} · ₡{Math.round(serviceUsd(s) * 700 * qty).toLocaleString('es-CU')}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => setQty('service', id, qty - 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: '#FCE7F3', color: '#BE185D' }} aria-label="Quitar uno">−</button>
                                <span className="text-[11px] font-bold w-4 text-center" style={{ color: '#2E1065' }}>{qty}</span>
                                <button onClick={() => setQty('service', id, qty + 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: '#EC4899' }} aria-label="Añadir uno">+</button>
                                <button onClick={() => removeItem('service', id)} className="w-6 h-6 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50" aria-label="Quitar del evento">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {Object.entries(selectedProducts).filter(([, q]) => q > 0).map(([id, qty]) => {
                          const p = products.find((x) => x.id === id);
                          if (!p) return null;
                          const dozen = productIsDozen(p);
                          return (
                            <div key={id} className="flex items-center gap-2.5 p-2 rounded-xl" style={{ background: dozen ? '#FFF7ED' : '#FFF', border: `1px solid ${dozen ? '#FED7AA' : '#FBCFE8'}` }}>
                              <img src={p.image || '/products/placeholder.svg'} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: '#2E1065' }}>
                                  {p.name}{dozen && <span style={{ color: '#C2410C' }}> · Docena</span>}
                                </p>
                                <p className="text-[10px]" style={{ color: '#6B7280' }}>${(productUsd(p) * qty).toFixed(2)} · ₡{(productCup(p) * qty).toLocaleString('es-CU')}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => setQty('product', id, qty - 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: '#F3F4F6', color: '#374151' }} aria-label="Quitar uno">−</button>
                                <span className="text-[11px] font-bold w-4 text-center" style={{ color: '#2E1065' }}>{qty}</span>
                                <button onClick={() => setQty('product', id, qty + 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: p.buffetEnabled ? '#F59E0B' : '#A855F7' }} aria-label="Añadir uno">+</button>
                                <button onClick={() => removeItem('product', id)} className="w-6 h-6 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50" aria-label="Quitar del evento">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Totales */}
                  <div className="px-5 py-4 border-t" style={{ borderColor: '#F3E8FF', background: '#FFF' }}>
                    {maxLeadDays > 0 && (
                      <p className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#92400E' }}>
                        <Clock className="h-3 w-3" /> Antelación: {maxLeadDays} {maxLeadDays === 1 ? 'día' : 'días'} · desde {prettyDate(minDate)}
                      </p>
                    )}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs" style={{ color: '#6B7280' }}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                      <div className="text-right">
                        <p className="font-bold" style={{ fontSize: '20px', color: '#7E22CE', fontFamily: 'Georgia, serif' }}>${totalUsd.toFixed(2)} <span className="text-[10px] font-semibold">USD</span></p>
                        {totalCup > 0 && <p className="text-[10px]" style={{ color: '#9CA3AF' }}>≈ ₡{totalCup.toLocaleString('es-CU')} CUP</p>}
                      </div>
                    </div>
                    {step === 1 && itemCount > 0 && (
                      <button
                        onClick={() => setStep(2)}
                        className="w-full mt-3 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-95"
                        style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                      >
                        Continuar a la fecha <ChevronRight className="inline h-4 w-4" />
                      </button>
                    )}
                  </div>
                </aside>
              )}
            </div>

            {/* Footer con navegación — móvil muestra mini-resumen en vivo */}
            {!done && (
              <div
                className="px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between gap-2"
                style={{ background: '#FAFAFA', borderTop: '1px solid #F3E8FF' }}
              >
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-30"
                  style={{ color: '#7E22CE' }}
                >
                  <ChevronLeft className="h-4 w-4" /> Atrás
                </button>
                {/* V52.8 — en móvil/tablet (sin panel lateral), resumen compacto */}
                <div className="lg:hidden flex items-center gap-2 text-xs" aria-live="polite">
                  <span className="font-bold" style={{ color: '#7E22CE' }}>${totalUsd.toFixed(2)}</span>
                  <span className="text-gray-500">· {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                  {maxLeadDays > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5" style={{ background: '#FEF3C7', color: '#92400E' }}>
                      <Clock className="h-2.5 w-2.5" />{maxLeadDays}d
                    </span>
                  )}
                </div>
                {step < steps.length - 1 ? (
                  <button
                    onClick={() => canNext() && setStep(step + 1)}
                    disabled={!canNext()}
                    className="inline-flex items-center gap-1 px-4 sm:px-5 py-2 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    {submitting ? 'Enviando…' : <><Check className="h-4 w-4" /> Enviar Reserva</>}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * V52.7/V52.8 — Grid visual de productos para armar el evento.
 * Cards con foto, precio en USD (primario) y control de cantidad.
 * V52.8: priceFn/isDozenFn permiten al buffet cotizar por DOCENA (USD).
 */
function ProductPickerGrid({
  products,
  selectedProducts,
  onToggle,
  onQty,
  accent,
  priceFn,
  isDozenFn,
}: {
  products: Product[];
  selectedProducts: Record<string, number>;
  onToggle: (type: 'product', id: string) => void;
  onQty: (type: 'product', id: string, qty: number) => void;
  accent: 'purple' | 'amber';
  /** Precio USD del producto (buffet → docena). */
  priceFn: (p: Product) => number;
  /** ¿Se vende por docena? (dulces finos + buffet). */
  isDozenFn: (p: Product) => boolean;
}) {
  if (products.length === 0) {
    return <p className="text-xs text-center py-3" style={{ color: '#9CA3AF' }}>No hay productos que coincidan con tu búsqueda.</p>;
  }
  const purple = { sel: '#7E22CE', selBg: '#F3E8FF', chip: '#A855F7' };
  const amber = { sel: '#B45309', selBg: '#FFF7ED', chip: '#F59E0B' };
  const c = accent === 'amber' ? amber : purple;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
      {products.map((p) => {
        const qty = selectedProducts[p.id] || 0;
        const isDozen = isDozenFn(p);
        const lead = Number(p.reservationDays || 0);
        const usd = priceFn(p);
        return (
          <div
            key={p.id}
            className="rounded-2xl overflow-hidden transition-all"
            style={{
              background: qty > 0 ? c.selBg : '#FAFAFA',
              border: qty > 0 ? `2px solid ${c.sel}` : '1px solid #F3F4F6',
              boxShadow: qty > 0 ? `0 8px 18px -6px ${c.chip}55` : 'none',
            }}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
              <img src={p.image || '/products/placeholder.svg'} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
              {qty > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${c.chip} 0%, #EC4899 100%)` }}
                >
                  {qty}
                </span>
              )}
              {lead > 0 && (
                <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex items-center gap-0.5" style={{ background: 'rgba(146,64,14,0.85)' }}>
                  <Clock className="h-2.5 w-2.5" /> {lead}d
                </span>
              )}
              {isDozen && (
                <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)' }}>
                  🍬 Docena
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="text-[11px] font-semibold leading-tight line-clamp-2 min-h-[28px]" style={{ color: '#2E1065' }}>{p.name}</p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                <strong style={{ color: c.sel }}>${usd.toFixed(2)}</strong>
                <span className="opacity-70 text-[10px]"> · ₡{Math.round(usd * 700).toLocaleString('es-CU')}{isDozen ? '/doc' : ''}</span>
              </p>
              {qty > 0 ? (
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <button onClick={() => onQty('product', p.id, qty - 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#F3F4F6', color: '#374151' }} aria-label="Quitar uno">−</button>
                  <span className="text-xs font-bold w-4 text-center" style={{ color: '#2E1065' }}>{qty}</span>
                  <button onClick={() => onQty('product', p.id, qty + 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: c.sel }} aria-label="Añadir uno">+</button>
                </div>
              ) : (
                <button
                  onClick={() => onToggle('product', p.id)}
                  className="w-full mt-1.5 py-1.5 rounded-full text-[11px] font-bold text-white transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${c.chip} 0%, #EC4899 100%)` }}
                >
                  Añadir
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
