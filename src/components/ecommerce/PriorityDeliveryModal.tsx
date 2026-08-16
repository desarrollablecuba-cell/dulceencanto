'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Clock, MapPin, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

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
  storeName?: string;
  normalSchedule?: string;
  asapSurchargeType?: string;
  asapSurchargeValue?: number;
  phone?: string;
  whatsappNumber?: string;
  priorityDeliveryInfo1?: string;
  priorityDeliveryInfo2?: string;
  priorityDeliveryInfo3?: string;
}

interface PriorityDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal informativo del servicio de Entrega Prioritaria.
 *
 * Refleja el funcionamiento real del sistema: solo muestra como disponibles
 * las zonas que en el admin tienen `allowsPriorityDelivery: true`. El
 * recargo mostrado para cada zona proviene del override de la zona (si
 * está activado) o del recargo global del SiteConfig.
 *
 * Todo el contenido (zonas, recargos, horario normal, contacto) se carga
 * dinámicamente desde la API. No hay valores hardcodeados en el código.
 */
export function PriorityDeliveryModal({ open, onOpenChange }: PriorityDeliveryModalProps) {
  const { setView } = useAppStore();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      fetch('/api/delivery-zones').then((r) => r.json()),
      fetch('/api/siteconfig').then((r) => r.json()),
    ])
      .then(([zonesData, configData]) => {
        if (cancelled) return;
        setZones(Array.isArray(zonesData) ? zonesData : []);
        setConfig(configData && !configData.error ? configData : null);
      })
      .catch((err) => console.error('Error cargando datos para modal prioritario:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  // Filtrar solo zonas activas con allowsPriorityDelivery = true
  const priorityZones = zones
    .filter((z) => z.active && z.allowsPriorityDelivery)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  /**
   * Calcula el recargo ASAP para una zona:
   * - Si la zona tiene override, usa su tipo y valor.
   * - Si no, usa el recargo global del SiteConfig.
   * Devuelve un texto legible ("$5.00 fijo", "10% del pedido").
   */
  const getSurchargeLabel = (zone: DeliveryZone): string => {
    let type: string;
    let value: number;
    if (zone.asapSurchargeOverride) {
      type = zone.asapSurchargeType || 'fixed';
      value = Number(zone.asapSurchargeValue) || 0;
    } else {
      type = config?.asapSurchargeType || 'fixed';
      value = Number(config?.asapSurchargeValue) || 0;
    }
    if (value === 0) return 'Sin recargo';
    return type === 'percent'
      ? `${value}% del pedido`
      : `$${value.toFixed(2)} fijo`;
  };

  const handleGoToCatalog = () => {
    onOpenChange(false);
    setView('catalog');
  };

  const whatsapp = config?.whatsappNumber || '';
  const whatsappUrl = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`
    : '';
  const normalSchedule = config?.normalSchedule || '15:00 - 18:00';
  // Textos editables del modal (con defaults si están vacíos)
  const info1 = config?.priorityDeliveryInfo1 || `Al elegir "Entrega Prioritaria" en el checkout, tu pedido se entrega con prioridad sobre los pedidos normales.`;
  const info2 = config?.priorityDeliveryInfo2 || `Horario normal de entrega: ${normalSchedule}. Con entrega prioritaria recibes tu pedido fuera de ese horario habitual.`;
  const info3 = config?.priorityDeliveryInfo3 || `El servicio tiene un recargo adicional que se calcula automáticamente al seleccionar la opción en el checkout.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center shadow-lg shadow-brand/30">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-bold text-gray-900">
                Entrega Prioritaria
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Recibe tu pedido antes del horario normal
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* ─── Cómo funciona ─── */}
            <div className="rounded-xl bg-brand-light border border-brand-light p-4">
              <h3 className="font-semibold text-brand-dark mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                ¿Cómo funciona?
              </h3>
              <ul className="text-sm text-brand-dark space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-brand-dark shrink-0" />
                  <span>{info1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-brand-dark shrink-0" />
                  <span>{info2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-brand-dark shrink-0" />
                  <span>{info3}</span>
                </li>
              </ul>
            </div>

            {/* ─── Zonas disponibles ─── */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand" />
                Zonas donde está disponible
              </h3>

              {priorityZones.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-700 font-medium">
                    Actualmente no hay zonas habilitadas para entrega prioritaria.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    El servicio de entrega prioritaria está temporalmente desactivado en todas
                    las zonas. Por favor, contáctanos para conocer cuándo volverá a estar
                    disponible.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {priorityZones.map((zone) => (
                    <div
                      key={zone.id}
                      className="rounded-xl border border-gray-200 p-3.5 hover:border-brand-light hover:bg-brand-light/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{zone.name}</p>
                          {zone.description && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                              {zone.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 text-brand" />
                              Entrega normal: <strong>{zone.estimatedTime}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-brand" />
                              Envío base: <strong>${Number(zone.price).toFixed(2)}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                            Recargo prioritario
                          </p>
                          <p className="text-sm font-bold text-brand-dark mt-0.5">
                            {getSurchargeLabel(zone)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Nota si no hay zonas ─── */}
            {priorityZones.length === 0 && whatsappUrl && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-700">
                  ¿Necesitas una entrega urgente? Escríbenos por WhatsApp para evaluar tu caso.
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
                >
                  Contactar por WhatsApp
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}

            {/* ─── Footer informativo ─── */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  La disponibilidad de entrega prioritaria depende de cada zona. Durante el
                  checkout, la opción &quot;Entrega Prioritaria&quot; solo aparecerá si la zona que
                  seleccionaste tiene este servicio habilitado.
                </span>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:order-1"
          >
            Cerrar
          </Button>
          {priorityZones.length > 0 && (
            <Button
              onClick={handleGoToCatalog}
              className="bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark text-white sm:order-2"
            >
              Hacer un pedido
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
