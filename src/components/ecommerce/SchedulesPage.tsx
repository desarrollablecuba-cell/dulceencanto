'use client';

import { SectionPage } from '@/components/ecommerce/SectionPage';
import { Clock } from 'lucide-react';

export function SchedulesPage() {
  return (
    <SectionPage
      title="Horarios de Entrega"
      subtitle="Estamos disponibles para recibir tus pedidos y entregarte fresco"
      icon="🕐"
    >
      <SchedulesContent />
    </SectionPage>
  );
}

export function SchedulesContent() {
  const days = [
    { name: 'Lunes', key: 'scheduleLunes' },
    { name: 'Martes', key: 'scheduleMartes' },
    { name: 'Miércoles', key: 'scheduleMiercoles' },
    { name: 'Jueves', key: 'scheduleJueves' },
    { name: 'Viernes', key: 'scheduleViernes' },
    { name: 'Sábado', key: 'scheduleSabado' },
    { name: 'Domingo', key: 'scheduleDomingo' },
  ];
  return <ScheduleGrid days={days} />;
}

import { useState, useEffect } from 'react';

function ScheduleGrid({ days }: { days: { name: string; key: string }[] }) {
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [normalSchedule, setNormalSchedule] = useState('09:00 - 18:00');

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        const s: Record<string, string> = {};
        days.forEach((d) => { s[d.name] = data[d.key] || ''; });
        setSchedule(s);
        if (data.normalSchedule) setNormalSchedule(data.normalSchedule);
      })
      .catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString('es-CU', { weekday: 'long' });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <section className="py-10" style={{ background: '#FAF5FF' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Horario semanal */}
          <div className="rounded-2xl p-6" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontSize: '18px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
              <Clock className="h-5 w-5" style={{ color: '#EC4899' }} /> Horario semanal
            </h3>
            <div className="space-y-2">
              {days.map((d) => {
                const isToday = d.name === todayCap;
                const hours = schedule[d.name] || 'Cerrado';
                const isClosed = hours.toLowerCase() === 'cerrado' || !hours;
                return (
                  <div
                    key={d.name}
                    className="flex items-center justify-between p-3 rounded-xl transition-all"
                    style={{
                      background: isToday ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FAFAFA',
                      color: isToday ? '#FFF' : '#2E1065',
                      border: isToday ? 'none' : '1px solid #F3F4F6',
                    }}
                  >
                    <span className="font-semibold text-sm flex items-center gap-2">
                      {d.name}
                      {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25">HOY</span>}
                    </span>
                    <span className={`text-sm font-semibold ${isClosed && !isToday ? 'text-red-400' : ''}`}>
                      {hours}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info adicional */}
          <div className="space-y-4">
            <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)', color: '#FFF' }}>
              <h3 className="font-bold mb-3" style={{ fontSize: '18px', fontFamily: 'Georgia, serif' }}>📦 Pedidos 24/7</h3>
              <p className="text-sm leading-relaxed opacity-90">
                El sitio está disponible para recibir tus pedidos las <strong>24 horas</strong>, los <strong>7 días</strong> de la semana. Procesamos los pedidos en horario de atención.
              </p>
            </div>
            <div className="rounded-2xl p-6" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
              <h3 className="font-bold mb-3" style={{ fontSize: '18px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>🚚 Entregas</h3>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Horario normal de entrega:</p>
              <p className="font-bold text-lg" style={{ color: '#7E22CE' }}>{normalSchedule}</p>
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Las entregas se realizan en Ciego de Ávila y zonas cercanas. Consulta las zonas disponibles.
              </p>
            </div>
            <div className="rounded-2xl p-6" style={{ background: '#FDF2F8', border: '1px solid #FBCFE8' }}>
              <h3 className="font-bold mb-2" style={{ fontSize: '16px', color: '#2E1065' }}>⚡ ¿Necesitas urgencia?</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Contáctanos por WhatsApp para entregas prioritarias (sujeto a disponibilidad y costo adicional).
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
