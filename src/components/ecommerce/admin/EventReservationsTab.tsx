'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CalendarHeart, Phone, Mail, Users, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Printer, MessageCircle, PackageCheck, Sparkles, Cake, User } from 'lucide-react';

interface ReservationItem {
  id: string;
  itemType: string;
  itemId: string;
  name: string;
  quantity: number;
  priceCup: number;
  priceUsd: number;
  /** V52.7 — miniatura del servicio/producto/variante al momento de reservar. */
  image?: string;
}

interface Reservation {
  id: string;
  reservationCode: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  guestCount: number;
  paymentMethod: string;
  notes: string;
  status: string;
  totalCup: number;
  totalUsd: number;
  /** V52.7 — antelación máxima requerida por los items (días). */
  leadDays?: number;
  createdAt: string;
  items: ReservationItem[];
}

const EVENT_LABELS: Record<string, string> = {
  '15_anos': '🎀 15 Años',
  cumple_ninos: '🧸 Cumple Infantil',
  cumple_adultos: '🥂 Cumple Adulto',
  boda: '💍 Boda',
  bautizo: '👼 Bautizo',
  otro: '✨ Otro',
};

const EVENT_EMOJI: Record<string, string> = {
  '15_anos': '🎀', cumple_ninos: '🧸', cumple_adultos: '🥂', boda: '💍', bautizo: '👼', otro: '✨',
};

const PAYMENT_LABELS: Record<string, string> = {
  zelle: '💵 Zelle (USD)', cup: '₡ Efectivo CUP', mixto: '🔀 Mixto',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: '#92400E', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmada', color: '#065F46', bg: '#D1FAE5' },
  completed: { label: 'Completada', color: '#1E40AF', bg: '#DBEAFE' },
  cancelled: { label: 'Cancelada', color: '#991B1B', bg: '#FEE2E2' },
};

function prettyDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function shortDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function EventReservationsTab() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'pending' | 'confirmed' | 'all'>('upcoming');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // V52.7 — catálogos para resolver miniaturas de reservas antiguas (sin image)
  const [servicesImg, setServicesImg] = useState<Record<string, string>>({});
  const [productsImg, setProductsImg] = useState<Record<string, string>>({});
  // V52.7 — modo de impresión del ticket: 80mm (impresora térmica) o carta
  const [printMode, setPrintMode] = useState<'80mm' | 'carta' | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/event-reservations')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setReservations(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Resolver miniaturas para items sin image (reservas previas a V52.7)
  useEffect(() => {
    if (!selected) return;
    const missing = selected.items.some((it) => !it.image && it.itemId);
    if (!missing) return;
    Promise.all([
      fetch('/api/services').then((r) => r.json()).catch(() => []),
      fetch('/api/products?take=300').then((r) => r.json()).catch(() => []),
    ]).then(([svcs, prods]) => {
      const sMap: Record<string, string> = {};
      if (Array.isArray(svcs)) for (const s of svcs) sMap[String(s.id)] = s.image || s.icon || '';
      setServicesImg(sMap);
      const pMap: Record<string, string> = {};
      if (Array.isArray(prods)) for (const p of prods) pMap[String(p.id)] = p.image || '';
      setProductsImg(pMap);
    }).catch(() => {});
  }, [selected]);

  const itemThumb = (it: ReservationItem): string => {
    if (it.image) return it.image;
    if (it.itemType === 'service') return servicesImg[it.itemId] || '';
    return productsImg[it.itemId] || '';
  };

  const updateStatus = (id: string, status: string) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : prev));
    if (selected?.id === id) setSelected({ ...selected, status });
    fetch(`/api/event-reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  };

  const filtered = reservations.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'confirmed') return r.status === 'confirmed';
    if (filter === 'upcoming') {
      const today = new Date().toISOString().slice(0, 10);
      return r.eventDate >= today;
    }
    return true;
  });

  const byDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return reservations.filter((r) => r.eventDate === dateStr);
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── V52.7 — Impresión del ticket (80mm térmico o hoja carta) ──
  const printTicket = (mode: '80mm' | 'carta') => {
    if (!selected) return;
    setPrintMode(mode);
    // Dar tiempo a que el portal renderice (y las miniaturas carguen) antes de imprimir
    setTimeout(() => {
      try { window.print(); } catch { /* ignore */ }
      setTimeout(() => setPrintMode(null), 300);
    }, 500);
  };

  useEffect(() => {
    if (!printMode) return;
    const after = () => setPrintMode(null);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, [printMode]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#2E1065' }}>
            <CalendarHeart className="h-5 w-5" style={{ color: '#EC4899' }} /> Reservas de Eventos
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Calendario de eventos reservados por clientes</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F3E8FF' }}>
          {([['upcoming', 'Próximas'], ['pending', 'Pendientes'], ['confirmed', 'Confirmadas'], ['all', 'Todas']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all" style={{ background: filter === id ? '#A855F7' : 'transparent', color: filter === id ? '#FFF' : '#7E22CE' }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calendar */}
        <div className="rounded-2xl p-4" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-pink-50" style={{ color: '#7E22CE' }}><ChevronLeft className="h-4 w-4" /></button>
            <h3 className="font-bold" style={{ color: '#2E1065', fontFamily: 'Georgia, serif' }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-pink-50" style={{ color: '#7E22CE' }}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (<div key={d} className="text-center text-[10px] font-semibold uppercase" style={{ color: '#9CA3AF' }}>{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dayReservations = byDate(date);
              const isToday = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === todayStr;
              return (
                <button key={day} onClick={() => { if (dayReservations.length > 0) setSelected(dayReservations[0]); }} className="aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all hover:scale-105" style={{ background: dayReservations.length > 0 ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FAFAFA', color: dayReservations.length > 0 ? '#FFF' : '#6B7280', border: isToday ? '2px solid #EC4899' : '1px solid #F3F4F6' }}>
                  <span className="text-[11px] font-bold">{day}</span>
                  {dayReservations.length > 0 && <span className="text-[9px] mt-0.5">📍 {dayReservations.length}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t flex items-center gap-3 text-[10px]" style={{ borderColor: '#FBCFE8', color: '#6B7280' }}>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }} /> Con reserva</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2" style={{ borderColor: '#EC4899' }} /> Hoy</span>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Cargando reservas…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 rounded-2xl" style={{ background: '#FAFAFA' }}>
              <CalendarHeart className="h-10 w-10 mx-auto mb-2" style={{ color: '#FBCFE8' }} />
              <p className="text-sm text-gray-500">No hay reservas en esta vista.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto nice-scroll pr-1">
              {filtered.slice(0, 30).map((r) => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return (
                  <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left rounded-xl p-3 transition-all hover:scale-[1.01]" style={{ background: '#FFF', border: '1px solid #FBCFE8', boxShadow: '0 2px 8px -2px rgba(236,72,153,0.08)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: '#7E22CE' }}>{r.reservationCode}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: '#2E1065' }}>{EVENT_LABELS[r.eventType] || r.eventType}</span>
                      <span className="text-xs" style={{ color: '#6B7280' }}>· {shortDate(r.eventDate)} {r.eventTime}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{r.customerName} · {r.customerPhone}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{r.items.length} items{(r.leadDays ?? 0) > 0 ? ` · ⏳ ${r.leadDays}d` : ''}</span>
                      <span className="text-xs font-bold" style={{ color: '#A855F7' }}>${r.totalUsd.toFixed(2)} {r.totalCup > 0 && `· ₡${r.totalCup.toLocaleString('es-CU')}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── V52.7 — Detail Modal AMPLIADO con miniaturas + tickets ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(46,16,101,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto nice-scroll" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: '#E9D5FF' }}>{selected.reservationCode} · creada {selected.createdAt ? shortDate(selected.createdAt.slice(0, 10)) : '—'}</p>
                  <h3 className="font-bold text-white" style={{ fontFamily: 'Georgia, serif', fontSize: '20px' }}>{EVENT_LABELS[selected.eventType] || selected.eventType}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: (STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending).bg, color: (STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending).color }}>
                      {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending).label}
                    </span>
                    {(selected.leadDays ?? 0) > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#F59E0B' }}>
                        ⏳ Antelación {selected.leadDays} {selected.leadDays === 1 ? 'día' : 'días'}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/20" aria-label="Cerrar"><XCircle className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Datos del evento y cliente */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Fecha</p><p className="font-semibold" style={{ color: '#2E1065' }}>{prettyDate(selected.eventDate)}<br />{selected.eventTime || '—'}</p></div></div>
                <div className="flex items-start gap-2"><Users className="h-4 w-4 mt-0.5" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Invitados</p><p className="font-semibold" style={{ color: '#2E1065' }}>{selected.guestCount || '—'}</p></div></div>
                <div className="flex items-start gap-2"><User className="h-4 w-4 mt-0.5" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Cliente</p><p className="font-semibold" style={{ color: '#2E1065' }}>{selected.customerName}</p></div></div>
                <div className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Teléfono</p><a href={`https://wa.me/${selected.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: '#7E22CE' }}>{selected.customerPhone}</a></div></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Email</p><p className="font-semibold" style={{ color: '#2E1065' }}>{selected.customerEmail || '—'}</p></div></div>
                <div className="flex items-start gap-2"><DollarIcon /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Pago</p><p className="font-semibold" style={{ color: '#2E1065' }}>{PAYMENT_LABELS[selected.paymentMethod] || selected.paymentMethod || '—'}</p></div></div>
              </div>

              {/* ── Items con miniaturas (V52.7) ── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#7E22CE' }}>
                  {selected.items.length} {selected.items.length === 1 ? 'producto/servicio' : 'productos y servicios'} en el evento
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selected.items.map((it) => {
                    const thumb = itemThumb(it);
                    const isService = it.itemType === 'service';
                    return (
                      <div key={it.id} className="flex gap-3 rounded-xl p-2.5" style={{ background: isService ? '#FDF2F8' : '#FAF5FF', border: isService ? '1px solid #FBCFE8' : '1px solid #DDD6FE' }}>
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white border border-gray-100 flex items-center justify-center">
                          {thumb && thumb.startsWith('http') === false && !thumb.startsWith('/') && thumb.length <= 2 ? (
                            <span className="text-2xl">{thumb}</span> // icono emoji del servicio
                          ) : thumb ? (
                            <img src={thumb} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-2xl">{isService ? '🎪' : '🍰'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#2E1065' }}>
                            {isService && <Sparkles className="inline h-3 w-3 mr-0.5" style={{ color: '#EC4899' }} />}
                            {!isService && <Cake className="inline h-3 w-3 mr-0.5" style={{ color: '#7E22CE' }} />}
                            {it.name}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
                            {isService ? 'Servicio' : 'Producto'} · ×{it.quantity}
                          </p>
                          <div className="mt-auto flex items-baseline gap-1.5">
                            <span className="text-sm font-bold" style={{ color: '#A855F7' }}>${(it.priceUsd * it.quantity).toFixed(2)}</span>
                            <span className="text-[10px]" style={{ color: '#9CA3AF' }}>₡{(it.priceCup * it.quantity).toLocaleString('es-CU')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notas */}
              {selected.notes && (
                <div className="rounded-xl p-3" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#C2410C' }}>Notas del cliente</p>
                  <p className="text-sm" style={{ color: '#7C2D12' }}>{selected.notes}</p>
                </div>
              )}

              {/* Totales */}
              <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
                <div className="flex justify-between items-center text-white">
                  <span className="text-sm opacity-90">Total del evento</span>
                  <div className="text-right">
                    <p className="font-bold" style={{ fontSize: '22px', fontFamily: 'Georgia, serif' }}>${selected.totalUsd.toFixed(2)} USD</p>
                    {selected.totalCup > 0 && <p className="text-xs opacity-80">₡{selected.totalCup.toLocaleString('es-CU')} CUP</p>}
                  </div>
                </div>
              </div>

              {/* ── Tickets imprimibles (V52.7) ── */}
              <div className="rounded-xl p-3.5" style={{ background: '#F3E8FF', border: '1px dashed #C084FC' }}>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#6D28D9' }}>
                  <Printer className="h-4 w-4" /> Imprimir ticket del evento
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => printTicket('80mm')}
                    className="px-4 py-2 rounded-full text-xs font-bold text-white transition-all hover:opacity-90 flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #A855F7 100%)' }}
                  >
                    🧾 Ticket 80mm <span className="opacity-75">(térmica)</span>
                  </button>
                  <button
                    onClick={() => printTicket('carta')}
                    className="px-4 py-2 rounded-full text-xs font-bold text-white transition-all hover:opacity-90 flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #9333EA 0%, #EC4899 100%)' }}
                  >
                    📄 Hoja Carta <span className="opacity-75">(detallada)</span>
                  </button>
                  <a
                    href={`https://wa.me/${selected.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`¡Hola ${selected.customerName}! Te escribimos de Dulce Encanto por tu reserva ${selected.reservationCode} del ${shortDate(selected.eventDate)}. 🧁`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full text-xs font-bold transition-all hover:opacity-90 flex items-center gap-1.5"
                    style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Escribir al cliente
                  </a>
                </div>
              </div>

              {/* Acciones de estado */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => updateStatus(selected.id, 'confirmed')} className="flex-1 min-w-[130px] px-3 py-2 rounded-full text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background: '#10B981' }}><CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> Confirmar</button>
                <button onClick={() => updateStatus(selected.id, 'completed')} className="flex-1 min-w-[130px] px-3 py-2 rounded-full text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background: '#3B82F6' }}><PackageCheck className="inline h-3.5 w-3.5 mr-1" /> Completada</button>
                <button onClick={() => updateStatus(selected.id, 'cancelled')} className="flex-1 min-w-[130px] px-3 py-2 rounded-full text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background: '#EF4444' }}><XCircle className="inline h-3.5 w-3.5 mr-1" /> Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── V52.7 — Hoja de impresión (portal al body, solo visible al imprimir) ── */}
      {printMode && selected && createPortal(
        <>
          <style>{`
            @page { ${printMode === '80mm' ? 'size: 80mm auto; margin: 3mm;' : 'size: letter portrait; margin: 12mm;'} }
            @media print {
              body > *:not(#de-print-root) { display: none !important; }
              #de-print-root { display: block !important; }
            }
            #de-print-root { display: none; }
          `}</style>
          <div id="de-print-root">
            {printMode === '80mm' ? <Ticket80mm r={selected} thumb={itemThumb} /> : <TicketCarta r={selected} thumb={itemThumb} />}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function DollarIcon() {
  return <span className="text-xs font-bold mt-0.5" style={{ color: '#EC4899' }}>$</span>;
}

/** Convierte un path relativo en URL absoluta imprimible. */
function printSrc(p?: string): string {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  return p; // las rutas relativas (/services/x.webp) funcionan en la impresión del mismo origen
}

// ─── TICKET 80mm (impresora térmica de recibos) ─────────────────────────────

function Ticket80mm({ r, thumb }: { r: Reservation; thumb: (it: ReservationItem) => string }) {
  return (
    <div
      style={{
        width: '74mm',
        margin: '0 auto',
        fontFamily: 'ui-monospace, "Courier New", monospace',
        fontSize: '10px',
        color: '#000',
        lineHeight: 1.35,
      }}
    >
      {/* Encabezado */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: 1 }}>DULCE ENCANTO</div>
        <div style={{ fontSize: '9px' }}>Eventos &amp; Dulcería Fina</div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
        <div style={{ fontSize: '11px', fontWeight: 700 }}>RESERVA DE EVENTO</div>
        <div>{r.reservationCode}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* Datos */}
      <table style={{ width: '100%', fontSize: '9.5px' }}>
        <tbody>
          <tr><td style={{ width: '22mm' }}>Evento:</td><td>{(EVENT_LABELS[r.eventType] || r.eventType).replace(/[^\p{L}\p{N} &()]/gu, '')}</td></tr>
          <tr><td>Fecha:</td><td>{shortDate(r.eventDate)} {r.eventTime}</td></tr>
          <tr><td>Cliente:</td><td>{r.customerName}</td></tr>
          <tr><td>Teléfono:</td><td>{r.customerPhone}</td></tr>
          {r.guestCount > 0 && <tr><td>Invitados:</td><td>{r.guestCount}</td></tr>}
          {r.customerEmail && <tr><td>Email:</td><td style={{ wordBreak: 'break-all' }}>{r.customerEmail}</td></tr>}
          <tr><td>Pago:</td><td>{PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod || '—'}</td></tr>
          <tr><td>Estado:</td><td>{(STATUS_CONFIG[r.status] || STATUS_CONFIG.pending).label}</td></tr>
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* Items */}
      <table style={{ width: '100%', fontSize: '9.5px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #000', padding: '2px 0' }}>Cant · Concepto</th>
            <th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: '2px 0' }}>USD</th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((it) => (
            <tr key={it.id}>
              <td style={{ padding: '2px 0', verticalAlign: 'top' }}>
                {it.quantity} × {it.name.length > 34 ? it.name.slice(0, 33) + '…' : it.name}
                {it.image || thumb(it) ? '' : ''}
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{(it.priceUsd * it.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '11px' }}>
        <span>TOTAL</span>
        <span>${r.totalUsd.toFixed(2)} USD</span>
      </div>
      {r.totalCup > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px' }}>
          <span>Ref. CUP</span>
          <span>₡{r.totalCup.toLocaleString('es-CU')}</span>
        </div>
      )}
      {(r.leadDays ?? 0) > 0 && (
        <div style={{ marginTop: 4, fontSize: '9px' }}>⏳ Antelación requerida: {r.leadDays} {r.leadDays === 1 ? 'día' : 'días'}</div>
      )}

      {r.notes && (
        <>
          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
          <div style={{ fontSize: '9px' }}>Notas: {r.notes.length > 220 ? r.notes.slice(0, 219) + '…' : r.notes}</div>
        </>
      )}

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div style={{ textAlign: 'center', fontSize: '9px' }}>
        <div>¡Gracias por elegirnos! 🧁</div>
        <div>Impreso: {new Date().toLocaleString('es-CU')}</div>
        <div style={{ marginTop: 3, fontWeight: 700 }}>{r.reservationCode}</div>
      </div>
    </div>
  );
}

// ─── TICKET HOJA CARTA (detallado, con miniaturas) ──────────────────────────

function TicketCarta({ r, thumb }: { r: Reservation; thumb: (it: ReservationItem) => string }) {
  const services = r.items.filter((it) => it.itemType === 'service');
  const products = r.items.filter((it) => it.itemType !== 'service');
  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', color: '#111827', fontSize: '12px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #7E22CE', paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2E1065', letterSpacing: 0.5 }}>Dulce Encanto</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Eventos &amp; Dulcería Fina · Reserva de Evento</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#7E22CE' }}>{r.reservationCode}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Impreso: {new Date().toLocaleString('es-CU')}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Estado: {(STATUS_CONFIG[r.status] || STATUS_CONFIG.pending).label}</div>
        </div>
      </div>

      {/* Datos del evento */}
      <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: 1, color: '#9CA3AF', marginBottom: 4 }}>Evento</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#2E1065' }}>{EVENT_EMOJI[r.eventType] || '✨'} {EVENT_LABELS[r.eventType]?.replace(/^\S+\s/, '') || r.eventType}</div>
          <div style={{ marginTop: 2, color: '#374151' }}>{prettyDate(r.eventDate)}{r.eventTime ? ` · ${r.eventTime} h` : ''}</div>
          {r.guestCount > 0 && <div style={{ color: '#374151' }}>{r.guestCount} invitados</div>}
          {(r.leadDays ?? 0) > 0 && <div style={{ color: '#B45309', fontWeight: 600, marginTop: 2 }}>⏳ Antelación requerida: {r.leadDays} {r.leadDays === 1 ? 'día' : 'días'}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: 1, color: '#9CA3AF', marginBottom: 4 }}>Cliente</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#2E1065' }}>{r.customerName}</div>
          <div style={{ color: '#374151' }}>📞 {r.customerPhone}</div>
          {r.customerEmail && <div style={{ color: '#374151' }}>✉ {r.customerEmail}</div>}
          <div style={{ color: '#374151' }}>💳 {PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod || '—'}</div>
        </div>
      </div>

      {/* Servicios */}
      {services.length > 0 && (
        <>
          <div style={{ marginTop: 16, fontSize: '13px', fontWeight: 700, color: '#EC4899', borderBottom: '1px solid #FBCFE8', paddingBottom: 4 }}>Servicios del evento</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
            {services.map((it) => {
              const img = printSrc(it.image || thumb(it));
              return (
                <div key={it.id} style={{ border: '1px solid #F3E8FF', borderRadius: 10, overflow: 'hidden', pageBreakInside: 'avoid' }}>
                  {img && <img src={img} alt={it.name} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />}
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '11px', lineHeight: 1.25 }}>{it.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: 2 }}>×{it.quantity} · ${(it.priceUsd * it.quantity).toFixed(2)} USD · ₡{(it.priceCup * it.quantity).toLocaleString('es-CU')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Productos */}
      {products.length > 0 && (
        <>
          <div style={{ marginTop: 16, fontSize: '13px', fontWeight: 700, color: '#7E22CE', borderBottom: '1px solid #DDD6FE', paddingBottom: 4 }}>Productos del evento</div>
          <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#FAF5FF' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #DDD6FE', width: 54 }}>Foto</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #DDD6FE' }}>Producto</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', border: '1px solid #DDD6FE', width: 44 }}>Cant.</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #DDD6FE', width: 80 }}>USD</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #DDD6FE', width: 90 }}>CUP</th>
              </tr>
            </thead>
            <tbody>
              {products.map((it) => {
                const img = printSrc(it.image || thumb(it));
                return (
                  <tr key={it.id} style={{ pageBreakInside: 'avoid' }}>
                    <td style={{ padding: '5px 8px', border: '1px solid #E9D5FF', textAlign: 'center' }}>
                      {img ? <img src={img} alt={it.name} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6, display: 'inline-block' }} /> : '🍰'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E9D5FF', fontWeight: 600 }}>{it.name}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E9D5FF', textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E9D5FF', textAlign: 'right' }}>${(it.priceUsd * it.quantity).toFixed(2)}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E9D5FF', textAlign: 'right' }}>₡{(it.priceCup * it.quantity).toLocaleString('es-CU')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Notas */}
      {r.notes && (
        <div style={{ marginTop: 14, border: '1px solid #FED7AA', background: '#FFFBEB', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: 1, color: '#C2410C', marginBottom: 3 }}>Notas del cliente</div>
          <div style={{ color: '#7C2D12' }}>{r.notes}</div>
        </div>
      )}

      {/* Totales */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 240, border: '2px solid #2E1065', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#2E1065', color: '#FFF' }}>
            <span style={{ fontWeight: 600 }}>TOTAL DEL EVENTO</span>
            <span style={{ fontWeight: 800, fontSize: '16px' }}>${r.totalUsd.toFixed(2)} USD</span>
          </div>
          {r.totalCup > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', color: '#374151' }}>
              <span>Referencia en CUP</span>
              <span style={{ fontWeight: 600 }}>₡{r.totalCup.toLocaleString('es-CU')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pie */}
      <div style={{ marginTop: 20, borderTop: '1px solid #E5E7EB', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9CA3AF' }}>
        <span>Dulce Encanto · Reservas de eventos</span>
        <span>{r.reservationCode} · {shortDate(r.eventDate)}</span>
      </div>
      <div style={{ marginTop: 26 }}>
        <div style={{ borderTop: '1px dashed #9CA3AF', width: 260 }} />
        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: 3 }}>Firma de conformidad</div>
      </div>
    </div>
  );
}
