'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarHeart, Cake, Sparkles, User, Phone, Mail, Users, DollarSign, Check, ChevronRight, ChevronLeft, PartyPopper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  icon: string;
  price: number;
  priceUsd: number;
  category: string;
}

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  featured: boolean;
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

export function EventReservationModal({ open, onOpenChange }: EventReservationModalProps) {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
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
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    fetch('/api/services').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setServices(d); }).catch(() => {});
    fetch('/api/products?take=50').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setProducts(d); }).catch(() => {});
  }, [open]);

  const reset = () => {
    setStep(0);
    setDone(false);
    setForm({ eventType: '', eventDate: '', eventTime: '', customerName: '', customerEmail: '', customerPhone: '', guestCount: 0, budget: 0, paymentMethod: '', notes: '' });
    setSelectedServices({});
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
  };

  const setQty = (type: 'service' | 'product', id: string, qty: number) => {
    const state = type === 'service' ? selectedServices : selectedProducts;
    const setState = type === 'service' ? setSelectedServices : setSelectedProducts;
    setState({ ...state, [id]: Math.max(0, qty) });
  };

  const totalCup =
    Object.entries(selectedServices).reduce((sum, [id, qty]) => {
      const s = services.find((x) => x.id === id);
      return sum + (s ? s.price * qty : 0);
    }, 0) +
    Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
      const p = products.find((x) => x.id === id);
      return sum + (p ? p.price * qty : 0);
    }, 0);

  const totalUsd =
    Object.entries(selectedServices).reduce((sum, [id, qty]) => {
      const s = services.find((x) => x.id === id);
      return sum + (s ? s.priceUsd * qty : 0);
    }, 0) +
    Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
      const p = products.find((x) => x.id === id);
      return sum + (p ? Math.round((p.price / 700) * 100) / 100 * qty : 0);
    }, 0);

  const canNext = () => {
    if (step === 0) return !!form.eventType;
    if (step === 1) return !!form.eventDate;
    if (step === 2) return Object.values(selectedServices).some((q) => q > 0) || Object.values(selectedProducts).some((q) => q > 0);
    if (step === 3) return !!form.customerName && !!form.customerPhone && !!form.paymentMethod;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const items = [
      ...Object.entries(selectedServices).filter(([, q]) => q > 0).map(([id, qty]) => {
        const s = services.find((x) => x.id === id)!;
        return { itemType: 'service', itemId: id, name: s.name, quantity: qty, priceCup: s.price, priceUsd: s.priceUsd };
      }),
      ...Object.entries(selectedProducts).filter(([, q]) => q > 0).map(([id, qty]) => {
        const p = products.find((x) => x.id === id)!;
        return { itemType: 'product', itemId: id, name: p.name, quantity: qty, priceCup: p.price, priceUsd: Math.round((p.price / 700) * 100) / 100 };
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

  const steps = ['Evento', 'Fecha', 'Selección', 'Contacto', 'Confirmar'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
          style={{ background: 'rgba(46,16,101,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 py-5 shrink-0" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
              <button onClick={handleClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <CalendarHeart className="h-5 w-5 text-pink-300" />
                <h2 className="font-bold text-white" style={{ fontSize: '20px', fontFamily: 'Georgia, serif' }}>
                  {done ? '¡Reserva Enviada!' : 'Reservar Evento'}
                </h2>
              </div>
              {!done && (
                <p className="text-xs" style={{ color: '#E9D5FF' }}>
                  Paso {step + 1} de {steps.length}: {steps[step]}
                </p>
              )}
            </div>

            {/* Progress bar */}
            {!done && (
              <div className="h-1 shrink-0" style={{ background: '#F3E8FF' }}>
                <motion.div
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, #A855F7 0%, #EC4899 100%)' }}
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
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
                    {/* Ring expandible */}
                    <motion.div
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full"
                      style={{ border: '2px solid #22C55E' }}
                    />
                    {/* Check SVG animado (path drawing) */}
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
                      Total estimado: <strong>₱{totalCup.toLocaleString('es-CU')}</strong> CUP
                      {totalUsd > 0 && <> · <strong>${totalUsd.toFixed(2)}</strong> USD</>}
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

                    {/* STEP 1: Fecha y detalles */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Fecha del evento *</label>
                          <input
                            type="date"
                            value={form.eventDate}
                            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                            min={new Date().toISOString().slice(0, 10)}
                            className="w-full px-4 py-2.5 rounded-xl border focus:outline-none"
                            style={{ borderColor: '#FBCFE8', color: '#2E1065' }}
                          />
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
                            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2E1065' }}>Presupuesto (CUP)</label>
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

                    {/* STEP 2: Selección de servicios + productos */}
                    {step === 2 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium" style={{ color: '#2E1065' }}>Elige lo que necesitas para tu evento</p>
                          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
                            {Object.values(selectedServices).filter((q) => q > 0).length + Object.values(selectedProducts).filter((q) => q > 0).length} items
                          </span>
                        </div>

                        {/* Servicios */}
                        {services.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#EC4899' }}>
                              <Sparkles className="h-3 w-3" /> Servicios
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {services.map((s) => {
                                const qty = selectedServices[s.id] || 0;
                                return (
                                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: qty > 0 ? '#FDF2F8' : '#FAFAFA', border: qty > 0 ? '1px solid #FBCFE8' : '1px solid #F3F4F6' }}>
                                    <span style={{ fontSize: '22px' }}>{s.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate" style={{ color: '#2E1065' }}>{s.name}</p>
                                      <p className="text-xs" style={{ color: '#6B7280' }}>₱{s.price.toLocaleString('es-CU')} · ${s.priceUsd.toFixed(2)}</p>
                                    </div>
                                    {qty > 0 ? (
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => setQty('service', s.id, qty - 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#FBCFE8', color: '#BE185D' }}>-</button>
                                        <span className="text-sm font-bold w-5 text-center" style={{ color: '#2E1065' }}>{qty}</span>
                                        <button onClick={() => setQty('service', s.id, qty + 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: '#EC4899' }}>+</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => toggleItem('service', s.id)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: '#A855F7' }}>Añadir</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Productos destacados */}
                        {products.filter((p) => p.featured).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#7E22CE' }}>
                              <Cake className="h-3 w-3" /> Tartas y Dulces
                            </p>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {products.filter((p) => p.featured).slice(0, 8).map((p) => {
                                const qty = selectedProducts[p.id] || 0;
                                return (
                                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: qty > 0 ? '#FAF5FF' : '#FAFAFA', border: qty > 0 ? '1px solid #DDD6FE' : '1px solid #F3F4F6' }}>
                                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate" style={{ color: '#2E1065' }}>{p.name}</p>
                                      <p className="text-xs" style={{ color: '#6B7280' }}>₱{p.price.toLocaleString('es-CU')}</p>
                                    </div>
                                    {qty > 0 ? (
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => setQty('product', p.id, qty - 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#DDD6FE', color: '#7E22CE' }}>-</button>
                                        <span className="text-sm font-bold w-5 text-center" style={{ color: '#2E1065' }}>{qty}</span>
                                        <button onClick={() => setQty('product', p.id, qty + 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: '#A855F7' }}>+</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => toggleItem('product', p.id)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: '#7E22CE' }}>Añadir</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 3: Contacto + pago */}
                    {step === 3 && (
                      <div className="space-y-4">
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
                      <div>
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
                            return <div key={id} className="flex justify-between text-sm" style={{ color: '#2E1065' }}><span>{s.icon} {s.name} ×{qty}</span><span>₱{(s.price * qty).toLocaleString('es-CU')}</span></div>;
                          })}
                          {Object.entries(selectedProducts).filter(([, q]) => q > 0).map(([id, qty]) => {
                            const p = products.find((x) => x.id === id);
                            if (!p) return null;
                            return <div key={id} className="flex justify-between text-sm" style={{ color: '#2E1065' }}><span>🍰 {p.name} ×{qty}</span><span>₱{(p.price * qty).toLocaleString('es-CU')}</span></div>;
                          })}
                        </div>
                        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
                          <div className="flex justify-between text-white">
                            <span className="text-sm opacity-90">Total estimado</span>
                            <div className="text-right">
                              <p className="font-bold" style={{ fontSize: '20px', fontFamily: 'Georgia, serif' }}>₱{totalCup.toLocaleString('es-CU')} CUP</p>
                              {totalUsd > 0 && <p className="text-xs opacity-80">${totalUsd.toFixed(2)} USD (Zelle)</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Footer con navegación */}
            {!done && (
              <div className="px-6 py-4 shrink-0 flex items-center justify-between" style={{ background: '#FAFAFA', borderTop: '1px solid #F3E8FF' }}>
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-30"
                  style={{ color: '#7E22CE' }}
                >
                  <ChevronLeft className="h-4 w-4" /> Atrás
                </button>
                {step < steps.length - 1 ? (
                  <button
                    onClick={() => canNext() && setStep(step + 1)}
                    disabled={!canNext()}
                    className="inline-flex items-center gap-1 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-40"
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
