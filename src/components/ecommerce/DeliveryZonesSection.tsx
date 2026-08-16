'use client';

import { useState, useEffect } from 'react';
import { Truck, Zap, MapPin, Clock, ChevronDown, Search } from 'lucide-react';

interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedTime: string;
  active: boolean;
  order: number;
  allowsPriorityDelivery: boolean;
  asapSurchargeOverride: boolean;
  asapSurchargeType: string;
  asapSurchargeValue: number;
}

interface SiteConfig {
  asapSurchargeType: string;
  asapSurchargeValue: number;
}

/**
 * Sección del home que muestra las zonas de delivery en un formato compacto.
 *
 * En lugar de cards individuales (que no escalan con 300 zonas), usa un
 * buscador + lista expandible (acordeón). El cliente puede:
 *  - Buscar su zona por nombre.
 *  - Ver precio normal y de envío prioritario.
 *  - Expandir para ver descripción y tiempo estimado.
 *
 * Diseñado para escalar: funciona igual con 3 o 300 zonas.
 */
export function DeliveryZonesSection() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/delivery-zones').then((r) => r.json()),
      fetch('/api/siteconfig').then((r) => r.json()),
    ])
      .then(([zonesData, configData]) => {
        setZones(Array.isArray(zonesData) ? zonesData : []);
        setConfig(configData && !configData.error ? configData : null);
      })
      .catch((err) => console.error('Error loading delivery zones:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-3 sm:px-4 py-6">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse mb-3" />
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      </section>
    );
  }

  const activeZones = zones
    .filter((z) => z.active)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (activeZones.length === 0) return null;

  const filteredZones = search.trim()
    ? activeZones.filter((z) =>
        z.name.toLowerCase().includes(search.toLowerCase()) ||
        (z.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : activeZones;

  const getAsapSurcharge = (zone: DeliveryZone): { type: string; value: number } => {
    if (zone.asapSurchargeOverride) {
      return { type: zone.asapSurchargeType, value: zone.asapSurchargeValue };
    }
    return {
      type: config?.asapSurchargeType || 'fixed',
      value: config?.asapSurchargeValue || 0,
    };
  };

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 py-6 md:py-8">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Truck className="h-6 w-6 text-brand" />
          Zonas de Entrega
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {activeZones.length} zona{activeZones.length === 1 ? '' : 's'} disponible{activeZones.length === 1 ? '' : 's'}
          {activeZones.some(z => z.allowsPriorityDelivery) ? ' · con opción de envío prioritario' : ''}
        </p>
      </div>

      {/* Buscador de zonas */}
      {activeZones.length > 4 && (
        <div className="relative max-w-md mx-auto mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busca tu zona por nombre o municipio…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </div>
      )}

      {/* Lista de zonas (acordeón compacto) */}
      <div className="max-w-3xl mx-auto space-y-1.5">
        {filteredZones.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-4">
            No se encontraron zonas para "{search}".
          </p>
        ) : (
          filteredZones.map((zone) => {
            const surcharge = getAsapSurcharge(zone);
            const surchargeLabel = surcharge.value === 0
              ? 'Sin recargo'
              : surcharge.type === 'percent'
              ? `+${surcharge.value}%`
              : `+$${surcharge.value.toFixed(2)}`;
            const isExpanded = expandedId === zone.id;

            return (
              <div
                key={zone.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Fila principal (siempre visible) */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : zone.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{zone.name}</p>
                    {zone.estimatedTime && (
                      <p className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock className="h-2.5 w-2.5" />
                        {zone.estimatedTime}
                      </p>
                    )}
                  </div>
                  {/* Precio */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">${Number(zone.price).toFixed(2)}</p>
                    {zone.allowsPriorityDelivery && (
                      <p className="flex items-center justify-end gap-0.5 text-[10px] text-amber-600 font-medium">
                        <Zap className="h-2.5 w-2.5" />
                        {surchargeLabel}
                      </p>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Contenido expandible — siempre mostrar detalles */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      {zone.description && (
                        <p className="text-xs text-gray-600 leading-snug mb-2">{zone.description}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-white rounded-full px-2 py-0.5 border border-gray-100">
                          <Clock className="h-2.5 w-2.5" /> {zone.estimatedTime || 'No especificado'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-700 bg-white rounded-full px-2 py-0.5 border border-gray-100">
                          Envío: <strong>${Number(zone.price).toFixed(2)}</strong>
                        </span>
                        {zone.allowsPriorityDelivery && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 border border-amber-100">
                            <Zap className="h-2.5 w-2.5" /> Entrega Prioritaria: <strong>{surchargeLabel}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
