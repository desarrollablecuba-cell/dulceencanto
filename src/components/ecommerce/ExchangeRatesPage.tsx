'use client';

import { useState, useEffect } from 'react';
import { SectionPage } from '@/components/ecommerce/SectionPage';
import { TrendingUp, Info } from 'lucide-react';

export function ExchangeRatesPage() {
  return (
    <SectionPage
      title="Tasas de Cambio"
      subtitle="Consulta las equivalencias de moneda para tus pedidos y reservas"
      icon="💱"
    >
      <ExchangeRatesContent />
    </SectionPage>
  );
}

export function ExchangeRatesContent() {
  const [rate, setRate] = useState(700);
  const [storeCurrency, setStoreCurrency] = useState('CUP');

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        // Dulce Encanto usa CUP como base; USD rate configurable
        if (data.asapSurchargeValue) {} // placeholder
        setStoreCurrency('CUP');
        // Rate: 1 USD = 700 CUP (tasa de referencia)
        setRate(700);
      })
      .catch(() => {});
  }, []);

  const examples = [5, 10, 20, 50, 100];

  return (
    <section className="py-10" style={{ background: '#FAF5FF' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conversor principal */}
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)', color: '#FFF' }}>
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontSize: '18px', fontFamily: 'Georgia, serif' }}>
              <TrendingUp className="h-5 w-5" style={{ color: '#F9A8D4' }} /> Tasa de referencia
            </h3>
            <div className="text-center py-4">
              <p className="text-xs uppercase tracking-wider opacity-80 mb-2">1 USD =</p>
              <p className="font-bold" style={{ fontSize: '48px', fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg, #C084FC 0%, #F472B6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {rate.toLocaleString('es-CU')} CUP
              </p>
              <p className="text-xs mt-2 opacity-70">Peso Cubano (CUP)</p>
            </div>
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(236,72,153,0.2)' }}>
              <p className="text-xs opacity-80">
                💡 Esta tasa es referencial. Para reservas desde el exterior, el pago se realiza por <strong>Zelle (USD)</strong>. Para ventas directas en Cuba, el pago es en <strong>CUP efectivo</strong>.
              </p>
            </div>
          </div>

          {/* Tabla de equivalencias */}
          <div className="rounded-2xl p-6" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
            <h3 className="font-bold mb-4" style={{ fontSize: '18px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>📊 Equivalencias rápidas</h3>
            <div className="space-y-2">
              {examples.map((usd) => (
                <div key={usd} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#FDF2F8' }}>
                  <span className="font-semibold" style={{ color: '#7E22CE' }}>${usd} USD</span>
                  <span style={{ color: '#9CA3AF' }}>≈</span>
                  <span className="font-bold" style={{ color: '#2E1065' }}>₱{(usd * rate).toLocaleString('es-CU')} CUP</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: '#FEF3C7' }}>
              <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#92400E' }} />
              <p className="text-xs" style={{ color: '#92400E' }}>
                Las tasas pueden variar según el método de pago. Confirma el monto exacto al hacer tu reserva o pedido.
              </p>
            </div>
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="mt-6 rounded-2xl p-6" style={{ background: '#FFF', border: '1px solid #FBCFE8' }}>
          <h3 className="font-bold mb-4" style={{ fontSize: '18px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>💳 Métodos de pago aceptados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: '#FDF2F8', border: '1px solid #FBCFE8' }}>
              <p className="font-bold text-sm mb-1" style={{ color: '#BE185D' }}>💵 Zelle (USD)</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>Para reservas desde el exterior. Pago en dólares americanos.</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#FAF5FF', border: '1px solid #DDD6FE' }}>
              <p className="font-bold text-sm mb-1" style={{ color: '#7E22CE' }}>₱ Efectivo CUP</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>Para ventas directas en Cuba. Pago en pesos cubanos al recibir.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
