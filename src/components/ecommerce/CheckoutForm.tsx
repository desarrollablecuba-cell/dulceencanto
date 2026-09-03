'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCartStore } from '@/store/cart-store';
import { useAppStore } from '@/store/app-store';
import { useCurrencyStore, formatPrice } from '@/store/currency-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, User, MapPin, MessageCircle, Truck, UserCheck, Calendar, Clock, Zap, Sparkles, Heart, Lock } from 'lucide-react';
import { ZoneSelector } from '@/components/ecommerce/ZoneSelector';
import { useCustomerStore } from '@/store/customer-store';
import { Confetti } from '@/components/ecommerce/Confetti';

interface SiteConfigData {
  whatsappNumber: string;
  freeShippingMin: number;
  minOrderAmount: number;
  asapSurchargeType: string;
  asapSurchargeValue: number;
  normalSchedule: string;
  /** Hora (formato HH:mm, hora Cuba) desde la que se ofrece ASAP. */
  asapStartHour?: string;
  /** Hora (formato HH:mm, hora Cuba) hasta la que se ofrece ASAP. */
  asapEndHour?: string;
  /** Hora límite (HH:mm, hora Cuba) para hacer pedidos same-day. Default "14:00". */
  maxOrderHour?: string;
  /** Horario de entrega para productos reservables (ej: "15:00 - 18:00"). */
  reservableDeliverySchedule?: string;
}

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

/**
 * Parsea un texto de tiempo estimado de entrega a horas.
 * Ejemplos soportados:
 *   - "72 horas" → 72
 *   - "24 horas" → 24
 *   - "1-2 días" → 24 (toma el primer número)
 *   - "2 días" → 48
 *   - "3 a 5 días" → 72 (toma el primer número)
 *   - cualquier otra cosa → 0 (sin restricción)
 */
function parseEstimatedHours(estimatedTime: string | undefined | null): number {
  if (!estimatedTime) return 0;
  const lower = estimatedTime.toLowerCase().trim();
  if (!lower) return 0;
  // Coincidir con "X horas" / "X hora"
  const hoursMatch = lower.match(/(\d+)\s*hora/);
  if (hoursMatch) return parseInt(hoursMatch[1], 10);
  // Coincidir con "X días" / "X día" / "X-a-Y días" (toma el primer número)
  if (lower.includes('día') || lower.includes('dia')) {
    const daysMatch = lower.match(/(\d+)/);
    if (daysMatch) return parseInt(daysMatch[1], 10) * 24;
  }
  return 0;
}

/**
 * Formatea una fecha YYYY-MM-DD a formato legible en español.
 * Ejemplo: "2026-08-19" → "19 de agosto de 2026"
 */
function formatDateSpanish(dateStr: string): string {
  if (!dateStr) return '';
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day) || month < 1 || month > 12) return dateStr;
  return `${day} de ${months[month - 1]} de ${year}`;
}

export function CheckoutForm() {
  const items = useCartStore((s) => s.items);
  const currency = useCurrencyStore((s) => s.currency);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const setView = useAppStore((s) => s.setView);
  const goBack = useAppStore((s) => s.goBack);
  const { toast } = useToast();

  // Flujo: paso 1 "Quien Recibe" → (si toggle OFF) paso 2 "Quien Envía" → éxito
  const [step, setStep] = useState<'recipient' | 'sender' | 'success'>('recipient');
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [createdOrder, setCreatedOrder] = useState<{
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientCity: string;
    items: { name: string; price: number; quantity: number; variantInfo?: string; extrasInfo?: string; isReservation?: boolean }[];
    total: number;
    shippingCost: number;
    asapSurcharge: number;
    deliveryDate: string;
    deliveryTimeSlot: string;
  } | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfigData | null>(null);

  // Toggle: "Recibe la misma persona que envía" — por defecto desactivado.
  // Si está ON, se usa la data del destinatario para ambos y se omite el paso 2.
  const [samePerson, setSamePerson] = useState(false);

  // Sesión del cliente (si está logueado, autocompleta datos)
  const customer = useCustomerStore((s) => s.customer);
  const customerHydrated = useCustomerStore((s) => s.hydrated);
  const hydrateCustomer = useCustomerStore((s) => s.hydrate);
  const setSession = useCustomerStore((s) => s.setSession);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);

  // Toggle para registrar como cliente nuevo (solo si NO está logueado)
  const [registerAsCustomer, setRegisterAsCustomer] = useState(false);
  const [registerPassword, setRegisterPassword] = useState('');
  const [selectedSavedRecipientId, setSelectedSavedRecipientId] = useState<string>('');

  // Hidratar sesión del cliente al montar + refrescar perfil para tener
  // los destinatarios guardados más recientes.
  useEffect(() => {
    if (!customerHydrated) {
      hydrateCustomer();
    } else if (customer) {
      // Ya hidratado pero hay sesión: refrescar perfil para asegurar
      // que los destinatarios guardados estén actualizados.
      const token = localStorage.getItem('diaz-customer-token');
      if (token) {
        fetch('/api/customers/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.customer) {
              updateCustomer(data.customer);
            }
          })
          .catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autocompletar los datos de "Quien Envía" y "Email del destinatario (samePerson)"
  // cuando el cliente está logueado. Solo rellena si el campo está vacío
  // (no sobrescribe lo que el cliente ya haya escrito manualmente).
  useEffect(() => {
    if (!customer) return;
    setFormData((f) => ({
      ...f,
      customerName: f.customerName || customer.name,
      customerPhone: f.customerPhone || customer.phone,
      customerEmail: f.customerEmail || customer.email,
      // Si samePerson está activado, también autocompletar el email del destinatario
      recipientEmail: f.recipientEmail || (samePerson ? customer.email : ''),
    }));
  }, [customer, samePerson]);

  const [formData, setFormData] = useState({
    // Datos de quien recibe (Step 1 — siempre)
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    recipientCity: '',
    recipientNotes: '',
    // Email del destinatario (solo visible cuando samePerson es true)
    recipientEmail: '',
    // Datos de quien envía/pide (Step 2 — solo si samePerson es false)
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    // Fecha y horario de entrega
    deliveryDate: '',
    deliveryTimeSlot: 'normal' as 'normal' | 'asap',
  });

  // Delivery zones state
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  // ASAP slots: horarios disponibles para Entrega Prioritaria
  const [asapSlots, setAsapSlots] = useState<{ time: string; available: boolean; reason: string }[]>([]);
  const [asapSlotsLoading, setAsapSlotsLoading] = useState(false);
  const [selectedAsapTime, setSelectedAsapTime] = useState<string>('');

  // Autocompletar TODOS los datos del destinatario cuando el cliente de Cuba
  // activa "samePerson" (misma persona recibe y pide). Usa los datos de su perfil.
  useEffect(() => {
    if (!customer || !samePerson) return;
    if (customer.country !== 'CU') return;
    setFormData((f) => ({
      ...f,
      recipientName: customer.name,
      recipientPhone: customer.phone,
      recipientAddress: customer.address || '',
      recipientEmail: customer.email,
    }));
    setSelectedZoneId(customer.deliveryZoneId || '');
  }, [customer, samePerson]);

  // Al cargar el checkout con un cliente logueado que tiene familiares guardados,
  // autocompletar por defecto con el PRIMER familiar (y su zona).
  useEffect(() => {
    if (!customer || samePerson) return;
    if (customer.savedRecipients.length === 0) return;
    const r = customer.savedRecipients[0];
    setSelectedSavedRecipientId(r.id);
    setFormData((f) => ({
      ...f,
      recipientName: r.name,
      recipientPhone: r.phone,
      recipientAddress: r.address,
      recipientNotes: r.notes,
    }));
    if (r.deliveryZoneId) {
      setSelectedZoneId(r.deliveryZoneId);
    }
    // Solo al montar — no re-ejecutar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  // Manejo inteligente del toggle: al activarse/desactivarse limpia o autocompleta.
  const handleSamePersonToggle = () => {
    const next = !samePerson;
    setSamePerson(next);

    if (next) {
      // ── ACTIVANDO: limpiar TODO y colocar los datos del cliente que pide ──
      setSelectedSavedRecipientId('');
      if (customer) {
        setFormData((f) => ({
          ...f,
          recipientName: customer.name,
          recipientPhone: customer.phone,
          recipientAddress: customer.address || '',
          recipientNotes: '',
          recipientEmail: customer.email,
        }));
        // Solo sobrescribir la zona si el cliente tiene una guardada
        if (customer.deliveryZoneId) {
          setSelectedZoneId(customer.deliveryZoneId);
        }
      } else {
        setFormData((f) => ({
          ...f,
          recipientName: '',
          recipientPhone: '',
          recipientAddress: '',
          recipientNotes: '',
          recipientEmail: '',
        }));
        // No limpiar la zona
      }
    } else {
      // ── DESACTIVANDO: limpiar TODO y colocar el primer familiar guardado ──
      setFormData((f) => ({
        ...f,
        recipientEmail: '',
        recipientNotes: '',
      }));
      if (customer && customer.savedRecipients.length > 0) {
        const r = customer.savedRecipients[0];
        setSelectedSavedRecipientId(r.id);
        setFormData((f) => ({
          ...f,
          recipientName: r.name,
          recipientPhone: r.phone,
          recipientAddress: r.address,
          recipientNotes: r.notes,
          recipientEmail: '',
        }));
        // Solo sobrescribir la zona si el destinatario tiene una guardada
        if (r.deliveryZoneId) {
          setSelectedZoneId(r.deliveryZoneId);
        }
      } else {
        setSelectedSavedRecipientId('');
        setFormData((f) => ({
          ...f,
          recipientName: '',
          recipientPhone: '',
          recipientAddress: '',
          recipientNotes: '',
          recipientEmail: '',
        }));
        // No limpiar la zona — dejar la que ya estaba seleccionada
      }
    }
  };

  // Fetch site config + delivery zones
  useEffect(() => {
    fetch('/api/siteconfig')
      .then((res) => res.json())
      .then((data) => setSiteConfig(data))
      .catch(console.error);

    fetch('/api/delivery-zones')
      .then((res) => res.json())
      .then((data: DeliveryZone[]) => {
        const sorted = (data || [])
          .filter((z) => z && z.active)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setDeliveryZones(sorted);
        if (sorted.length > 0 && !selectedZoneId) {
          setSelectedZoneId(sorted[0].id);
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId) ?? null;

  const total = getTotal();
  // Lógica de envío:
  //  - Si el subtotal ≥ freeShippingMin → envío GRATIS (pero se requiere zona para logística).
  //  - Si no, el costo lo define el precio de la zona de delivery seleccionada.
  const freeShippingMin = siteConfig?.freeShippingMin ?? 100;
  const minOrderAmount = siteConfig?.minOrderAmount ?? 0;
  const freeShipping = total >= freeShippingMin;
  const meetsMinOrder = minOrderAmount <= 0 || total >= minOrderAmount;
  const zonePrice = selectedZone ? Number(selectedZone.price) || 0 : 0;
  const shippingCost = freeShipping ? 0 : zonePrice;

  // Cálculo del surcharge por entrega ASAP (espeja la lógica del servidor).
  //  - Si el slot es 'normal' → 0
  //  - Si la zona tiene override → usar type/value de la zona
  //  - Si no → usar type/value global del SiteConfig
  //  - IMPORTANTE: asapSurchargePreview se calcula SIEMPRE que la zona permita
  //    ASAP, para mostrar el recargo al cliente antes de que lo seleccione.
  //    asapSurcharge (el que se cobra) solo aplica cuando deliveryTimeSlot === 'asap'.
  // ── Cálculo del surcharge ASAP ──
  // (isNearTermDelivery y asapSurchargePreview se calculan DESPUÉS de todayStr/tomorrowStr)
  const hasReservableItemsInCart = items.length > 0 && items.some((i) => i.isReservation);

  // Texto del horario normal (configurable desde el admin)
  const normalSchedule = siteConfig?.normalSchedule || '15:00 - 18:00';
  // Para obtener la hora exacta de Cuba usamos Intl.DateTimeFormat con
  // timeZone: 'America/Havana'. Esto funciona independientemente de la
  // zona horaria del navegador del cliente.

  // Hora actual en Cuba (America/Havana) como objeto Date "raw" con
  // componentes ya ajustados a la zona de Cuba.
  const nowInCuba = (() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Havana',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const y = parseInt(get('year'));
    const m = parseInt(get('month')) - 1; // Date usa 0-11
    const d = parseInt(get('day'));
    const h = parseInt(get('hour')) % 24; // hour12:false puede dar "24" en lugar de "00"
    const min = parseInt(get('minute'));
    return { year: y, month: m, day: d, hour: h, minute: min };
  })();

  // Fecha de HOY en formato YYYY-MM-DD basada en la hora de Cuba.
  const todayStr = `${nowInCuba.year}-${String(nowInCuba.month + 1).padStart(2, '0')}-${String(nowInCuba.day).padStart(2, '0')}`;

  // Hora límite para pedidos same-day. Default "14:00" (configurable desde el admin).
  const maxOrderHour = (siteConfig?.maxOrderHour || '14:00').trim();
  const [maxH, maxM] = maxOrderHour.split(':').map((n) => parseInt(n, 10) || 0);
  const maxOrderMinutes = maxH * 60 + maxM;

  // ¿Es antes de la hora límite en Cuba? Si sí, aún hay tiempo para entregar hoy.
  const nowMinutes = nowInCuba.hour * 60 + nowInCuba.minute;
  const canDeliverToday = nowMinutes < maxOrderMinutes;

  // Fecha de mañana en formato YYYY-MM-DD (sumar 1 día a la fecha de Cuba).
  const tomorrowDate = new Date(nowInCuba.year, nowInCuba.month, nowInCuba.day + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  // Determinar si la entrega es "próxima" (hoy o mañana)
  const isNearTermDelivery = formData.deliveryDate === todayStr || formData.deliveryDate === tomorrowStr;

  // ── Cálculo del surcharge ASAP (DESPUÉS de isNearTermDelivery) ──
  const asapSurchargePreview = (() => {
    if (!selectedZone?.allowsPriorityDelivery) return 0;
    if (hasReservableItemsInCart && !isNearTermDelivery) return 0;
    let type = 'fixed';
    let value = 0;
    if (selectedZone?.asapSurchargeOverride) {
      type = selectedZone.asapSurchargeType || 'fixed';
      value = Number(selectedZone.asapSurchargeValue) || 0;
    } else {
      type = siteConfig?.asapSurchargeType || 'fixed';
      value = Number(siteConfig?.asapSurchargeValue) || 0;
    }
    if (type === 'percent') {
      return Math.round(((total + shippingCost) * value) / 100 * 100) / 100;
    }
    return value;
  })();

  const asapSurcharge = formData.deliveryTimeSlot === 'asap' ? asapSurchargePreview : 0;
  const finalTotal = total + shippingCost + asapSurcharge;

  // ── Fecha mínima de entrega basada en el tiempo estimado de la zona ──
  // Si la zona tiene estimatedTime = "72 horas", el cliente no puede elegir
  // una fecha anterior a hoy + 72 horas. Si es "1-2 días", se toma el
  // primer número (1 día = 24 horas). Si no hay estimatedTime o no se
  // puede parsear, se usa la fecha de hoy (o mañana si ya pasó maxOrderHour).
  //
  // ── IMPORTANTE: Reservas ──
  // Si el carrito tiene items reservables (isReservation=true), la fecha
  // mínima se subordina al producto con MAYOR cantidad de días de antelación
  // (reservationDays). Esto asegura que la fecha seleccionada sea válida
  // para TODOS los items del carrito, sin bloquear el flujo.
  const minDeliveryDate = useMemo(() => {
    // 1. Calcular fecha mínima por zona (estimatedTime)
    let minMs = 0;
    const zoneHours = parseEstimatedHours(selectedZone?.estimatedTime);
    if (zoneHours > 0) {
      minMs = zoneHours * 60 * 60 * 1000;
    }

    // 2. Sumar días de antelación de reservas (si hay items reservables)
    // Tomar el MÁXIMO reservationDays de todos los items reservables en el carrito.
    const maxReservationDays = items.reduce((max, item) => {
      if (item.isReservation && item.reservationDays && item.reservationDays > max) {
        return item.reservationDays;
      }
      return max;
    }, 0);
    if (maxReservationDays > 0) {
      // Convertir días a ms y sumar a minMs (no reemplazar, porque la zona
      // puede tener su propio tiempo estimado que se suma a la antelación)
      const reservationMs = maxReservationDays * 24 * 60 * 60 * 1000;
      if (reservationMs > minMs) {
        minMs = reservationMs;
      }
    }

    if (minMs <= 0) {
      return canDeliverToday ? todayStr : tomorrowStr;
    }
    const min = new Date(nowInCuba.year, nowInCuba.month, nowInCuba.day, nowInCuba.hour, nowInCuba.minute);
    min.setTime(min.getTime() + minMs);
    return `${min.getFullYear()}-${String(min.getMonth() + 1).padStart(2, '0')}-${String(min.getDate()).padStart(2, '0')}`;
  }, [selectedZone?.estimatedTime, canDeliverToday, todayStr, tomorrowStr, nowInCuba.year, nowInCuba.month, nowInCuba.day, nowInCuba.hour, nowInCuba.minute, items]);

  // ── Cálculo de reservables en el carrito ──
  // Se calcula aquí (temprano) para que asapDeliveryDate y todos los useEffect
  // puedan usar estos valores sin error de "accessed before initialization".
  const hasReservableItems = items.length > 0 && items.some((i) => i.isReservation);
  const maxReservationDays = items.reduce((max, item) => {
    if (item.isReservation && item.reservationDays && item.reservationDays > max) {
      return item.reservationDays;
    }
    return max;
  }, 0);
  // Si hay reservables con antelación > 0, la entrega NO puede ser hoy
  const hasReservationDelay = hasReservableItems && maxReservationDays > 0;

  // Fecha por defecto en modo Normal:
  //   - Usa minDeliveryDate como base (respeta tiempo estimado de la zona)
  //   - Si minDeliveryDate ya pasó la hora límite, usa tomorrowStr
  const defaultNormalDate = useMemo(() => {
    return minDeliveryDate || (canDeliverToday ? todayStr : tomorrowStr);
  }, [minDeliveryDate, canDeliverToday, todayStr, tomorrowStr]);

  // ASAP implica entrega hoy: forzar la fecha a hoy y deshabilitar el date picker.
  const isAsap = formData.deliveryTimeSlot === 'asap';

  // Inicializar la fecha de entrega por defecto (si está vacía y no es ASAP).
  // - Antes de la hora límite Cuba → hoy
  // - Hora límite o después → mañana
  useEffect(() => {
    if (!isAsap && !formData.deliveryDate) {
      setFormData((f) => ({ ...f, deliveryDate: defaultNormalDate }));
    }
  }, [isAsap, defaultNormalDate, formData.deliveryDate]);

  // ── Auto-corregir fecha si queda por debajo del mínimo (por reservas) ──
  // Si el cliente añade un producto reservable al carrito con días de
  // antelación mayores que la fecha seleccionada, automáticamente ajustamos
  // la fecha al mínimo válido. Esto NO bloquea el carrito, solo lo corrige.
  useEffect(() => {
    if (!isAsap && formData.deliveryDate && minDeliveryDate && formData.deliveryDate < minDeliveryDate) {
      setFormData((f) => ({ ...f, deliveryDate: minDeliveryDate }));
    }
  }, [isAsap, minDeliveryDate, formData.deliveryDate]);

  // (El useEffect de "Cargar horarios disponibles" se movió más abajo,
  // después de la definición de asapDeliveryDate, para evitar el error
  // "Cannot access 'asapDeliveryDate' before initialization".)

  // ── Reset a "normal" cuando la zona seleccionada NO permite entrega prioritaria ──
  // Si el usuario tenía ASAP seleccionado y cambia a una zona sin prioridad,
  // volvemos automáticamente a "normal" para evitar enviar un pedido ASAP a una
  // zona que no lo soporta.
  useEffect(() => {
    if (!selectedZone) return;
    if (!selectedZone.allowsPriorityDelivery && formData.deliveryTimeSlot === 'asap') {
      setFormData((f) => ({
        ...f,
        deliveryTimeSlot: 'normal',
        // Si ASAP forzó la fecha a hoy, restaurar a la fecha normal por defecto.
        deliveryDate: f.deliveryDate === todayStr ? defaultNormalDate : f.deliveryDate,
      }));
    }
  }, [selectedZone, formData.deliveryTimeSlot, todayStr, defaultNormalDate]);

  // ── ¿Está disponible la opción ASAP en este momento? ──
  // NUEVO (Task 3): ASAP SIEMPRE está disponible si la zona lo permite
  // (allowsPriorityDelivery = true). Ya NO se bloquea fuera del horario
  // configurado; en su lugar, se muestra al cliente un mensaje indicando
  // que la entrega será "hoy" o "mañana" a la hora de apertura.
  const asapAvailable = !!selectedZone?.allowsPriorityDelivery;

  // (hasReservableItems, maxReservationDays, hasReservationDelay ya calculados arriba)

  // ── Etiqueta dinámica para la opción ASAP ──
  // Calcula el mensaje a mostrar al cliente según la hora actual de Cuba
  // y el rango de horario ASAP configurado (asapStartHour – asapEndHour).
  //   - Dentro del horario → "Entrega Prioritaria (ahora)"
  //   - Antes de la apertura de hoy → "Entrega Prioritaria (hoy a las HH:MM)"
  //   - Después del cierre → "Entrega Prioritaria (mañana a las HH:MM)"
  //   - CON reservables → "Entrega Prioritaria (el YYYY-MM-DD)" (fecha mínima)
  const asapLabel = useMemo(() => {
    if (!asapAvailable) return '';
    // Mostrar la fecha seleccionada por el cliente
    if (formData.deliveryDate) {
      return `Entrega Prioritaria (el ${formatDateSpanish(formData.deliveryDate)})`;
    }
    const start = (siteConfig?.asapStartHour || '06:00').trim();
    const end = (siteConfig?.asapEndHour || '22:00').trim();
    const parseHHMM = (s: string): number | null => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(s);
      if (!m) return null;
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
      return h * 60 + min;
    };
    const startMin = parseHHMM(start);
    const endMin = parseHHMM(end);
    if (startMin === null || endMin === null) return 'Entrega Prioritaria';

    // ¿Estamos dentro del horario ASAP hoy?
    const withinHours = startMin <= endMin
      ? nowMinutes >= startMin && nowMinutes < endMin
      : nowMinutes >= startMin || nowMinutes < endMin; // rango que cruza medianoche

    if (withinHours) return 'Entrega Prioritaria (ahora)';
    if (nowMinutes < startMin) {
      // Antes de la apertura de hoy
      return `Entrega Prioritaria (hoy a las ${start})`;
    }
    // Después del cierre → mañana a la apertura
    return `Entrega Prioritaria (mañana a las ${start})`;
  }, [asapAvailable, formData.deliveryDate, nowMinutes]);

  // Indica si el ASAP se realizará "mañana" (vs "hoy"). Útil para forzar
  // la fecha de entrega y mostrar mensajes contextuales.
  //   - Dentro del horario ASAP → hoy
  //   - Antes de la apertura de hoy → hoy (se entrega a la hora de apertura)
  //   - Después del cierre → mañana (se entrega mañana a la apertura)
  const asapIsTomorrow = useMemo(() => {
    if (!asapAvailable) return false;
    const start = (siteConfig?.asapStartHour || '06:00').trim();
    const end = (siteConfig?.asapEndHour || '22:00').trim();
    const parseHHMM = (s: string): number | null => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(s);
      if (!m) return null;
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
      return h * 60 + min;
    };
    const startMin = parseHHMM(start);
    const endMin = parseHHMM(end);
    if (startMin === null || endMin === null) return false;
    // Dentro del horario → hoy
    const withinHours = startMin <= endMin
      ? nowMinutes >= startMin && nowMinutes < endMin
      : nowMinutes >= startMin || nowMinutes < endMin;
    if (withinHours) return false;
    // Antes de la apertura → hoy (todavía no abrió, se entregará a la apertura)
    if (nowMinutes < startMin) return false;
    // Después del cierre → mañana
    return true;
  }, [asapAvailable, siteConfig?.asapStartHour, siteConfig?.asapEndHour, nowMinutes]);

  // Fecha de entrega forzada para ASAP: hoy si estamos dentro del horario
  // o antes de la apertura; mañana si ya cerramos.
  // PERO si hay productos reservables en el carrito, la fecha mínima debe
  // respetar los días de antelación del producto con mayor reservationDays.
  // En ese caso, ASAP se ajusta a la fecha mínima calculada (no hoy/mañana).
  // (hasReservableItems y maxReservationDays ya están calculados arriba)
  const asapDeliveryDate = hasReservableItems && maxReservationDays > 0
    ? minDeliveryDate  // Usar la fecha mínima calculada (hoy + reservationDays)
    : (asapIsTomorrow ? tomorrowStr : todayStr);

  // ── Cargar horarios disponibles para Entrega Prioritaria ──
  // Cuando el cliente selecciona ASAP y hay zona, fetch de slots disponibles.
  // IMPORTANTE: la fecha que se envía al endpoint es la fecha real de entrega
  // (asapDeliveryDate), NO la fecha de hoy. Si hay reservables con antelación,
  // la fecha de entrega es futura (hoy + reservationDays) y los slots deben
  // calcularse para esa fecha, no para hoy.
  // NOTA: Este useEffect va DESPUÉS de la definición de asapDeliveryDate
  // para evitar el error "Cannot access 'asapDeliveryDate' before initialization".
  useEffect(() => {
    if (!isAsap || !selectedZone) {
      setAsapSlots([]);
      setAsapSlotsLoading(false);
      return;
    }
    setAsapSlotsLoading(true);
    setAsapSlots([]);
    // Usar la fecha seleccionada por el cliente (no forzar asapDeliveryDate)
    const fetchDate = formData.deliveryDate || `${nowInCuba.year}-${String(nowInCuba.month + 1).padStart(2, '0')}-${String(nowInCuba.day).padStart(2, '0')}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    fetch(`/api/orders/asap-slots?zoneId=${selectedZone.id}&date=${fetchDate}`, { signal: controller.signal })
      .then((r) => r.json().catch(() => ({ slots: [] })))
      .then((data) => {
        clearTimeout(timeoutId);
        const slots = Array.isArray(data?.slots) ? data.slots : [];
        setAsapSlots(slots);
        setAsapSlotsLoading(false);
        const firstAvail = slots.find((s: { available: boolean }) => s.available);
        if (firstAvail) {
          setSelectedAsapTime(firstAvail.time);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setAsapSlots([]);
        setAsapSlotsLoading(false);
      });
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isAsap, selectedZone, formData.deliveryDate, nowInCuba.year, nowInCuba.month, nowInCuba.day]);

  // Función central que envía el pedido al servidor.
  // `customerData` permite sobreescribir los datos de quien pide (caso samePerson).
  const submitOrder = async (customerData?: { name: string; email: string; phone: string }) => {
    // Guard contra doble submit
    if (loading) return;
    const customerName = customerData?.name ?? formData.customerName;
    const customerEmail = customerData?.email ?? formData.customerEmail;
    const customerPhone = customerData?.phone ?? formData.customerPhone;

    setLoading(true);
    try {
      const recipientCity = selectedZone?.name ?? '';

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          recipientName: formData.recipientName,
          recipientPhone: formData.recipientPhone,
          recipientAddress: formData.recipientAddress,
          recipientCity,
          recipientNotes: formData.recipientNotes,
          deliveryDate: formData.deliveryDate || undefined,
          deliveryTimeSlot: formData.deliveryTimeSlot,
          asapTimeSlot: formData.deliveryTimeSlot === 'asap' ? selectedAsapTime : undefined,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            variantInfo: item.variantInfo || '[]',
            extrasInfo: item.extrasInfo || '[]',
          })),
          deliveryZoneId: selectedZoneId || undefined,
          shippingCost,
        }),
      });

      const order = await res.json();
      if (res.ok) {
        // Si el cliente NO está logueado y activó "Registrarme como cliente",
        // registramos la cuenta después de crear el pedido (no bloquea el flujo).
        // Usar los datos correctos según samePerson: si samePerson, usar datos del destinatario;
        // si no, usar datos de quien envía.
        const regName = samePerson ? formData.recipientName : formData.customerName;
        const regEmail = samePerson ? formData.recipientEmail : formData.customerEmail;
        const regPhone = samePerson ? formData.recipientPhone : formData.customerPhone;
        // La dirección del cliente es la dirección de entrega si samePerson,
        // o la dirección de quien envía (que no se captura, usar dirección del destinatario como fallback)
        const regAddress = samePerson ? formData.recipientAddress : formData.recipientAddress;
        const regCountry = samePerson ? 'CU' : 'US';

        if (registerAsCustomer && !customer && regEmail && registerPassword.length >= 6) {
          try {
            const regRes = await fetch('/api/customers/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: regName,
                phone: regPhone,
                email: regEmail,
                password: registerPassword,
                country: regCountry,
                address: regAddress,
                deliveryZoneId: selectedZoneId || undefined,
                deliveryZoneName: selectedZone?.name || undefined,
              }),
            });
            if (regRes.ok) {
              const regData = await regRes.json();
              setSession(regData.customer, regData.token);
              // Notificación nativa de la app (toast) — no usar alert()
              toast({
                title: '¡Cuenta creada!',
                description: `Bienvenido/a ${regData.customer.name}. Tu perfil guardará tus próximos destinatarios.`,
                duration: 5000,
              });
            } else {
              const err = await regRes.json().catch(() => ({}));
              toast({
                title: 'No se pudo registrar la cuenta',
                description: err.error || 'Tu pedido se procesó igualmente.',
                variant: 'destructive',
              });
            }
          } catch {
            /* no bloquear el éxito del pedido */
          }
        }

        // Guardar el destinatario actual en el perfil del cliente si está logueado
        // (o si acabamos de registrarlo) y NO es samePerson (para no duplicar el propio perfil).
        // Si el cliente se acaba de registrar, el token ya está en localStorage (setSession lo guardó).
        if (!samePerson && formData.recipientName && formData.recipientAddress) {
          try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('diaz-customer-token') : null;
            // Solo guardar si hay token Y no es un destinatario ya seleccionado de la lista
            if (token && !selectedSavedRecipientId) {
              await fetch('/api/customers/recipients', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  label: 'Destinatario reciente',
                  name: formData.recipientName,
                  phone: formData.recipientPhone,
                  address: formData.recipientAddress,
                  notes: formData.recipientNotes,
                  deliveryZoneId: selectedZoneId || null,
                }),
              });
            }
          } catch {
            /* best-effort, no bloquea el flujo */
          }
        }

        setOrderNumber(order.orderNumber);
        setCreatedOrder({
          recipientName: formData.recipientName,
          recipientPhone: formData.recipientPhone,
          recipientAddress: formData.recipientAddress,
          recipientCity,
          items: items.map((item) => ({ name: item.name, price: item.price, quantity: item.quantity, variantInfo: item.variantInfo, extrasInfo: item.extrasInfo, isReservation: item.isReservation })),
          total: order.total,
          shippingCost: order.shippingCost,
          asapSurcharge: order.deliverySurcharge,
          deliveryDate: formData.deliveryDate,
          deliveryTimeSlot: formData.deliveryTimeSlot,
        });
        setStep('success');
        // Abrir WhatsApp del negocio con el resumen del pedido
        if (order.whatsappUrl) {
          setTimeout(() => window.open(order.whatsappUrl, '_blank'), 1500);
        }
        // Guardar el último pedido en localStorage para que clientes no registrados
        // puedan ver su pedido en "Mis Pedidos" aunque no tengan cuenta.
        try {
          const lastOrder = {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: samePerson ? formData.recipientName : formData.customerName,
            customerEmail: samePerson ? formData.recipientEmail : formData.customerEmail,
            customerPhone: samePerson ? formData.recipientPhone : formData.customerPhone,
            recipientName: formData.recipientName,
            recipientPhone: formData.recipientPhone,
            recipientAddress: formData.recipientAddress,
            recipientCity,
            items: items.map((item) => ({ name: item.name, price: item.price, quantity: item.quantity, image: item.image, variantInfo: item.variantInfo, extrasInfo: item.extrasInfo, isReservation: item.isReservation })),
            total: order.total,
            shippingCost: order.shippingCost,
            asapSurcharge: order.deliverySurcharge,
            deliveryDate: formData.deliveryDate,
            deliveryTimeSlot: formData.deliveryTimeSlot,
            asapTimeSlot: formData.deliveryTimeSlot === 'asap' ? selectedAsapTime : null,
            status: 'pending',
            isPaid: false,
            createdAt: new Date().toISOString(),
          };
          // Guardar lista de últimos pedidos (máx 10)
          const existing = JSON.parse(localStorage.getItem('diaz-last-orders') || '[]');
          existing.unshift(lastOrder);
          localStorage.setItem('diaz-last-orders', JSON.stringify(existing.slice(0, 10)));
        } catch { /* ignore */ }
        clearCart();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast({ title: 'Error', description: order.error || 'Error al procesar el pedido', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión. Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Paso 1 (recipient): si samePerson es true → confirma el pedido directamente;
  // si es false → pasa al paso 2 (sender).
  const handleRecipientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipientName || !formData.recipientPhone || !formData.recipientAddress) {
      toast({ title: 'Campos requeridos', description: 'Completa nombre, teléfono y dirección de quien recibe.', variant: 'destructive' });
      return;
    }
    if (!selectedZoneId) {
      toast({ title: 'Selecciona la zona', description: 'Debes elegir una zona de delivery para continuar.', variant: 'destructive' });
      return;
    }
    if (!formData.deliveryDate) {
      toast({ title: 'Fecha de entrega', description: 'Selecciona la fecha en que deseas recibir el pedido.', variant: 'destructive' });
      return;
    }
    // Validación de horario de Cuba: si el cliente elige entrega HOY en modo
    // Normal pero ya pasó la hora límite (maxOrderHour), no se puede entregar
    // hoy (sólo ASAP puede, si la zona lo permite).
    if (!isAsap && formData.deliveryDate === todayStr && !canDeliverToday) {
      toast({
        title: 'Entrega hoy no disponible',
        description: asapAvailable
          ? `Ya pasaron las ${maxOrderHour} (hora Cuba) y no podemos entregar hoy en horario normal. Elige una fecha futura o selecciona "Entrega Prioritaria" para entrega urgente.`
          : `Ya pasaron las ${maxOrderHour} (hora Cuba) y no podemos entregar hoy en horario normal. Por favor elige una fecha futura. Esta zona no tiene habilitada la entrega prioritaria.`,
        variant: 'destructive',
      });
      return;
    }
    // Validación de fecha mínima: si la zona tiene tiempo estimado (ej: 72 horas),
    // el cliente no puede elegir una fecha anterior a la mínima calculada.
    // También incluye días de antelación de reservas si hay items reservables.
    // NOTA: Esta validación también aplica para ASAP cuando hay reservables,
    // porque en ese caso asapDeliveryDate se ajusta a minDeliveryDate.
    if (formData.deliveryDate < minDeliveryDate) {
      const hours = parseEstimatedHours(selectedZone?.estimatedTime);
      const maxReservationDays = items.reduce((max, item) => {
        if (item.isReservation && item.reservationDays && item.reservationDays > max) {
          return item.reservationDays;
        }
        return max;
      }, 0);
      let description: string;
      if (maxReservationDays > 0 && hours > 0) {
        description = `Esta zona requiere ${selectedZone?.estimatedTime} para la entrega y tienes productos reservables que requieren ${maxReservationDays} día(s) de antelación. La fecha más pronto disponible es ${formatDateSpanish(minDeliveryDate)}.`;
      } else if (maxReservationDays > 0) {
        description = `Tienes productos reservables que requieren ${maxReservationDays} día(s) de antelación. La fecha más pronto disponible es ${formatDateSpanish(minDeliveryDate)}.`;
      } else if (hours > 0) {
        description = `Esta zona requiere ${selectedZone?.estimatedTime} para la entrega. La fecha más pronto disponible es ${formatDateSpanish(minDeliveryDate)}.`;
      } else {
        description = 'La fecha seleccionada no es válida para esta zona.';
      }
      toast({
        title: 'Fecha demasiado pronto',
        description,
        variant: 'destructive',
      });
      return;
    }

    if (samePerson) {
      // La misma persona recibe y pide: usamos los datos del destinatario para ambos.
      if (!formData.recipientEmail) {
        toast({ title: 'Correo requerido', description: 'Ingresa tu correo electrónico para continuar.', variant: 'destructive' });
        return;
      }
      // Si activó registro, validar contraseña
      if (registerAsCustomer && !customer && registerPassword.length < 6) {
        toast({ title: 'Contraseña muy corta', description: 'Mínimo 6 caracteres para crear tu cuenta.', variant: 'destructive' });
        return;
      }
      await submitOrder({
        name: formData.recipientName,
        email: formData.recipientEmail,
        phone: formData.recipientPhone,
      });
    } else {
      // Personas diferentes: ir al paso 2 para capturar los datos de quien envía.
      setStep('sender');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Paso 2 (sender): confirma el pedido con los datos de quien envía.
  const handleSenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) {
      toast({ title: 'Campos requeridos', description: 'Completa nombre, teléfono y correo electrónico.', variant: 'destructive' });
      return;
    }
    // Si activó registro, validar contraseña
    if (registerAsCustomer && !customer && registerPassword.length < 6) {
      toast({ title: 'Contraseña muy corta', description: 'Mínimo 6 caracteres para crear tu cuenta.', variant: 'destructive' });
      return;
    }
    await submitOrder();
  };

  // Autocompletar desde un destinatario guardado
  const applySavedRecipient = (recipientId: string) => {
    setSelectedSavedRecipientId(recipientId);
    if (!recipientId || !customer) return;
    const r = customer.savedRecipients.find((x) => x.id === recipientId);
    if (!r) return;
    setFormData((f) => ({
      ...f,
      recipientName: r.name,
      recipientPhone: r.phone,
      recipientAddress: r.address,
      recipientNotes: r.notes,
    }));
    if (r.deliveryZoneId) setSelectedZoneId(r.deliveryZoneId);
  };

  // Build WhatsApp message
  const buildWhatsAppUrl = () => {
    if (!siteConfig?.whatsappNumber || !createdOrder) return '#';
    const phone = siteConfig.whatsappNumber.replace(/[^0-9]/g, '');
    // Formato de cada línea: si el item tiene variantes, las listamos entre paréntesis
    const itemsText = createdOrder.items.map((i) => {
      let line = i.isReservation ? `* ${i.name} [RESERVADO]` : `* ${i.name}`;
      // Parsear variantInfo (JSON string con [{ groupName, optionName }])
      if (i.variantInfo) {
        try {
          const variants = JSON.parse(i.variantInfo);
          if (Array.isArray(variants) && variants.length > 0) {
            const variantText = variants
              .map((v: { groupName?: string; optionName?: string }) =>
                `${v.groupName || 'Opción'}: ${v.optionName || ''}`.trim()
              )
              .join(', ');
            if (variantText) line += ` (${variantText})`;
          }
        } catch { /* ignore parse error */ }
      }
      // Parsear extrasInfo (JSON string con [{ name, price }])
      if (i.extrasInfo) {
        try {
          const extras = JSON.parse(i.extrasInfo);
          if (Array.isArray(extras) && extras.length > 0) {
            const extrasText = extras
              .map((e: { name?: string; price?: number }) =>
                e.name ? `+${e.name}` : ''
              )
              .filter(Boolean)
              .join(', ');
            if (extrasText) line += ` [${extrasText}]`;
          }
        } catch { /* ignore parse error */ }
      }
      line += ` x${i.quantity} = ${formatPrice(i.price * i.quantity, currency)}`;
      return line;
    }).join('\n');
    // Totales del vale: CUP es la moneda de operación local y USD la referencia
    // internacional (1 USD = 700 CUP). Así el negocio ve ambos en el WhatsApp.
    const usdRate = 700;
    const cupFmt = (n: number) => `₱${Math.round(n).toLocaleString('es-CU')}`;
    const usdFmt = (n: number) => `$${(n / usdRate).toFixed(2)}`;
    const senderName = samePerson ? createdOrder.recipientName : formData.customerName;
    const senderEmail = samePerson ? formData.recipientEmail : formData.customerEmail;
    const senderPhone = samePerson ? createdOrder.recipientPhone : formData.customerPhone;
    const sameNote = samePerson ? '\n_(Misma persona recibe y pide)_' : '';
    const slotLabel = createdOrder.deliveryTimeSlot === 'asap'
      ? `Entrega Prioritaria ${selectedAsapTime ? `(hora prevista: ${selectedAsapTime})` : '(urgente)'}`
      : `Normal (${normalSchedule})`;
    const dateLine = createdOrder.deliveryDate
      ? `\n*Entrega:* ${formatDateSpanish(createdOrder.deliveryDate)} · ${slotLabel}`
      : `\n*Entrega:* ${slotLabel}`;
    const subtotal = createdOrder.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const surchargeCup = createdOrder.asapSurcharge > 0
      ? `\nEntrega Prioritaria: ${cupFmt(createdOrder.asapSurcharge)}`
      : '';
    const message = `🧁 *DULCE ENCANTO* — Eventos & Repostería\n*NUEVO PEDIDO* ${orderNumber}\n\n*Persona que Envía:*\n${senderName}\n${senderEmail}\n${senderPhone}${sameNote}\n\n*Persona que Recibe:*\n${createdOrder.recipientName}\n${createdOrder.recipientPhone}\n${createdOrder.recipientAddress}, ${createdOrder.recipientCity}${dateLine}\n${formData.recipientNotes ? `Notas: ${formData.recipientNotes}\n` : ''}\n*Productos:*\n${itemsText}\n\nSubtotal: ${cupFmt(subtotal)}\nEnvío: ${cupFmt(createdOrder.shippingCost)}${surchargeCup}\n*Total: ${cupFmt(createdOrder.total)} (≈ ${usdFmt(createdOrder.total)} USD)*\n\n_Pago se gestiona externamente_`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  if (items.length === 0 && step !== 'success') {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Tu carrito está vacío</p>
        <Button variant="outline" className="mt-4" onClick={() => setView('home')}>
          Ver Productos
        </Button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <>
        {/* Confetti para celebrar el pedido completado */}
        <Confetti active={true} pieces={80} duration={5000} />
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Pedido Registrado!</h2>
          <p className="text-gray-600 mb-4">
            Tu pedido ha sido registrado exitosamente. Nos pondremos en contacto contigo para coordinar el pago y la entrega.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500">Número de Pedido</p>
            <p className="text-xl font-bold text-brand-dark">{orderNumber}</p>
          </div>

          <div className="bg-brand-light border border-brand-light rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-brand-dark font-medium mb-1">📌 Siguiente paso</p>
            <p className="text-xs text-brand-dark leading-relaxed">
              Envíanos tu pedido por WhatsApp para confirmar los detalles y coordinar el pago. El pago se gestiona de forma externa.
            </p>
          </div>

          {/* WhatsApp Button */}
          {siteConfig?.whatsappNumber && createdOrder && (
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-4"
            >
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white h-12 text-base shadow-lg shadow-green-500/25"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Enviar Pedido por WhatsApp
              </Button>
            </a>
          )}

          <div className="space-y-3">
            <Button
              className="w-full bg-brand hover:bg-brand-dark text-white"
              onClick={() => setView('orders')}
            >
              Ver Mis Pedidos
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setView('home')}>
              Seguir Comprando
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Orden de pasos: paso 1 = "Quien Recibe", paso 2 = "Quien Envía" (solo si samePerson es false)
  const stepIndex = step === 'recipient' ? 0 : 1;
  const stepLabels = samePerson ? ['Persona que Recibe'] : ['Persona que Recibe', 'Persona que Envía'];

  return (
    <div className="checkout-enhanced max-w-5xl mx-auto px-4 py-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === 'sender') setStep('recipient');
            else goBack();
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-500">
            Paso {stepIndex + 1} de {stepLabels.length}: {stepLabels[stepIndex]}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {stepLabels.map((label, i) => {
          const isCompleted = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${isCurrent ? 'text-brand-dark' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCurrent ? 'bg-brand-light text-brand-dark' : isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? 'OK' : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Form */}
        {/* `min-w-0` es CRÍTICO en grid: sin él, los hijos no encogen por
            debajo del ancho natural de su contenido (p.ej. inputs, labels
            largos) y se desbordan del grid en móvil. */}
        <div className="md:col-span-2 min-w-0">
          {/* Step 1: Datos de Quien Recibe */}
          {step === 'recipient' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand" />
                  Datos de la Persona que Recibe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRecipientSubmit} className="space-y-4">
                  {/* Toggle: misma persona recibe y pide — ARRIBA de todo.
                      Solo se muestra para entregas en Cuba (zonas de delivery),
                      porque en EE.UU./España el destinatario siempre es otra persona. */}
                  {selectedZone && (
                  <div className={`rounded-xl border-2 p-4 transition-all ${
                    samePerson
                      ? 'border-brand bg-gradient-to-br from-brand-light to-brand-light'
                      : 'border-gray-200 bg-white'
                  }`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={samePerson}
                        onClick={handleSamePersonToggle}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                          samePerson ? 'bg-brand' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            samePerson ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <UserCheck className="h-4 w-4 text-brand" />
                          Recibe la misma persona que envía
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {samePerson
                            ? '✓ Datos del destinatario se usarán también para el envío. No necesitas completar el paso 2.'
                            : 'Actívalo si pides para ti mismo(a). No necesitarás completar datos de quien envía.'}
                        </p>
                      </div>
                    </label>
                  </div>
                  )}

                  {/* Banner: cliente logueado + selector de destinatarios guardados */}
                  {customer && customer.savedRecipients.length > 0 && !samePerson && (
                    <div className="rounded-xl border-2 border-brand-light bg-brand-light/40 p-3.5 space-y-2.5 min-w-0">
                      <div className="flex items-start gap-2 min-w-0">
                        <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-gray-900 min-w-0 break-words">
                          ¡Hola, {customer.name.split(' ')[0]}! Autocompleta con tus destinatarios guardados:
                        </p>
                      </div>
                      <select
                        value={selectedSavedRecipientId}
                        onChange={(e) => applySavedRecipient(e.target.value)}
                        className="w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light max-w-full"
                      >
                        <option value="">— Elegir destinatario guardado —</option>
                        {customer.savedRecipients.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label} — {r.name}
                          </option>
                        ))}
                      </select>
                      {selectedSavedRecipientId && (
                        <p className="text-[11px] text-green-700 flex items-center gap-1 min-w-0 break-words">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Datos autocompletados. Puedes editarlos abajo si hace falta.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="bg-brand-light border border-brand-light rounded-lg p-3 text-sm text-brand-dark">
                    {samePerson
                      ? 'Tus datos se usarán como destinatario. Completa/verifica abajo.'
                      : 'Ingresa los datos de la persona que recibirá el pedido.'}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="recipientName" className="text-gray-700 font-medium">Nombre Completo <span className="text-red-500">*</span></Label>
                        <Input
                          id="recipientName"
                          value={formData.recipientName}
                          onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                          placeholder="María García"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recipientPhone" className="text-gray-700 font-medium">Teléfono <span className="text-red-500">*</span></Label>
                        <Input
                          id="recipientPhone"
                          value={formData.recipientPhone}
                          onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                          placeholder="+53 5XXX XXXX"
                          required
                        />
                      </div>
                    </div>

                    {/* Email visible solo cuando samePerson es true */}
                    {samePerson && (
                      <div className="space-y-2">
                        <Label htmlFor="recipientEmail" className="text-gray-700 font-medium">Correo Electrónico <span className="text-red-500">*</span></Label>
                        <Input
                          id="recipientEmail"
                          type="email"
                          value={formData.recipientEmail}
                          onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                          placeholder="maria@email.com"
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Lo usaremos para confirmar tu pedido.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Toggle: Registrarme como cliente (solo si NO está logueado) */}
                  {!customer && samePerson && (
                    <div className="rounded-xl border-2 border-brand-light bg-gradient-to-br from-brand-light to-brand-light p-3.5 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={registerAsCustomer}
                          onClick={() => setRegisterAsCustomer((v) => !v)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            registerAsCustomer ? 'bg-brand' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              registerAsCustomer ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-brand" />
                            Registrarme como cliente
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Guarda tus datos para no volver a escribirlos y autocompleta tus familiares en próximos envíos.
                          </p>
                        </div>
                      </label>
                      {registerAsCustomer && (
                        <div className="space-y-2 pt-1">
                          <Label htmlFor="registerPassword" className="text-xs flex items-center gap-1.5">
                            <Lock className="h-3 w-3" /> Crea una contraseña (mínimo 6 caracteres)
                          </Label>
                          <PasswordInput
                            id="registerPassword"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                          <p className="text-[11px] text-brand-dark">
                            Crearemos tu cuenta al confirmar el pedido usando {samePerson ? 'tus datos de arriba' : 'los datos que ingreses en el siguiente paso'}.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-3 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientAddress" className="text-gray-700 font-medium">Dirección de Entrega <span className="text-red-500">*</span></Label>
                      <Input
                        id="recipientAddress"
                        value={formData.recipientAddress}
                        onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                        placeholder="Calle 1 Norte #45 e/ Ave. 2 y 3, Rpto. Latino"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientNotes" className="text-gray-700 font-medium">Notas para la Entrega</Label>
                      <Textarea
                        id="recipientNotes"
                        value={formData.recipientNotes}
                        onChange={(e) => setFormData({ ...formData, recipientNotes: e.target.value })}
                        placeholder="Ej: Casa con reja verde, frente al parque. Llamar al llegar."
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Selector de Zona de Delivery (combobox con buscador) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-brand" />
                        <Label className="text-base font-semibold">Zona de Delivery <span className="text-red-500">*</span></Label>
                      </div>
                      {freeShipping ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[11px]">
                          🎉 Envío GRATIS aplicado
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-gray-500">
                          Envío gratis desde <span className="font-semibold text-brand-dark">{formatPrice(freeShippingMin, currency)}</span>
                        </span>
                      )}
                    </div>

                    {deliveryZones.length === 0 ? (
                      <div className="rounded-lg border border-brand-light bg-brand-light p-4 text-sm text-brand-dark">
                        No hay zonas de delivery configuradas. Contacta con la tienda para continuar.
                      </div>
                    ) : (
                      <ZoneSelector
                        zones={deliveryZones}
                        value={selectedZoneId}
                        onChange={setSelectedZoneId}
                        showFreeLabel={freeShipping}
                        placeholder="Busca y selecciona tu zona…"
                      />
                    )}

                    {selectedZone && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 text-xs text-gray-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 text-brand shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800">{selectedZone.name}</p>
                            {selectedZone.description && (
                              <p className="mt-0.5 leading-relaxed">{selectedZone.description}</p>
                            )}
                            <p className="mt-1">
                              <span className="font-medium">Entrega estimada:</span> {selectedZone.estimatedTime}
                              {!freeShipping && (
                                <>
                                  {' · '}
                                  <span className="font-medium text-brand-dark">
                                    Envío: {formatPrice(Number(selectedZone.price), currency)}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-gray-500">
                      Las zonas se muestran ordenadas alfabéticamente. Escribe para filtrar cuando la lista sea larga.
                    </p>
                  </div>

                  {/* Fecha y horario de entrega */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-brand" />
                      <Label className="text-base font-semibold">Fecha de Entrega <span className="text-red-500">*</span></Label>
                      {isAsap && (
                        <Badge className="bg-brand-light text-brand-dark border-brand-light text-[11px] ml-auto">
                          ⚡ {asapIsTomorrow ? 'Entrega mañana' : 'Entrega hoy'}
                        </Badge>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={isAsap ? asapDeliveryDate : formData.deliveryDate}
                      min={isAsap ? minDeliveryDate : minDeliveryDate}
                      max={isAsap ? undefined : undefined}
                      disabled={false}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      required
                      className={`max-w-xs`}
                    />
                    {!isAsap && canDeliverToday && !hasReservationDelay && (
                      <p className="text-[11px] text-emerald-700">
                        ✅ Aún hay tiempo para entregar <strong>hoy</strong> (pedido antes de las {maxOrderHour}, hora Cuba).
                      </p>
                    )}
                    {!isAsap && hasReservationDelay && (
                      <p className="text-[11px] text-amber-700">
                        📦 Tu pedido incluye productos reservables que requieren <strong>{maxReservationDays} día(s) de antelación</strong>. La entrega más pronto disponible es el <strong>{formatDateSpanish(minDeliveryDate)}</strong>.
                      </p>
                    )}
                    {!isAsap && !canDeliverToday && !hasReservationDelay && (
                      <p className="text-[11px] text-gray-500">
                        🕐 Como ya pasaron las {maxOrderHour} (hora Cuba), la entrega más pronto es <strong>mañana</strong>
                        {asapAvailable
                          ? '. Para entrega urgente, elige "Entrega Prioritaria".'
                          : '.'}
                      </p>
                    )}
                    {!isAsap && selectedZone?.estimatedTime && parseEstimatedHours(selectedZone.estimatedTime) > 0 && (
                      <p className="text-[11px] text-amber-700">
                        📦 Esta zona requiere <strong>{selectedZone.estimatedTime}</strong> para la entrega.
                        La fecha más pronto disponible es <strong>{formatDateSpanish(minDeliveryDate)}</strong>.
                      </p>
                    )}
                    {isAsap && (
                      <p className="text-[11px] text-brand-dark">
                        ⚡ {asapLabel}. {hasReservationDelay
                          ? `Tu pedido incluye productos reservables que requieren ${maxReservationDays} día(s) de antelación.`
                          : asapIsTomorrow
                          ? 'Como ya cerramos, la entrega será mañana a la hora de apertura.'
                          : 'No puedes seleccionar una fecha futura.'}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Clock className="h-5 w-5 text-brand" />
                      <Label className="text-base font-semibold">Horario de Entrega <span className="text-red-500">*</span></Label>
                    </div>

                    <div className={`grid gap-3 ${asapAvailable ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {/* Opción Normal */}
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-all ${
                          formData.deliveryTimeSlot === 'normal'
                            ? 'border-brand bg-brand-light'
                            : 'border-gray-200 hover:border-brand-light hover:bg-brand-light/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryTimeSlot"
                          value="normal"
                          checked={formData.deliveryTimeSlot === 'normal'}
                          onChange={() => setFormData({
                            ...formData,
                            deliveryTimeSlot: 'normal',
                            // Si venía de ASAP (fecha = hoy/mañana), restaurar a la fecha
                            // por defecto del modo Normal (hoy si <maxOrderHour Cuba, mañana si no)
                            deliveryDate: (formData.deliveryDate === todayStr || formData.deliveryDate === tomorrowStr)
                              ? defaultNormalDate
                              : formData.deliveryDate,
                          })}
                          className="mt-0.5 h-4 w-4 accent-brand"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-brand" />
                              Normal
                            </p>
                            <span className="text-[11px] text-gray-500">
                              {freeShipping ? 'Envío gratis' : 'Precio zona'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Horario: {hasReservableItems && siteConfig?.reservableDeliverySchedule
                              ? siteConfig.reservableDeliverySchedule
                              : normalSchedule}
                          </p>
                          {/* Aviso de horario de reservables en modo Normal */}
                          {hasReservableItems && siteConfig?.reservableDeliverySchedule && (
                            <p className="text-[11px] text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                              📦 Tu pedido incluye productos reservables. Se entregará el <strong>{formatDateSpanish(minDeliveryDate)}</strong> en horario <strong>{siteConfig.reservableDeliverySchedule}</strong>.
                            </p>
                          )}
                          <p className="text-[11px] text-gray-600 mt-1">
                            <span className="font-medium">Costo:</span>{' '}
                            {freeShipping ? (
                              <span className="text-green-600 font-medium">GRATIS</span>
                            ) : (
                              <span>{formatPrice(shippingCost, currency)}</span>
                            )}
                          </p>
                        </div>
                      </label>

                      {/* Opción ASAP — disponible SIEMPRE que la zona lo permita
                          (allowsPriorityDelivery = true). Fuera del horario
                          configurado, el mensaje de la etiqueta (asapLabel)
                          informa al cliente cuándo se realizará la entrega. */}
                      {asapAvailable ? (
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-all ${
                            formData.deliveryTimeSlot === 'asap'
                              ? 'border-brand bg-brand-light'
                              : 'border-gray-200 hover:border-brand-light hover:bg-brand-light/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryTimeSlot"
                            value="asap"
                            checked={formData.deliveryTimeSlot === 'asap'}
                            onChange={() => setFormData({ ...formData, deliveryTimeSlot: 'asap' })}
                            className="mt-0.5 h-4 w-4 accent-brand"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5 text-brand" />
                                Entrega Prioritaria
                              </p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${hasReservableItemsInCart && !isNearTermDelivery ? 'bg-green-100 text-green-700' : 'bg-brand-light text-brand-dark'}`}>
                                {hasReservableItemsInCart && !isNearTermDelivery ? 'GRATIS' : `+${formatPrice(asapSurchargePreview, currency)}`}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 mt-1 font-medium">
                              {asapLabel}
                            </p>
                            {/* Aviso cuando hay reservables: la fecha se ajusta a la antelación */}
                            {hasReservableItems && maxReservationDays > 0 && (
                              <p className="text-[11px] text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                📦 Tienes productos reservables que requieren {maxReservationDays} día(s) de antelación. La entrega será el <strong>{formatDateSpanish(asapDeliveryDate)}</strong> (no hoy).
                              </p>
                            )}
                            <p className="text-[11px] text-gray-600 mt-1">
                              {hasReservableItemsInCart && !isNearTermDelivery ? (
                                <span className="font-medium text-green-700">Recargo: GRATIS (producto reservable, entrega lejana)</span>
                              ) : (
                                <>
                                  <span className="font-medium">Recargo:</span> {formatPrice(asapSurchargePreview, currency)}{' '}
                                  <span className="text-gray-400">
                                    ({(() => {
                                      let type = 'fixed';
                                      let value = 0;
                                      if (selectedZone?.asapSurchargeOverride) {
                                    type = selectedZone.asapSurchargeType || 'fixed';
                                    value = Number(selectedZone.asapSurchargeValue) || 0;
                                  } else {
                                    type = siteConfig?.asapSurchargeType || 'fixed';
                                    value = Number(siteConfig?.asapSurchargeValue) || 0;
                                  }
                                  return type === 'percent' ? `${value}% del pedido` : `monto fijo`;
                                })()}
                              </span>
                                </>
                              )}
                            </p>
                            {/* Selector de horarios disponibles */}
                            {isAsap && asapSlots.length > 0 && (
                              <div className="mt-3 border-t pt-3">
                                <p className="text-xs font-semibold text-gray-700 mb-2">
                                  ⏰ Horarios disponibles para el {formatDateSpanish(formData.deliveryDate)}:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {asapSlots.map((slot) => (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      disabled={!slot.available}
                                      onClick={() => setSelectedAsapTime(slot.time)}
                                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                                        selectedAsapTime === slot.time
                                          ? 'border-brand bg-brand text-white'
                                          : slot.available
                                            ? 'border-gray-200 bg-white hover:border-brand-light text-gray-700'
                                            : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                                      }`}
                                      title={slot.reason || ''}
                                    >
                                      {slot.time}
                                    </button>
                                  ))}
                                </div>
                                {selectedAsapTime && (
                                  <p className="text-xs text-brand-dark mt-2 font-medium">
                                    ✓ Entrega seleccionada: el {formatDateSpanish(formData.deliveryDate)} a las {selectedAsapTime}
                                  </p>
                                )}
                              </div>
                            )}
                            {isAsap && asapSlotsLoading && asapSlots.length === 0 && (
                              <p className="text-xs text-gray-500 mt-2">Cargando horarios disponibles...</p>
                            )}
                            {isAsap && !asapSlotsLoading && asapSlots.length === 0 && (
                              <p className="text-xs text-amber-600 mt-2">
                                ⚠️ No hay horarios disponibles para {formatDateSpanish(formData.deliveryDate)}. Puedes continuar con el pedido y coordinaremos la hora por WhatsApp.
                              </p>
                            )}
                          </div>
                        </label>
                      ) : (
                        /* Mensaje informativo cuando la zona NO permite ASAP. */
                        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-3.5 text-xs text-gray-500 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                          <span>
                            Esta zona no tiene habilitada la entrega prioritaria. Solo disponible entrega en horario normal.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Aviso de monto mínimo no alcanzado */}
                  {!meetsMinOrder && (
                    <div className="w-full rounded-lg bg-amber-50 border border-amber-200 p-3 text-center mb-3">
                      <p className="text-sm font-semibold text-amber-800">
                        🛒 El monto mínimo de pedido es {formatPrice(minOrderAmount, currency)}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Agrega más productos para continuar. Tu carrito actual es {formatPrice(total, currency)}
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark text-white h-12 text-base shadow-lg shadow-brand/25 whitespace-normal break-words disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !meetsMinOrder}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Procesando Pedido...
                      </>
                    ) : !meetsMinOrder ? (
                      <>
                        🛒 Falta {formatPrice(minOrderAmount - total, currency)} para el mínimo
                      </>
                    ) : samePerson ? (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Confirmar Pedido — {formatPrice(finalTotal, currency)}
                      </>
                    ) : (
                      <>
                        <ArrowRight className="mr-2 h-5 w-5" />
                        Continuar — Datos de la Persona que Envía
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Datos de Quien Envía (solo si samePerson es false) */}
          {step === 'sender' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-brand" />
                  Datos de la Persona que Envía
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSenderSubmit} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    Solo necesitamos tus datos de contacto. El pago se gestiona externamente.
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-700 font-medium">Nombre y Apellidos <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="Juan Pérez"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-700 font-medium">Teléfono <span className="text-red-500">*</span></Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium">Correo Electrónico <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        placeholder="juan@email.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Toggle: Registrarme como cliente (solo si NO está logueado) */}
                  {!customer && (
                    <div className="rounded-xl border-2 border-brand-light bg-gradient-to-br from-brand-light to-brand-light p-3.5 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={registerAsCustomer}
                          onClick={() => setRegisterAsCustomer((v) => !v)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            registerAsCustomer ? 'bg-brand' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              registerAsCustomer ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-brand" />
                            Registrarme como cliente
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Guarda tus datos para no volver a escribirlos y autocompleta tus familiares en próximos envíos.
                          </p>
                        </div>
                      </label>
                      {registerAsCustomer && (
                        <div className="space-y-2 pt-1">
                          <Label htmlFor="registerPassword2" className="text-xs flex items-center gap-1.5">
                            <Lock className="h-3 w-3" /> Crea una contraseña (mínimo 6 caracteres)
                          </Label>
                          <PasswordInput
                            id="registerPassword2"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                          <p className="text-[11px] text-brand-dark">
                            Crearemos tu cuenta al confirmar el pedido usando los datos de arriba.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aviso de monto mínimo no alcanzado */}
                  {!meetsMinOrder && (
                    <div className="w-full rounded-lg bg-amber-50 border border-amber-200 p-3 text-center mb-3">
                      <p className="text-sm font-semibold text-amber-800">
                        🛒 El monto mínimo de pedido es {formatPrice(minOrderAmount, currency)}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Agrega más productos para continuar. Tu carrito actual es {formatPrice(total, currency)}
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark text-white h-12 text-base shadow-lg shadow-brand/25 whitespace-normal break-words disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !meetsMinOrder}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Procesando Pedido...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Confirmar Pedido — {formatPrice(finalTotal, currency)}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order summary */}
        <div className="min-w-0">
          <Card className="sticky top-28">
            <CardHeader>
              <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="flex gap-3">
                  <div className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                    <img src={item.image || '/products/placeholder.svg'} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                    {item.isReservation && (
                      <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mt-0.5">📅 RESERVADO</span>
                    )}
                    <p className="text-xs text-gray-500">Cant: {item.quantity}</p>
                    <p className="text-sm font-bold text-gray-900">{formatPrice(item.price * item.quantity, currency)}</p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="space-y-2 min-w-0">
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-gray-600 min-w-0 truncate">Subtotal</span>
                  <span className="shrink-0">{formatPrice(total, currency)}</span>
                </div>
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-gray-600 min-w-0 truncate">
                    Envío{selectedZone ? ` · ${selectedZone.name}` : ''}
                  </span>
                  <span className={`shrink-0 ${freeShipping ? 'text-green-600 font-medium' : ''}`}>
                    {freeShipping ? 'GRATIS' : formatPrice(shippingCost, currency)}
                  </span>
                </div>
                {asapSurcharge > 0 && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-600 min-w-0 truncate">
                      Costo de Entrega Prioritaria <span className="text-brand-dark">⚡ ASAP</span>
                    </span>
                    <span className="text-brand-dark font-medium shrink-0">
                      +{formatPrice(asapSurcharge, currency)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold gap-2">
                  <span className="min-w-0">Total</span>
                  <span className="text-brand-dark shrink-0">{formatPrice(finalTotal, currency)}</span>
                </div>
              </div>
              {step === 'sender' && formData.recipientName && (
                <>
                  <Separator />
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700">Recibe: {formData.recipientName}</p>
                    {selectedZone && (
                      <p className="text-gray-500">Zona: {selectedZone.name}</p>
                    )}
                  </div>
                </>
              )}
              {step === 'recipient' && samePerson && formData.recipientName && (
                <>
                  <Separator />
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700">Recibe y pide: {formData.recipientName}</p>
                    {selectedZone && (
                      <p className="text-gray-500">Zona: {selectedZone.name}</p>
                    )}
                  </div>
                </>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
                <p className="text-[11px] text-blue-700 font-medium">
                  💬 Pago se gestiona externamente vía WhatsApp
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
