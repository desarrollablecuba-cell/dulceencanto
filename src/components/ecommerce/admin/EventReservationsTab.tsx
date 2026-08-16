'use client';

import { useState, useEffect } from 'react';
import { CalendarHeart, Phone, Mail, Users, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReservationItem {
  id: string;
  itemType: string;
  name: string;
  quantity: number;
  priceCup: number;
  priceUsd: number;
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: '#92400E', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmada', color: '#065F46', bg: '#D1FAE5' },
  completed: { label: 'Completada', color: '#1E40AF', bg: '#DBEAFE' },
  cancelled: { label: 'Cancelada', color: '#991B1B', bg: '#FEE2E2' },
};

export function EventReservationsTab() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'pending' | 'confirmed' | 'all'>('upcoming');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const load = () => {
    setLoading(true);
    fetch('/api/event-reservations')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setReservations(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = (id: string, status: string) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    if (selected?.id === id) setSelected({ ...selected, status });
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
    const dateStr = date.toISOString().slice(0, 10);
    return reservations.filter((r) => r.eventDate === dateStr);
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

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
              const isToday = date.toISOString().slice(0, 10) === todayStr;
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
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filtered.slice(0, 20).map((r) => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return (
                  <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left rounded-xl p-3 transition-all hover:scale-[1.01]" style={{ background: '#FFF', border: '1px solid #FBCFE8', boxShadow: '0 2px 8px -2px rgba(236,72,153,0.08)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: '#7E22CE' }}>{r.reservationCode}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: '#2E1065' }}>{EVENT_LABELS[r.eventType] || r.eventType}</span>
                      <span className="text-xs" style={{ color: '#6B7280' }}>· {new Date(r.eventDate).toLocaleDateString('es-CU', { day: 'numeric', month: 'short' })} {r.eventTime}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{r.customerName} · {r.customerPhone}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{r.items.length} items</span>
                      <span className="text-xs font-bold" style={{ color: '#A855F7' }}>₱{r.totalCup.toLocaleString('es-CU')} {r.totalUsd > 0 && `· $${r.totalUsd.toFixed(2)}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(46,16,101,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: '#E9D5FF' }}>{selected.reservationCode}</p>
                  <h3 className="font-bold text-white" style={{ fontFamily: 'Georgia, serif', fontSize: '20px' }}>{EVENT_LABELS[selected.eventType] || selected.eventType}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/20"><XCircle className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Fecha</p><p className="font-semibold" style={{ color: '#2E1065' }}>{new Date(selected.eventDate).toLocaleDateString('es-CU', { weekday: 'long', day: 'numeric', month: 'long' })} {selected.eventTime}</p></div></div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Invitados</p><p className="font-semibold" style={{ color: '#2E1065' }}>{selected.guestCount || '—'}</p></div></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Teléfono</p><p className="font-semibold" style={{ color: '#2E1065' }}>{selected.customerPhone}</p></div></div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" style={{ color: '#EC4899' }} /><div><p className="text-[10px] uppercase" style={{ color: '#9CA3AF' }}>Email</p><p className="font-semibold" style={{ color: '#2E1065' }}>{selected.customerEmail || '—'}</p></div></div>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#F3E8FF' }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#7E22CE' }}>Items reservados</p>
                {selected.items.map((it) => (<div key={it.id} className="flex justify-between text-sm py-0.5" style={{ color: '#2E1065' }}><span>{it.name} ×{it.quantity}</span><span>₱{(it.priceCup * it.quantity).toLocaleString('es-CU')}</span></div>))}
                <div className="flex justify-between font-bold pt-2 mt-1 border-t" style={{ borderColor: '#DDD6FE', color: '#7E22CE' }}><span>Total</span><span>₱{selected.totalCup.toLocaleString('es-CU')} {selected.totalUsd > 0 && `· $${selected.totalUsd.toFixed(2)}`}</span></div>
              </div>
              {selected.notes && (<div><p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>Notas</p><p className="text-sm" style={{ color: '#2E1065' }}>{selected.notes}</p></div>)}
              <div className="flex gap-2 pt-2">
                <button onClick={() => updateStatus(selected.id, 'confirmed')} className="flex-1 px-3 py-2 rounded-full text-xs font-semibold text-white" style={{ background: '#10B981' }}><CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> Confirmar</button>
                <button onClick={() => updateStatus(selected.id, 'cancelled')} className="flex-1 px-3 py-2 rounded-full text-xs font-semibold text-white" style={{ background: '#EF4444' }}><XCircle className="inline h-3.5 w-3.5 mr-1" /> Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
