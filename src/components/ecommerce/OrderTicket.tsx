'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrencyStore, formatPrice } from '@/store/currency-store';
import { Printer, X, Zap, Clock, Calendar, CheckCircle2, DollarSign } from 'lucide-react';

export interface OrderTicketItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantInfo?: string;  // JSON: [{ groupName, optionName }]
  extrasInfo?: string;   // JSON: [{ name, price }]
}

export interface OrderTicketData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientNotes: string;
  deliveryZoneName: string | null;
  deliveryDate: string | null;
  deliveryTimeSlot: string;
  asapTimeSlot?: string | null;
  deliverySurcharge: number;
  shippingCost: number;
  total: number;
  status: string;
  isPaid: boolean;
  items: OrderTicketItem[];
  createdAt: string;
  hasReservableItems?: boolean;
}

interface StoreInfo {
  storeName: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  normalSchedule: string;
}

interface OrderTicketProps {
  order: OrderTicketData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTogglePaid?: (orderId: string, isPaid: boolean) => Promise<void> | void;
  store?: StoreInfo | null;
}

type PaperSize = '80mm' | 'letter';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDeliveryDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso + 'T12:00:00');
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Parsea el JSON de variantes de un item y devuelve un string legible.
 * Ejemplo: '[{"groupName":"Tamaño","optionName":"Grande"}]' → 'Grande'
 */
function formatVariantInfo(variantInfo?: string): string {
  if (!variantInfo) return '';
  try {
    const arr = JSON.parse(variantInfo);
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr
      .map((v: { groupName?: string; optionName?: string; name?: string }) => v.optionName || v.name || '')
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}

/**
 * Parsea el JSON de extras de un item y devuelve un string legible.
 * Ejemplo: '[{"name":"Sin queso","price":0.5}]' → 'Sin queso (+$0.50)'
 */
function formatExtrasInfo(extrasInfo?: string, currency: 'CUP' | 'USD' = 'CUP'): string {
  if (!extrasInfo) return '';
  try {
    const arr = JSON.parse(extrasInfo);
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr
      .map((e: { name?: string; price?: number }) => {
        const name = e.name || '';
        const price = Number(e.price) || 0;
        if (price > 0) return `${name} (+${formatPrice(price, currency)})`;
        return name;
      })
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}

export function OrderTicket({ order, open, onOpenChange, onTogglePaid, store }: OrderTicketProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [togglingPaid, setTogglingPaid] = useState(false);
  const currency = useCurrencyStore((s) => s.currency);

  // Reset paper size to 80mm cada vez que se abre
  useEffect(() => {
    if (open) setPaperSize('80mm');
  }, [open]);

  if (!order) return null;

  const subtotal = order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const storeName = store?.storeName || 'Dulce Encanto';
  const storePhone = store?.phone || '';
  const storeAddress = store?.address || '';
  const normalSchedule = store?.normalSchedule || '15:00 - 18:00';

  const slotLabel = order.deliveryTimeSlot === 'asap'
    ? `Entrega Prioritaria${order.asapTimeSlot ? ` (hora prevista: ${order.asapTimeSlot})` : ''}`
    : `Estándar (${normalSchedule})`;

  const handlePrint = () => {
    // 1. Set paper size attribute
    document.documentElement.setAttribute('data-paper-size', paperSize);

    // 2. Inyectar @page dinámico
    const styleId = 'dynamic-page-size';
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    if (paperSize === '80mm') {
      // margin top en la segunda hoja para que la impresora no "se coma" el texto
      style.textContent = '@page { size: 80mm auto; margin: 0; } @media print { #printable-ticket-clone { padding-top: 5mm; } }';
    } else {
      style.textContent = '@page { size: letter; margin: 12mm 10mm; }';
    }

    // 3. Clonar el ticket al final del body para que NO esté dentro del modal
    const original = document.getElementById('printable-ticket');
    let clone: HTMLElement | null = null;
    if (original) {
      clone = original.cloneNode(true) as HTMLElement;
      clone.id = 'printable-ticket-clone';
      clone.style.position = 'static';
      clone.style.left = 'auto';
      clone.style.top = 'auto';
      clone.style.margin = '0 auto';
      clone.style.maxWidth = paperSize === '80mm' ? '72mm' : '100%';
      clone.style.width = paperSize === '80mm' ? '72mm' : '100%';
      clone.style.padding = paperSize === '80mm' ? '2mm' : '0';
      clone.style.fontSize = paperSize === '80mm' ? '15px' : '16px';
      clone.style.fontWeight = '600';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      document.body.appendChild(clone);

      // Ocultar el original para que no se duplique
      original.style.display = 'none';
      original.id = 'printable-ticket-hidden';
    }

    // 4. Forzar reflow
    document.documentElement.offsetHeight;

    // 5. Imprimir
    window.print();

    // 6. Limpiar
    setTimeout(() => {
      document.documentElement.removeAttribute('data-paper-size');
      if (style) style.textContent = '';
      if (clone) clone.remove();
      // Restaurar el original
      const hidden = document.getElementById('printable-ticket-hidden');
      if (hidden) {
        hidden.id = 'printable-ticket';
        hidden.style.display = '';
      }
    }, 1000);
  };

  const handleTogglePaid = async () => {
    if (!onTogglePaid) return;
    setTogglingPaid(true);
    try {
      await onTogglePaid(order.id, !order.isPaid);
    } finally {
      setTogglingPaid(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:p-0 print:static print:block print:bg-white print:shadow-none print:border-none print:rounded-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            Pedido #{order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar (no se imprime) */}
        <div className="flex items-center justify-between gap-3 flex-wrap print:hidden mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Tamaño:</span>
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setPaperSize('80mm')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  paperSize === '80mm' ? 'bg-brand text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                🧾 80mm
              </button>
              <button
                onClick={() => setPaperSize('letter')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  paperSize === 'letter' ? 'bg-brand text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📄 Carta
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onTogglePaid && (
              <Button
                variant="outline"
                onClick={handleTogglePaid}
                disabled={togglingPaid}
                className={order.isPaid
                  ? 'border-green-500 text-green-700 hover:bg-green-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {order.isPaid ? 'Pagado' : 'Marcar pagado'}
              </Button>
            )}
            <Button onClick={handlePrint} className="bg-brand hover:bg-brand-dark text-white">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* TICKET — esto es lo único que se imprime */}
        <div
          id="printable-ticket"
          data-paper-size={paperSize}
          className="ticket-paper bg-white text-gray-900 mx-auto"
          style={{
            width: paperSize === '80mm' ? '80mm' : 'auto',
            maxWidth: paperSize === '80mm' ? '80mm' : '210mm',
            padding: paperSize === '80mm' ? '4mm 3mm' : '12mm',
            fontFamily: 'ui-monospace, "Courier New", monospace',
            fontSize: paperSize === '80mm' ? '16px' : '16px',
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          {/* Header del ticket */}
          <div className="text-center mb-2 pb-2 border-b border-dashed border-gray-400">
            <div className="font-bold text-lg">{storeName}</div>
            {storePhone && <div>Tel: {storePhone}</div>}
            {storeAddress && <div className="text-[12px]">{storeAddress}</div>}
          </div>

          {/* Info del pedido */}
          <div className="mb-2 pb-2 border-b border-dashed border-gray-400">
            <div className="flex justify-between">
              <span>Pedido:</span>
              <span className="font-bold">#{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Fecha:</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estado:</span>
              <span>{STATUS_LABELS[order.status] || order.status}</span>
            </div>
            <div className="flex justify-between">
              <span>Pago:</span>
              <span className={order.isPaid ? 'font-bold' : ''}>
                {order.isPaid ? 'PAGADO ✓' : 'PENDIENTE DE PAGO'}
              </span>
            </div>
          </div>

          {/* Datos de quien envía */}
          <div className="mb-2 pb-2 border-b border-dashed border-gray-400">
            <div className="font-bold mb-1">PERSONA QUE ENVÍA:</div>
            <div>{order.customerName}</div>
            <div>{order.customerPhone}</div>
            {order.customerEmail && <div>{order.customerEmail}</div>}
          </div>

          {/* Datos de quien recibe */}
          <div className="mb-2 pb-2 border-b border-dashed border-gray-400">
            <div className="font-bold mb-1">PERSONA QUE RECIBE:</div>
            <div>{order.recipientName || '—'}</div>
            <div>{order.recipientPhone || '—'}</div>
            <div>{order.recipientAddress}{order.recipientCity ? `, ${order.recipientCity}` : ''}</div>
            {order.recipientNotes && (
              <div className="text-[12px] italic mt-1">Notas: {order.recipientNotes}</div>
            )}
          </div>

          {/* Datos de entrega */}
          <div className="mb-2 pb-2 border-b border-dashed border-gray-400">
            <div className="font-bold mb-1">ENTREGA:</div>
            <div className="flex justify-between">
              <span>Fecha:</span>
              <span>{formatDeliveryDate(order.deliveryDate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Horario:</span>
              <span>{slotLabel}</span>
            </div>
            {order.deliveryZoneName && (
              <div className="flex justify-between">
                <span>Zona:</span>
                <span>{order.deliveryZoneName}</span>
              </div>
            )}
          </div>

          {/* Productos */}
          <div className="mb-2 pb-2 border-b border-dashed border-gray-400">
            <div className="font-bold mb-1">PRODUCTOS:</div>
            {order.items.map((item) => {
              const variantText = formatVariantInfo(item.variantInfo);
              const extrasText = formatExtrasInfo(item.extrasInfo, currency);
              return (
                <div key={item.id} className="mb-1">
                  <div className="flex justify-between">
                    <span className="flex-1 truncate">
                      {item.quantity}x {item.name}
                      {order.hasReservableItems && (item.variantInfo && item.variantInfo !== '[]') && (
                        <span className="text-amber-700 font-bold"> [RESERVADO]</span>
                      )}
                    </span>
                    <span>{formatPrice(item.price * item.quantity, currency)}</span>
                  </div>
                  {paperSize === 'letter' && (
                    <div className="text-[12px] text-gray-500">
                      {formatPrice(item.price, currency)} c/u
                    </div>
                  )}
                  {variantText && (
                    <div className="text-[12px] text-gray-600 pl-3">
                      ↳ Variante: {variantText}
                    </div>
                  )}
                  {extrasText && (
                    <div className="text-[12px] text-gray-600 pl-3">
                      ↳ Extras: {extrasText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totales */}
          <div className="mb-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío:</span>
              <span>{formatPrice(order.shippingCost, currency)}</span>
            </div>
            {order.deliverySurcharge > 0 && !order.hasReservableItems && (
              <div className="flex justify-between">
                <span>Costo de Entrega Prioritaria:</span>
                <span>+{formatPrice(order.deliverySurcharge, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-1 pt-1 border-t border-gray-400">
              <span>TOTAL:</span>
              <span>{formatPrice(order.total, currency)}</span>
            </div>
            {!order.isPaid && (
              <div className="mt-2 text-center font-bold border border-gray-400 rounded p-1">
                ⚠ PENDIENTE DE PAGO
              </div>
            )}
            {order.isPaid && (
              <div className="mt-2 text-center font-bold border border-green-600 text-green-700 rounded p-1">
                ✓ PAGADO
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-[12px] mt-2 pt-2 border-t border-dashed border-gray-400">
            <div>¡Gracias por su compra!</div>
            {store?.whatsappNumber && <div>WhatsApp: {store.whatsappNumber}</div>}
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
