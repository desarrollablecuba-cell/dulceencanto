'use client';

import { useState, useEffect } from 'react';
import { SectionPage } from '@/components/ecommerce/SectionPage';
import { MapPin, Clock, Truck } from 'lucide-react';

export function DeliveryZonesPage() {
  return (
    <SectionPage
      title="Zonas de Entrega a Domicilio"
      subtitle="Llevamos tus pedidos frescos hasta la puerta de tu casa"
      icon="🚚"
    >
      <DeliveryZonesContent />
    </SectionPage>
  );
}

interface Zone {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedTime: string;
  active: boolean;
  allowsPriorityDelivery: boolean;
}

export function DeliveryZonesContent() {
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    fetch('/api/delivery-zones')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setZones(data.filter((z: Zone) => z.active)); })
      .catch(() => {});
  }, []);

  return (
    <section className="py-10" style={{ background: '#FAF5FF' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {zones.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 mx-auto mb-3" style={{ color: '#FBCFE8' }} />
            <p style={{ color: '#6B7280' }}>No hay zonas configuradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {zones.map((z, i) => (
              <div
                key={z.id}
                className="rounded-2xl p-6 transition-all hover:-translate-y-1"
                style={{ background: '#FFF', border: '1px solid #FBCFE8', boxShadow: '0 4px 14px -2px rgba(236,72,153,0.08)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  {z.allowsPriorityDelivery && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                      ⚡ Prioritaria
                    </span>
                  )}
                </div>
                <h3 className="font-bold mb-1" style={{ fontSize: '18px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>{z.name}</h3>
                <p className="text-sm mb-3" style={{ color: '#6B7280' }}>{z.description}</p>
                <div className="flex items-center gap-2 text-xs mb-3" style={{ color: '#9CA3AF' }}>
                  <Clock className="h-3.5 w-3.5" /> {z.estimatedTime}
                </div>
                <div className="pt-3 border-t" style={{ borderColor: '#FBCFE8' }}>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Costo de envío</span>
                  <p className="font-bold" style={{ fontSize: '22px', color: '#A855F7', fontFamily: 'Georgia, serif' }}>
                    ₱{z.price.toLocaleString('es-CU')} <span className="text-xs" style={{ color: '#9CA3AF' }}>CUP</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
