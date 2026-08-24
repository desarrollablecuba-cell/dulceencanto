'use client';

import { DEFAULT_SPECIAL_DATES } from '@/lib/special-dates';

import { useState, useEffect, useCallback, useRef, Fragment, useMemo } from 'react';
import { setupFetchInterceptor, sessionManager, tokenManager } from '@/lib/http-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  Package,
  Send,
  CreditCard,
  ShieldCheck,
  Globe,
  FolderOpen,
  ShoppingCart,
  Settings,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Star,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Loader2,
  Download,
  Printer,
  Code2,
  CheckCircle2,
  Truck,
  ImagePlus,
  X,
  Eye,
  Users,
  Heart,
  Mail,
  Phone,
  MapPin,
  GripVertical,
  Tags,
  Layers,
  Pause,
  Play,
  CalendarClock,
  Clock,
  Percent,
  Save,
  Search,
  Store,
  Palette,
  Barcode,
  ToggleLeft,
  Lock,
  Info,
  Type,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  Upload,
  CalendarHeart,
  Menu,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrderTicket } from '@/components/ecommerce/OrderTicket';
import { EventReservationsTab } from '@/components/ecommerce/admin/EventReservationsTab';
import { HeroSlidesEditor, NavSectionsEditor, HamburgerItemsEditor } from '@/components/ecommerce/VisualEditors';
import { PromotionManager, GalleryManager } from '@/components/ecommerce/SectionManagers';
import { CountryFlag, COUNTRY_INFO } from '@/components/ecommerce/CountryFlag';
import { PasswordInput } from '@/components/ui/password-input';
import {
  applyTheme,
  PREDEFINED_THEMES,
  getPredefinedTheme,
  DEFAULT_THEME,
  serializeTheme,
  parseTheme,
  cloneAsCustom,
  AVAILABLE_FONTS,
  RADIUS_LABELS,
  SHADOW_LABELS,
  BUTTON_STYLE_LABELS,
  CARD_STYLE_LABELS,
  type ThemeTokens,
  type RadiusSize,
  type ShadowStyle,
  type ButtonStyle,
  type CardStyle,
  type CardImageRatio,
  type CardImageFit,
  CARD_IMAGE_RATIO_LABELS,
  CARD_IMAGE_FIT_LABELS,
} from '@/lib/themes';
import { loadGoogleFont } from '@/components/ecommerce/BrandTheme';
import {
  STORE_TEMPLATES,
  COLOR_PALETTES,
  applyTemplate,
  type TemplateId,
} from '@/lib/theme-engine';
import { SectionOrderEditor } from '@/components/ecommerce/SectionOrderEditor';
import { OffersCarouselEditor } from '@/components/ecommerce/OffersCarouselEditor';
import { SavedThemesGallery } from '@/components/ecommerce/SavedThemesGallery';
import { TEMPLATES as STORE_PRESETS, type StoreTemplate as StorePreset } from '@/lib/templates';
import { uploadImage, getActiveUploads } from '@/lib/image-upload';

const ADMIN_TOKEN_KEY = 'diaz-admin-token';

// ════════════════════════════════════════════════════════════════════════════
// Helpers de formato (fecha y variantes)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convierte un ISO string a fecha legible en zona horaria de Cuba (America/Havana).
 * Formato: dd/MM/yyyy HH:mm
 * Devuelve '—' si el input es inválido o vacío (evita "Invalid Date").
 */
function formatCubaDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-ES', {
      timeZone: 'America/Havana',
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

/**
 * Convierte un ISO string a SOLO fecha (sin hora) en zona horaria de Cuba.
 * Formato: dd/MM/yyyy
 * Devuelve '—' si el input es inválido o vacío (evita "Invalid Date").
 * Pensado para timestamps ISO completos (createdAt, updatedAt, etc.).
 */
function formatCubaDateOnly(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-ES', {
      timeZone: 'America/Havana',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Formatea una fecha de entrega almacenada como "YYYY-MM-DD" (solo fecha, sin hora).
 * Devuelve '—' si el input es nulo/vacío/inválido (evita "Invalid Date").
 * Se usa el mediodía (T12:00:00) para evitar desfases por zona horaria.
 */
function formatDeliveryDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    // dateStr es "YYYY-MM-DD" — se parsea como fecha local al mediodía
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-ES', {
      timeZone: 'America/Havana',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Parsea el JSON de variantes de un OrderItem y devuelve un string legible.
 * Ejemplo de entrada: '[{"groupName":"Tamaño","optionName":"Grande"}]'
 * Salida: 'Grande' (o 'Tamaño: Grande, Color: Rojo' si hay varias)
 *
 * Si no hay variantes, devuelve '' (string vacío).
 */
function formatVariantInfo(variantInfo: string | null | undefined): string {
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
 * Parsea el JSON de extras de un OrderItem y devuelve un string legible.
 * Ejemplo de entrada: '[{"name":"Sin queso","price":0.5}]'
 * Salida: 'Sin queso (+$0.50)' (pueden ser varios, separados por coma)
 *
 * Si no hay extras, devuelve '' (string vacío).
 */
function formatExtrasInfo(extrasInfo: string | null | undefined): string {
  if (!extrasInfo) return '';
  try {
    const arr = JSON.parse(extrasInfo);
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr
      .map((e: { name?: string; price?: number }) => {
        const name = e.name || '';
        const price = Number(e.price) || 0;
        if (price > 0) return `${name} (+$${price.toFixed(2)})`;
        return name;
      })
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}

// Types
interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  order: number;
  _count?: { products: number };
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  sku?: string;
  price: number;
  image: string;
  images: string;
  tags?: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  order: number;
  // SIGECOS: unidad y código
  saleUnit?: string;
  barcode?: string;
  // SIGECOS: tipo y estado
  productType?: string;
  status?: string;
  // SIGECOS: disponibilidad
  posAvailable?: boolean;
  tiendaAvailable?: boolean;
  // SIGECOS: anticipo
  advanceType?: string;
  advanceValue?: number;
  minHours?: number;
  minHoursUnit?: string;
  // SIGECOS: costos (admin only)
  costPrice?: number;
  marginPercent?: number;
  offerEnabled?: boolean;
  offerType?: string;
  offerPrice?: number;
  offerStart?: string | null;
  offerEnd?: string | null;
  wholesaleEnabled?: boolean;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  reservationEnabled?: boolean;
  maxReservations?: number;
  reservationDays?: number;
  reservationDeposit?: number;
  promoEnabled?: boolean;
  promoType?: string;
  promoValue?: number;
  promoBuyQty?: number;
  promoGetQty?: number;
  promoStart?: string | null;
  promoEnd?: string | null;
  createdAt: string;
}

interface VariantOption {
  id: string;
  groupId: string;
  name: string;
  priceMod: number;
  image: string;
  stock: number;
  available: boolean;
  sortOrder: number;
}

interface VariantGroup {
  id: string;
  productId: string;
  name: string;
  required: boolean;
  maxSelect: number;
  isImageGroup: boolean;
  isDominant?: boolean;
  sortOrder: number;
  options?: VariantOption[];
}

interface Combination {
  id: string;
  productId: string;
  optionIds: string;
  sku: string;
  stock: number;
  price: number | null;
  image: string;
  available: boolean;
  sortOrder: number;
}

interface ProductExtra {
  id: string;
  productId: string;
  name: string;
  description: string;
  priceMod: number;
  required: boolean;
  sortOrder: number;
}

interface WholesaleTier {
  id: string;
  productId: string;
  name: string;
  minQty: number;
  maxQty: number;
  price: number;
  sortOrder: number;
}

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantInfo?: string;  // JSON: [{ groupName, optionName }]
  extrasInfo?: string;   // JSON: [{ name, price }]
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientNotes: string;
  deliveryZoneId: string | null;
  deliveryZoneName: string | null;
  deliveryZonePrice: number;
  deliveryDate: string | null;
  deliveryTimeSlot: string;
  asapTimeSlot?: string | null;
  deliverySurcharge: number;
  shippingCost: number;
  total: number;
  status: string;
  isPaid: boolean;
  zelleRef: string | null;
  paymentProof: string | null;
  items: OrderItem[];
  hasReservableItems?: boolean;
  createdAt: string;
}

// ─── Fechas Especiales del countdown (editables desde el admin) ─────────────
const SPECIAL_GRADIENTS = [
  { id: 'rosa', label: '🌸 Rosa', gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', accent: '#F472B6' },
  { id: 'morado', label: '💜 Morado', gradient: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)', accent: '#C084FC' },
  { id: 'ambar', label: '🌟 Ámbar', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', accent: '#FBBF24' },
  { id: 'azul', label: '💙 Azul', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', accent: '#60A5FA' },
  { id: 'rojo', label: '🎄 Rojo', gradient: 'linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%)', accent: '#F87171' },
  { id: 'cian', label: '🥂 Cian', gradient: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)', accent: '#67E8F9' },
];

interface SpecialDateRow {
  name: string; emoji: string; month: number; day: number;
  description: string; theme: string; image?: string;
}

function SpecialDatesEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  let rows: SpecialDateRow[] = [];
  try {
    const parsed = JSON.parse(value || '[]');
    if (Array.isArray(parsed)) rows = parsed;
  } catch { /* valor inválido → lista vacía */ }
  rows = rows.map((r) => ({
    name: String(r?.name || ''), emoji: String(r?.emoji || '🎉'),
    month: Number(r?.month) || 0, day: Number(r?.day) || 1,
    description: String(r?.description || ''), theme: String(r?.theme || 'morado'),
  }));
  // Si no hay fechas guardadas, partir de la lista por defecto para que el
  // admin pueda EDITARLAS o ELIMINARLAS (ej: quitar el Día de los Padres).
  if (rows.length === 0) {
    rows = DEFAULT_SPECIAL_DATES.map((d) => ({
      name: d.name, emoji: d.emoji, month: d.month, day: d.day,
      description: d.description, theme: d.theme, image: d.image,
    }));
  }
  // Al emitir, resolvemos theme → gradient/accent reales (lo que consume el countdown)
  const emit = (next: SpecialDateRow[]) =>
    onChange(
      JSON.stringify(
        next.map((r) => {
          const g = SPECIAL_GRADIENTS.find((x) => x.id === r.theme) || SPECIAL_GRADIENTS[1];
          return { ...r, gradient: g.gradient, accent: g.accent };
        })
      )
    );
  const set = (i: number, patch: Partial<SpecialDateRow>) =>
    emit(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  // Fecha ISO auxiliar (año dummy) para el <input type="date">
  // El año del picker = próxima ocurrencia de esa fecha (si ya pasó este
  // año, muestra el siguiente → permite elegir 2026, 2027…). Al guardar solo
  // se conservan mes/día: el countdown siempre calcula la próxima ocurrencia.
  const iso = (r: SpecialDateRow) => {
    const hoy = new Date();
    let y = hoy.getFullYear();
    if (new Date(y, r.month, r.day, 23, 59, 59) < hoy) y += 1;
    return `${y}-${String(r.month + 1).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`;
  };
  const fromIso = (v: string) => {
    const [y, m, d] = v.split('-').map(Number);
    if (!m || !d) return null;
    return { month: m - 1, day: d };
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-xs text-gray-500 italic">
          Sin fechas configuradas — se usa la lista por defecto (San Valentín, Día de las Madres, Fin de Año, etc.).
        </p>
      )}
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50/50">
          <div className="flex gap-2 items-center">
            <Input
              value={r.emoji}
              onChange={(e) => set(i, { emoji: e.target.value.slice(0, 4) })}
              className="w-14 text-center"
              aria-label="Emoji"
            />
            <Input
              value={r.name}
              onChange={(e) => set(i, { name: e.target.value })}
              placeholder="Nombre (ej: Día de las Madres)"
              className="flex-1"
            />
            <Input
              type="date"
              value={iso(r)}
              onChange={(e) => {
                const md = fromIso(e.target.value);
                if (md) set(i, md);
              }}
              className="w-40"
              aria-label="Fecha"
            />
            <Button
              variant="ghost" size="icon" type="button"
              className="text-red-500 hover:bg-red-50 shrink-0"
              onClick={() => emit(rows.filter((_, idx) => idx !== i))}
              aria-label="Eliminar fecha"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={r.description}
              onChange={(e) => set(i, { description: e.target.value })}
              placeholder="Descripción corta que se muestra en el banner"
              className="flex-1"
            />
            <select
              value={r.theme}
              onChange={(e) => set(i, { theme: e.target.value })}
              className="rounded-md border border-gray-300 bg-white px-2 text-sm"
              aria-label="Color del banner"
            >
              {SPECIAL_GRADIENTS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          {/* Imagen de fondo de la tarjeta (opcional, subida al servidor) */}
          <div className="flex gap-2 items-center">
            <label className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 shrink-0">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingIdx(i);
                  try {
                    const path = await uploadImage(file, 1200, 0.8);
                    set(i, { image: path });
                  } catch {
                    alert('No se pudo subir la imagen. Intenta de nuevo.');
                  } finally {
                    setUploadingIdx(null);
                    e.target.value = '';
                  }
                }}
              />
              {uploadingIdx === i ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo…</>
              ) : (
                <><ImagePlus className="h-4 w-4" /> {r.image ? 'Cambiar imagen' : 'Subir imagen'}</>
              )}
            </label>
            {r.image && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image} alt="" className="h-10 w-20 object-cover rounded border border-gray-300" />
                <Button
                  variant="ghost" size="icon" type="button"
                  className="text-red-500 hover:bg-red-50 h-8 w-8 shrink-0"
                  onClick={() => set(i, { image: undefined })}
                  aria-label="Quitar imagen"
                  title="Quitar imagen"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            <p className="text-[11px] text-gray-400 leading-snug">Imagen de fondo de la tarjeta (opcional)</p>
          </div>
        </div>
      ))}
      <Button
        variant="outline" size="sm" type="button"
        onClick={() => emit([...rows, { name: '', emoji: '🎉', month: 0, day: 1, description: '', theme: 'morado' }])}
      >
        <Plus className="h-4 w-4 mr-1" /> Agregar fecha especial
      </Button>
    </div>
  );
}

interface SiteConfig {
  id: string;
  storeName: string;
  tagline: string;
  logo: string;
  cover: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  zelleEmail: string;
  zelleName: string;
  primaryColor: string;
  primaryColorDark: string;
  primaryColorLight: string;
  footerBgColor: string;
  footerTextColor: string;
  footerAccentColor: string;
  themeId: string;
  themeData: string;
  homeSectionsOrder: string;
  homeSectionsEnabled: string;
  offersCarousel: string;
  savedThemes: string;
  zelleEnabled: boolean;
  freeShippingEnabled: boolean;
  customerRegistrationEnabled: boolean;
  customerLoginEnabled: boolean;
  tickerEnabled: boolean;
  catalogLayout: string;
  freeShippingMin: number;
  shippingCost: number;
  minOrderAmount: number;
  scheduleLunes: string;
  scheduleMartes: string;
  scheduleMiercoles: string;
  scheduleJueves: string;
  scheduleViernes: string;
  scheduleSabado: string;
  scheduleDomingo: string;
  asapSurchargeType: string;
  asapSurchargeValue: number;
  asapStartHour: string;
  asapEndHour: string;
  normalSchedule: string;
  /** Hora límite (hora Cuba) para hacer pedidos same-day. Default "14:00". */
  maxOrderHour: string;
  /** Horario de entrega para productos reservables (ej: "15:00 - 18:00").
   *  Se muestra en el checkout cuando hay reservables en el carrito. */
  reservableDeliverySchedule: string;
  /** Texto 1 de la explicación de Entrega Prioritaria (editable). */
  priorityDeliveryInfo1: string;
  /** Texto 2 de la explicación de Entrega Prioritaria (editable). */
  priorityDeliveryInfo2: string;
  /** Texto 3 de la explicación de Entrega Prioritaria (editable). */
  priorityDeliveryInfo3: string;
  activeCountries: string;
  tickerItems: string;
  horarioSectionTitle: string;
  horarioSectionDesc: string;
  horarioCards: string;
  socialLinks: string;
  trustBadges: string;
  socialStats: string;
  testimonials: string;
  homeBenefits: string;
  /** JSON array de pasos para la sección "Comprar es muy fácil" (HowItWorks).
   *  Cada item: {icon, title, desc}. Vacío = usar defaults hardcoded. */
  howItWorksSteps: string;
  /** Título principal del Hero (sobre la imagen de portada). Vacío = usar default. */
  heroTitle: string;
  /** Subtítulo del Hero (debajo del título). Vacío = usar default. */
  heroSubtitle: string;
  /** Slides del hero rotativo (JSON array). */
  heroSlides: string;
  /** Fechas especiales del countdown (JSON array). Vacío = lista por defecto. */
  specialDates: string;
  /** Secciones de navegación del header (JSON array). */
  navSections: string;
  /** Items del menú hamburguesa (JSON array). */
  hamburgerItems: string;
  /** Título del banner de entrega prioritaria. Vacío = usar default. */
  promoBannerTitle: string;
  /** Subtítulo del banner de entrega prioritaria. Vacío = usar default. */
  promoBannerSubtitle: string;
  /** Texto del botón del banner de entrega prioritaria. Vacío = usar default. */
  promoBannerButtonText: string;
}

// Status badge helper
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    shipped: 'bg-purple-100 text-purple-800 border-purple-200',
    delivered: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };
  return (
    <Badge variant="outline" className={colors[status] || 'bg-gray-100 text-gray-800'}>
      {labels[status] || status}
    </Badge>
  );
}

// ─── JsonFieldEditor — editor simple de campos JSON (textarea + validación) ──
function JsonFieldEditor({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState('');

  useEffect(() => { setLocalValue(value); }, [value]);

  const handleChange = (v: string) => {
    setLocalValue(v);
    try {
      if (v.trim()) JSON.parse(v);
      setError('');
    } catch (e: any) {
      setError('JSON inválido: ' + e.message);
    }
  };

  const handleSave = () => {
    if (!error) onChange(localValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:border-brand"
        style={{ minHeight: '150px' }}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button size="sm" onClick={handleSave} disabled={!!error} className="bg-brand hover:bg-brand-dark text-white">
        Aplicar cambios
      </Button>
    </div>
  );
}

// Sidebar navigation items
type AdminTab = 'dashboard' | 'products' | 'orders' | 'delivery' | 'customers' | 'reviews' | 'reservations' | 'settings' | 'profile';

const navItems: { tab: AdminTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { tab: 'products', label: 'Productos', icon: <Package className="h-5 w-5" /> },
  { tab: 'orders', label: 'Pedidos', icon: <ShoppingCart className="h-5 w-5" /> },
  { tab: 'delivery', label: 'Delivery', icon: <Truck className="h-5 w-5" /> },
  { tab: 'customers', label: 'Clientes', icon: <Users className="h-5 w-5" /> },
  { tab: 'reviews', label: 'Reseñas', icon: <Star className="h-5 w-5" /> },
  { tab: 'reservations', label: 'Reservas', icon: <CalendarHeart className="h-5 w-5" /> },
  { tab: 'settings', label: 'Ajustes', icon: <Settings className="h-5 w-5" /> },
  { tab: 'profile', label: 'Mi Perfil', icon: <Lock className="h-5 w-5" /> },
];

// ─── DASHBOARD TAB ──────────────────────────────────────────────────────────

function DashboardTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, oRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/orders'),
      ]);
      const pData = await pRes.json().catch(() => []);
      const oData = await oRes.json().catch(() => []);
      setProducts(Array.isArray(pData) ? pData : []);
      // Marcar pedidos que tienen items reservables para ocultar el cobro de ASAP
      // Un item es reservable si el producto tiene reservationEnabled=true Y
      // (stock del producto < cantidad del item O variante seleccionada tiene stock < cantidad)
      const productMap = new Map<string, { reservationEnabled?: boolean; stock?: number }>();
      if (Array.isArray(pData)) {
        pData.forEach((p: { id: string; reservationEnabled?: boolean; stock?: number }) => {
          productMap.set(p.id, { reservationEnabled: p.reservationEnabled, stock: p.stock });
        });
      }
      const ordersWithFlags = (Array.isArray(oData) ? oData : []).map((o: { items?: { productId: string; quantity: number; variantInfo?: string }[] }) => {
        const hasReservable = (o.items || []).some((item) => {
          const prod = productMap.get(item.productId);
          if (!prod?.reservationEnabled) return false;
          // Si el producto tiene stock < cantidad, es reserva
          if (Number(prod.stock) < item.quantity) return true;
          // Si tiene variantInfo, no podemos saber el stock de la variante aquí
          // pero si el producto tiene reservationEnabled y tiene variantInfo,
          // asumimos que puede ser reserva (el backend ya lo validó correctamente)
          if (item.variantInfo && item.variantInfo !== '[]') return true;
          return false;
        });
        return { ...o, hasReservableItems: hasReservable };
      });
      setOrders(ordersWithFlags);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);
  const lowStock = products.filter((p) => p.stock <= 5);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-700">Productos</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100 text-green-600">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-700">Pedidos</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-700">Ingresos</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand" />
              Pedidos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-600 py-6">
                      No hay pedidos
                    </TableCell>
                  </TableRow>
                )}
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">#{o.orderNumber}</TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell className="font-semibold">${o.total.toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-600 py-6">
                      Todo el stock está bien
                    </TableCell>
                  </TableRow>
                )}
                {lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="flex items-center gap-2 max-w-[180px]">
                      <img src={p.image || '/products/placeholder.svg'} alt={p.name} className="w-8 h-8 rounded object-cover shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{p.category?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
                        {p.stock}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── PRODUCTS TAB ───────────────────────────────────────────────────────────

const QUICK_TAG_PRESETS = [
  { name: 'DESTACADO', color: '#F59E0B' },
  { name: 'NUEVO', color: '#22C55E' },
  { name: 'OFERTA', color: '#EF4444' },
  { name: 'POPULAR', color: '#F97316' },
  { name: 'VEGANO', color: '#16A34A' },
  { name: 'SIN GLUTEN', color: '#EAB308' },
  { name: 'ARTESANAL', color: '#8B5CF6' },
  { name: 'PREMIUM', color: '#002A8F' },
  { name: 'TEMPORADA', color: '#06B6D4' },
];
const TAG_COLOR_SWATCHES = ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899','#6B7280','#F59E0B'];

function genLocalId(prefix = 'tmp'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface ProductFormState {
  name: string;
  shortName: string;
  sku: string;
  description: string;
  price: number;
  image: string;
  images: string;
  tags: string;
  categoryId: string;
  stock: number;
  featured: boolean;
  order: number;
  // SIGECOS: unidad y código
  saleUnit: string;
  barcode: string;
  // SIGECOS: tipo y estado
  productType: string;
  status: string;
  // SIGECOS: disponibilidad
  posAvailable: boolean;
  tiendaAvailable: boolean;
  // SIGECOS: anticipo
  advanceType: string;
  advanceValue: number;
  minHours: number;
  minHoursUnit: string;
  // SIGECOS: costos (admin only)
  costPrice: number;
  marginPercent: number;
  offerEnabled: boolean;
  offerType: string;
  offerPrice: number;
  offerStart: string | null;
  offerEnd: string | null;
  // Wholesale (Por mayor) — legacy fields kept for backward compat
  wholesaleEnabled: boolean;
  wholesalePrice: number;
  wholesaleMinQty: number;
  // Wholesale tiers (rangos)
  wholesaleTiers: {
    id: string;
    name: string;
    minQty: number;
    maxQty: number;
    price: number;
    sortOrder: number;
  }[];
  // Reservation
  reservationEnabled: boolean;
  maxReservations: number;
  reservationDays: number;
  reservationDeposit: number;
  // Promo
  promoEnabled: boolean;
  promoType: string;
  promoValue: number;
  promoBuyQty: number;
  promoGetQty: number;
  promoStart: string | null;
  promoEnd: string | null;
  variantGroups: {
    id: string;
    name: string;
    required: boolean;
    maxSelect: number;
    isImageGroup: boolean;
    isDominant: boolean;
    sortOrder: number;
    options: {
      id: string;
      name: string;
      priceMod: number;
      image: string;
      stock: number;
      available: boolean;
      sortOrder: number;
    }[];
  }[];
  combinations: {
    id: string;
    optionIds: string[];
    sku: string;
    stock: number;
    price: number | null;
    image: string;
    available: boolean;
    sortOrder: number;
  }[];
  productExtras: {
    id: string;
    name: string;
    description: string;
    priceMod: number;
    required: boolean;
    sortOrder: number;
  }[];
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  shortName: '',
  sku: '',
  description: '',
  price: 0,
  image: '',
  images: '[]',
  tags: '[]',
  categoryId: '',
  stock: 10,
  featured: false,
  order: 0,
  // SIGECOS defaults
  saleUnit: 'unidad',
  barcode: '',
  productType: 'elaborado',
  status: 'active',
  posAvailable: true,
  tiendaAvailable: true,
  advanceType: 'sin',
  advanceValue: 0,
  minHours: 24,
  minHoursUnit: 'horas',
  costPrice: 0,
  marginPercent: 0,
  offerEnabled: false,
  offerType: 'permanente',
  offerPrice: 0,
  offerStart: null,
  offerEnd: null,
  wholesaleEnabled: false,
  wholesalePrice: 0,
  wholesaleMinQty: 10,
  wholesaleTiers: [],
  reservationEnabled: false,
  maxReservations: 50,
  reservationDays: 7,
  reservationDeposit: 0,
  promoEnabled: false,
  promoType: 'discount',
  promoValue: 0,
  promoBuyQty: 0,
  promoGetQty: 0,
  promoStart: null,
  promoEnd: null,
  variantGroups: [],
  combinations: [],
  productExtras: [],
};

/** Genera combinaciones cartesianas a partir de los grupos y opciones del form.
 *  Si hay un grupo marcado como `isDominant`, cada combinación toma por defecto
 *  la imagen de la opción del grupo dominante que forma parte de esa combinación. */
function generateCombinationsFromForm(groups: ProductFormState['variantGroups']): ProductFormState['combinations'] {
  const nonEmpty = groups.filter((g) => g.options.length > 0);
  if (nonEmpty.length < 2) return [];
  const dominant = nonEmpty.find((g) => g.isDominant);
  const result: ProductFormState['combinations'] = [];
  function cross(idx: number, acc: { id: string; image: string }[]) {
    if (idx >= nonEmpty.length) {
      // Por defecto, la imagen de la combinación es la imagen de la opción del grupo dominante.
      const domImg = dominant
        ? acc.find((a) => dominant.options.some((o) => o.id === a.id))?.image || ''
        : '';
      result.push({
        id: genLocalId('cmb'),
        optionIds: acc.map((a) => a.id),
        sku: '',
        stock: 0,
        price: null,
        image: domImg,
        available: true,
        sortOrder: result.length,
      });
      return;
    }
    for (const opt of nonEmpty[idx].options) {
      cross(idx + 1, [...acc, { id: opt.id, image: opt.image }]);
    }
  }
  cross(0, []);
  return result;
}

/** Re-aplica a las combinaciones existentes la imagen del grupo dominante.
 *  Útil cuando el admin cambió el grupo dominante o editó imágenes de opciones
 *  y quiere re-sync sin tener que volver a generar todo el producto cartesiano. */
function reapplyDominantImages(form: ProductFormState): ProductFormState['combinations'] {
  const nonEmpty = form.variantGroups.filter((g) => g.options.length > 0);
  const dominant = nonEmpty.find((g) => g.isDominant);
  if (!dominant) return form.combinations;
  return form.combinations.map((c) => {
    // Buscar cuál opción de la combinación pertenece al grupo dominante
    const domOptId = c.optionIds.find((oid) => dominant.options.some((o) => o.id === oid));
    if (!domOptId) return c;
    const domOpt = dominant.options.find((o) => o.id === domOptId);
    return { ...c, image: domOpt?.image || '' };
  });
}

// ─── Helper editors para el diálogo de producto ───

function parseTagArray(json: string): { name: string; color: string }[] {
  try {
    const p = JSON.parse(json || '[]');
    if (Array.isArray(p)) {
      return p
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({ name: String(x.name ?? ''), color: String(x.color ?? '#6B7280') }))
        .filter((x) => x.name);
    }
  } catch { /* ignore */ }
  return [];
}

function CustomTagEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLOR_SWATCHES[0]);
  const tags = parseTagArray(value);

  const addTag = () => {
    const n = name.trim();
    if (!n) return;
    if (tags.some((t) => t.name === n)) {
      setName('');
      return;
    }
    onChange(JSON.stringify([...tags, { name: n, color }]));
    setName('');
  };

  const removeTag = (n: string) => {
    onChange(JSON.stringify(tags.filter((t) => t.name !== n)));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Etiqueta personalizada</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="Nombre de la etiqueta"
            className="flex-1"
          />
          <Button type="button" onClick={addTag} className="bg-brand hover:bg-amber-600">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div>
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {TAG_COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: color === c ? '#000' : 'transparent' }}
              aria-label={`Color ${c}`}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-7 w-10 rounded border border-gray-300 cursor-pointer"
            aria-label="Color personalizado"
          />
        </div>
      </div>
      {tags.length > 0 && (
        <div>
          <Label>Etiquetas actuales</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {tags.map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
                <button
                  type="button"
                  onClick={() => removeTag(t.name)}
                  className="ml-1 hover:bg-white/30 rounded-full p-0.5"
                  aria-label={`Quitar ${t.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseStringArray(json: string): string[] {
  try {
    const p = JSON.parse(json || '[]');
    if (Array.isArray(p)) return p.filter((x) => typeof x === 'string');
  } catch { /* ignore */ }
  return [];
}

function GalleryEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = parseStringArray(value);

  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    onChange(JSON.stringify([...images, u]));
    setUrl('');
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const newPaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        try {
          const path = await uploadImage(f);
          newPaths.push(path);
        } catch (err) {
          setUploadError((prev) => prev ? `${prev}; ${f.name}: ${(err as Error).message}` : `${f.name}: ${(err as Error).message}`);
        }
      }
      if (newPaths.length > 0) {
        onChange(JSON.stringify([...images, ...newPaths]));
      }
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeAt = (idx: number) => {
    onChange(JSON.stringify(images.filter((_, i) => i !== idx)));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Cargar imágenes (archivo local, máx. 2MB c/u)</Label>
        <div className="flex items-center gap-2 mt-1">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? 'Procesando…' : 'Seleccionar archivos'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFiles}
            disabled={uploading}
          />
          {uploading && <Loader2 className="h-4 w-4 animate-spin text-brand" />}
        </div>
        {uploadError && (
          <p className="text-xs text-red-600 mt-1">{uploadError}</p>
        )}
        <p className="text-xs text-gray-700 mt-1">
          Se comprimen automáticamente a WebP (máx. 800px de ancho). También puedes pegar una URL abajo.
        </p>
      </div>
      <div>
        <Label>Agregar imagen (URL)</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
            placeholder="/products/prod-00.jpg o https://..."
            className="flex-1"
          />
          <Button type="button" onClick={addUrl} className="bg-brand hover:bg-amber-600">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {images.length === 0 ? (
        <p className="text-sm text-gray-700">Sin imágenes en la galería. La imagen principal se usa como fallback.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
              <img src={src} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Eliminar imagen"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MainImageEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const path = await uploadImage(file);
      onChange(path);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Imagen principal</Label>
      {/* Preview grande */}
      <div className="w-full aspect-square rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shadow-sm">
        {value ? (
          <img src={value} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-200">
            <ImagePlus className="h-10 w-10" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
      </div>
      {/* Botón subir */}
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
      >
        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
        {uploading ? 'Procesando…' : 'Subir imagen'}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        disabled={uploading}
      />
      {uploadError ? (
        <p className="text-xs text-red-600">{uploadError}</p>
      ) : (
        <p className="text-xs text-gray-700">
          Máx. 2MB · Se comprime a WebP automáticamente.
        </p>
      )}
    </div>
  );
}

function VariantOptionRow({
  option,
  onUpdate,
  onRemove,
  stockFrozen = false,
}: {
  option: { id: string; name: string; priceMod: number; image: string; stock: number; available: boolean };
  onUpdate: (patch: Partial<{ name: string; priceMod: number; image: string; stock: number; available: boolean }>) => void;
  onRemove: () => void;
  /** Cuando hay combinaciones, el stock individual de la opción se congela. */
  stockFrozen?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const path = await uploadImage(file);
      onUpdate({ image: path });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <Input
        className="col-span-12 sm:col-span-4 h-8 text-sm"
        value={option.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Pequeño"
      />
      <Input
        className="col-span-4 sm:col-span-2 h-8 text-sm"
        type="number"
        step="0.01"
        value={option.priceMod}
        onChange={(e) => onUpdate({ priceMod: parseFloat(e.target.value) || 0 })}
      />
      <Input
        className={`col-span-4 sm:col-span-2 h-8 text-sm ${stockFrozen ? 'bg-gray-100 text-gray-700 cursor-not-allowed' : ''}`}
        type="number"
        value={option.stock}
        disabled={stockFrozen}
        onChange={(e) => onUpdate({ stock: parseInt(e.target.value) || 0 })}
        title={stockFrozen ? 'Stock congelado: hay combinaciones que gobiernan el stock' : undefined}
      />
      {/* Imagen: thumbnail + botón subir */}
      <div className="col-span-4 sm:col-span-3 flex items-center gap-1.5">
        <div className="h-8 w-8 rounded border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
          {option.image ? (
            <img src={option.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5 text-gray-200" />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Subir imagen"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500 text-white shadow-sm transition-all hover:bg-green-600 hover:scale-105 active:scale-95 shrink-0"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFile}
          disabled={uploading}
        />
        {option.image && (
          <button
            type="button"
            onClick={() => onUpdate({ image: '' })}
            title="Quitar imagen"
            className="flex h-6 w-6 items-center justify-center rounded text-red-500 hover:bg-red-50 shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {uploadError && (
          <span className="text-xs text-red-600 truncate max-w-[120px]" title={uploadError}>
            {uploadError}
          </span>
        )}
      </div>
      <div className="col-span-11 sm:col-span-1 flex justify-center">
        <Switch checked={option.available} onCheckedChange={(v) => onUpdate({ available: v })} aria-label="Disponible" />
      </div>
      <div className="col-span-1 flex justify-end">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={onRemove}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function VariantsEditor({
  form,
  setForm,
  optionStockFrozen = false,
  computedStock = 0,
  stockLevel = 'manual',
}: {
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  /** Cuando hay combinaciones, el stock de cada opción individual se congela. */
  optionStockFrozen?: boolean;
  /** Stock total calculado del producto (combinaciones > opciones > manual). */
  computedStock?: number;
  /** Nivel activo de cálculo de stock. */
  stockLevel?: 'combinations' | 'options' | 'manual';
}) {
  const addGroup = () => {
    setForm({
      ...form,
      variantGroups: [
        ...form.variantGroups,
        {
          id: genLocalId('vg'),
          name: '',
          required: false,
          maxSelect: 1,
          isImageGroup: false,
          isDominant: false,
          sortOrder: form.variantGroups.length,
          options: [],
        },
      ],
    });
  };

  const updateGroup = (gid: string, patch: Partial<ProductFormState['variantGroups'][number]>) => {
    setForm((prev) => {
      // Si se está activando isImageGroup en este grupo, desactivarlo en los
      // demás (sólo puede haber un grupo "con imagen" / dominante a la vez).
      if (patch.isImageGroup === true) {
        return {
          ...prev,
          variantGroups: prev.variantGroups.map((g) =>
            g.id === gid ? { ...g, ...patch } : { ...g, isImageGroup: false }
          ),
        };
      }
      return {
        ...prev,
        variantGroups: prev.variantGroups.map((g) => (g.id === gid ? { ...g, ...patch } : g)),
      };
    });
  };

  const removeGroup = (gid: string) => {
    setForm({
      ...form,
      variantGroups: form.variantGroups.filter((g) => g.id !== gid),
      combinations: form.combinations.filter((c) => !c.optionIds.some((oid) => form.variantGroups.find((g) => g.id === gid)?.options.some((o) => o.id === oid))),
    });
  };

  const addOption = (gid: string) => {
    setForm({
      ...form,
      variantGroups: form.variantGroups.map((g) =>
        g.id === gid
          ? {
              ...g,
              options: [
                ...g.options,
                {
                  id: genLocalId('vo'),
                  name: '',
                  priceMod: 0,
                  image: '',
                  stock: 0,
                  available: true,
                  sortOrder: g.options.length,
                },
              ],
            }
          : g
      ),
    });
  };

  const updateOption = (gid: string, oid: string, patch: Partial<ProductFormState['variantGroups'][number]['options'][number]>) => {
    setForm({
      ...form,
      variantGroups: form.variantGroups.map((g) =>
        g.id === gid
          ? { ...g, options: g.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)) }
          : g
      ),
    });
  };

  const removeOption = (gid: string, oid: string) => {
    setForm({
      ...form,
      variantGroups: form.variantGroups.map((g) =>
        g.id === gid ? { ...g, options: g.options.filter((o) => o.id !== oid) } : g
      ),
      combinations: form.combinations.filter((c) => !c.optionIds.includes(oid)),
    });
  };

  const generateCombs = () => {
    const combs = generateCombinationsFromForm(form.variantGroups);
    if (combs.length === 0) return;
    setForm({ ...form, combinations: combs });
  };

  /** Marcar un grupo como dominante (desmarca los demás, ya que sólo puede haber uno). */
  const setDominant = (gid: string) => {
    setForm({
      ...form,
      variantGroups: form.variantGroups.map((g) => ({ ...g, isDominant: g.id === gid })),
    });
  };

  /** Re-aplica a las combinaciones existentes la imagen del grupo dominante. */
  const applyDominantImages = () => {
    setForm({ ...form, combinations: reapplyDominantImages(form) });
  };

  const updateComb = (cid: string, patch: Partial<ProductFormState['combinations'][number]>) => {
    setForm({
      ...form,
      combinations: form.combinations.map((c) => (c.id === cid ? { ...c, ...patch } : c)),
    });
  };

  const removeComb = (cid: string) => {
    setForm({ ...form, combinations: form.combinations.filter((c) => c.id !== cid) });
  };

  // Mapa optionId -> name para mostrar nombres en la tabla
  const optNameMap: Record<string, string> = {};
  for (const g of form.variantGroups) {
    for (const o of g.options) {
      optNameMap[o.id] = o.name;
    }
  }

  // ¿Hay algún grupo marcado como dominante? (sólo relevante cuando hay 2+ grupos)
  const hasDominant = form.variantGroups.some((g) => g.isDominant);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Grupos de variantes</Label>
          <p className="text-xs text-gray-700">Ej: Tamaño, Color, Sabor. Necesitas 2+ grupos para generar combinaciones.</p>
        </div>
        <Button type="button" onClick={addGroup} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Grupo
        </Button>
      </div>

      {form.variantGroups.length === 0 && (
        <p className="text-sm text-gray-600 italic">Sin grupos de variantes. Este producto no tiene variantes.</p>
      )}

      {/* Aviso de stock total calculado cuando hay grupos de variantes */}
      {form.variantGroups.length > 0 && (() => {
        return (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-snug">
              El stock general del producto está <strong>congelado</strong>.{' '}
              {stockLevel === 'combinations' ? (
                <>
                  Como hay combinaciones, se calcula como la <strong>suma del stock de las combinaciones</strong>.
                  El stock individual de cada opción está <strong>congelado</strong> (sólo referencia) porque
                  las combinaciones tienen prioridad.
                </>
              ) : stockLevel === 'options' ? (
                <>
                  Como no hay combinaciones, se calcula como la <strong>suma del stock de las opciones</strong>.
                  Si creas combinaciones, el stock pasará a gobernarse por ellas y el de las opciones se congelará.
                </>
              ) : null}
              <br />
              Stock total actual: <strong>{computedStock}</strong> unidades.
            </div>
          </div>
        );
      })()}

      {form.variantGroups.map((g) => (
        <Card key={g.id} className="border-gray-200">
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-5">
                <Label className="text-xs">Nombre del grupo</Label>
                <Input value={g.name} onChange={(e) => updateGroup(g.id, { name: e.target.value })} placeholder="Tamaño" />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Max sel.</Label>
                <Input type="number" min={1} value={g.maxSelect} onChange={(e) => updateGroup(g.id, { maxSelect: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="col-span-4 sm:col-span-2 flex items-center gap-2 pb-2">
                <Switch checked={g.required} onCheckedChange={(v) => updateGroup(g.id, { required: v })} id={`req-${g.id}`} />
                <Label htmlFor={`req-${g.id}`} className="text-xs">Requerido</Label>
              </div>
              <div className="col-span-4 sm:col-span-2 flex items-center gap-2 pb-2">
                <Switch checked={g.isImageGroup} onCheckedChange={(v) => updateGroup(g.id, { isImageGroup: v })} id={`img-${g.id}`} />
                <Label htmlFor={`img-${g.id}`} className="text-xs">C/ imagen</Label>
              </div>
              <div className="col-span-12 sm:col-span-1 flex justify-end">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeGroup(g.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selector de grupo dominante: sólo se muestra cuando hay 2+ grupos.
                Sólo un grupo puede ser dominante a la vez. */}
            {form.variantGroups.length >= 2 && (
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-amber-50/60 border border-amber-200 cursor-pointer w-fit">
                <input
                  type="radio"
                  name="dominant-group"
                  checked={!!g.isDominant}
                  onChange={() => setDominant(g.id)}
                  className="h-3.5 w-3.5 accent-amber-500"
                />
                <span className="text-xs font-medium text-amber-800">
                  Grupo dominante
                  {g.isDominant && <span className="ml-1 text-amber-600">· las combinaciones toman su imagen</span>}
                </span>
              </label>
            )}

            {/* Opciones del grupo */}
            <div className="space-y-2 pl-2 border-l-2 border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Opciones</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => addOption(g.id)}>
                  <Plus className="h-3 w-3 mr-1" /> Opción
                </Button>
              </div>
              {g.options.length === 0 && <p className="text-xs text-gray-600 italic">Sin opciones.</p>}
              {g.options.length > 0 && (
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-12 sm:col-span-4 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Nombre</span>
                  <span className="col-span-4 sm:col-span-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">+ Precio</span>
                  <span className="col-span-4 sm:col-span-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Stock</span>
                  <span className="col-span-4 sm:col-span-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Imagen</span>
                  <span className="col-span-12 sm:col-span-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center">Disp.</span>
                </div>
              )}
              {g.options.map((o) => (
                <VariantOptionRow
                  key={o.id}
                  option={o}
                  onUpdate={(patch) => updateOption(g.id, o.id, patch)}
                  onRemove={() => removeOption(g.id, o.id)}
                  stockFrozen={optionStockFrozen}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Combinaciones */}
      {form.variantGroups.filter((g) => g.options.length > 0).length >= 2 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label>Combinaciones</Label>
            <div className="flex gap-2 flex-wrap">
              {hasDominant && form.combinations.length > 0 && (
                <Button
                  type="button"
                  onClick={applyDominantImages}
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  title="Sobrescribe las imágenes de todas las combinaciones con la imagen de la opción del grupo dominante"
                >
                  <ImagePlus className="h-3.5 w-3.5 mr-1" /> Aplicar imágenes del dominante
                </Button>
              )}
              <Button type="button" onClick={generateCombs} size="sm" className="bg-brand hover:bg-amber-600">
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Generar combinaciones
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-700">
            El <strong>stock</strong> mostrado al cliente se toma de las combinaciones (no del stock individual de cada opción).
            La <strong>imagen</strong> de cada combinación se autocompleta con la imagen de la opción del grupo dominante, pero puedes editarla manualmente.
          </p>
          {form.combinations.length === 0 ? (
            <p className="text-xs text-gray-700 italic">Haz clic en &quot;Generar combinaciones&quot; para crear el producto cartesiano.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Imagen</TableHead>
                    <TableHead>Combinación</TableHead>
                    <TableHead className="w-28">SKU</TableHead>
                    <TableHead className="w-20">Stock</TableHead>
                    <TableHead className="w-24">Precio</TableHead>
                    <TableHead className="w-16">Disp.</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.combinations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <CombinationImageCell
                          value={c.image}
                          onChange={(v) => updateComb(c.id, { image: v })}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">
                        {c.optionIds.map((oid) => optNameMap[oid] || '?').join(' / ')}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 w-24 text-xs"
                          value={c.sku}
                          onChange={(e) => updateComb(c.id, { sku: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 w-16 text-xs"
                          type="number"
                          value={c.stock}
                          onChange={(e) => updateComb(c.id, { stock: parseInt(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 w-20 text-xs"
                          type="number"
                          step="0.01"
                          value={c.price ?? ''}
                          placeholder="auto"
                          onChange={(e) => {
                            const v = e.target.value;
                            updateComb(c.id, { price: v === '' ? null : parseFloat(v) || 0 });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={c.available} onCheckedChange={(v) => updateComb(c.id, { available: v })} />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeComb(c.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Celda de imagen para combinaciones: thumbnail + subir + URL + quitar. */
function CombinationImageCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const path = await uploadImage(file);
      onChange(path);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="h-8 w-8 rounded border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="h-3.5 w-3.5 text-gray-200" />
        )}
      </div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Subir imagen"
        className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500 text-white shadow-sm transition-all hover:bg-green-600 hover:scale-105 active:scale-95 shrink-0"
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        disabled={uploading}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Quitar imagen"
          className="flex h-6 w-6 items-center justify-center rounded text-red-500 hover:bg-red-50 shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {uploadError && (
        <span className="text-xs text-red-600 ml-1 max-w-[150px] truncate" title={uploadError}>
          {uploadError}
        </span>
      )}
    </div>
  );
}

function ExtrasEditor({
  form,
  setForm,
}: {
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
}) {
  const addExtra = () => {
    setForm({
      ...form,
      productExtras: [
        ...form.productExtras,
        {
          id: genLocalId('pex'),
          name: '',
          description: '',
          priceMod: 0,
          required: false,
          sortOrder: form.productExtras.length,
        },
      ],
    });
  };

  const updateExtra = (eid: string, patch: Partial<ProductFormState['productExtras'][number]>) => {
    setForm({
      ...form,
      productExtras: form.productExtras.map((e) => (e.id === eid ? { ...e, ...patch } : e)),
    });
  };

  const removeExtra = (eid: string) => {
    setForm({ ...form, productExtras: form.productExtras.filter((e) => e.id !== eid) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Extras del producto</Label>
          <p className="text-xs text-gray-700">Adicionales que el cliente puede elegir (ej: &quot;Añadir queso extra&quot;).</p>
        </div>
        <Button type="button" onClick={addExtra} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Extra
        </Button>
      </div>
      {form.productExtras.length === 0 && (
        <p className="text-sm text-gray-600 italic">Sin extras. El cliente no podrá añadir adicionales.</p>
      )}
      {form.productExtras.map((e) => (
        <Card key={e.id} className="border-gray-200">
          <CardContent className="p-3 grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-4">
              <Label className="text-xs">Nombre</Label>
              <Input value={e.name} onChange={(ev) => updateExtra(e.id, { name: ev.target.value })} placeholder="Queso extra" />
            </div>
            <div className="col-span-12 sm:col-span-4">
              <Label className="text-xs">Descripción</Label>
              <Input value={e.description} onChange={(ev) => updateExtra(e.id, { description: ev.target.value })} placeholder="Opcional" />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Label className="text-xs">Precio (+)</Label>
              <Input type="number" step="0.01" value={e.priceMod} onChange={(ev) => updateExtra(e.id, { priceMod: parseFloat(ev.target.value) || 0 })} />
            </div>
            <div className="col-span-4 sm:col-span-1 flex items-center gap-2 pb-2">
              <Switch checked={e.required} onCheckedChange={(v) => updateExtra(e.id, { required: v })} id={`reqex-${e.id}`} />
              <Label htmlFor={`reqex-${e.id}`} className="text-xs">Oblig.</Label>
            </div>
            <div className="col-span-2 sm:col-span-1 flex justify-end">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeExtra(e.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Pestañas del overlay de edición de producto a pantalla completa
// Nota: la pestaña "Promo" se eliminó (unificada con "Oferta"). Las ofertas
// (precio rebajado permanente o por temporada) se gestionan desde la pestaña
// "Oferta". Los campos promo* se mantienen en ProductFormState para no
// perder datos existentes al guardar, pero ya no se editan desde la UI.
const PRODUCT_EDIT_TABS: { value: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'info', label: 'Info', icon: Package },
  { value: 'availability', label: 'Disponibilidad', icon: Store },
  { value: 'oferta', label: 'Oferta', icon: Tags },
  { value: 'tags', label: 'Etiquetas', icon: Tags },
  { value: 'gallery', label: 'Galería', icon: ImagePlus },
  { value: 'variants', label: 'Variantes', icon: Layers },
  { value: 'extras', label: 'Extras', icon: Plus },
  { value: 'wholesale', label: 'Por mayor', icon: DollarSign },
  { value: 'reservation', label: 'Reserva', icon: CalendarClock },
];

function WholesaleTiersEditor({
  form,
  setForm,
  computedStock = 0,
}: {
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  /** Stock total actual del producto (para sugerir maxQty del último rango). */
  computedStock?: number;
}) {
  const addTier = () => {
    // El nuevo rango se añade al final. Su minQty por defecto es el maxQty
    // del rango anterior + 1 (o 1 si no hay rangos), y su maxQty por defecto
    // es el stock actual del producto (o 0 = sin límite si no hay stock).
    const sorted = [...form.wholesaleTiers].sort((a, b) => (a.minQty - b.minQty) || (a.sortOrder - b.sortOrder));
    const lastMax = sorted.length > 0 ? sorted[sorted.length - 1].maxQty : 0;
    const newMin = Math.max(1, (lastMax || 0) + 1);
    setForm({
      ...form,
      wholesaleTiers: [
        ...form.wholesaleTiers,
        {
          id: genLocalId('wt'),
          name: '',
          minQty: newMin,
          maxQty: computedStock > 0 ? computedStock : 0,
          price: 0,
          sortOrder: form.wholesaleTiers.length,
        },
      ],
    });
  };

  const updateTier = (tid: string, patch: Partial<ProductFormState['wholesaleTiers'][number]>) => {
    setForm({
      ...form,
      wholesaleTiers: form.wholesaleTiers.map((t) => (t.id === tid ? { ...t, ...patch } : t)),
    });
  };

  const removeTier = (tid: string) => {
    setForm({
      ...form,
      wholesaleTiers: form.wholesaleTiers.filter((t) => t.id !== tid),
    });
  };

  // Rangos ordenados por minQty asc
  const tiers = [...form.wholesaleTiers].sort((a, b) => (a.minQty - b.minQty) || (a.sortOrder - b.sortOrder));

  // ── Validaciones de rangos ──
  const validationIssues: string[] = [];
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const label = t.name?.trim() || `Rango ${i + 1}`;
    // minQty > 0
    if (t.minQty <= 0) {
      validationIssues.push(`"${label}": la cantidad mínima debe ser mayor que 0.`);
    }
    // maxQty == 0 (sin límite) sólo permitido en el ÚLTIMO rango
    if (t.maxQty === 0 && i !== tiers.length - 1) {
      validationIssues.push(`"${label}": la cantidad máxima no puede ser 0 (sin límite) si hay rangos posteriores. Sólo el último rango puede no tener límite.`);
    }
    // minQty <= maxQty (cuando maxQty != 0)
    if (t.maxQty !== 0 && t.minQty > t.maxQty) {
      validationIssues.push(`"${label}": la cantidad mínima (${t.minQty}) no puede ser mayor que la máxima (${t.maxQty}).`);
    }
    // precio >= 0
    if (t.price < 0) {
      validationIssues.push(`"${label}": el precio no puede ser negativo.`);
    }
    // solapamiento con el siguiente rango
    if (i < tiers.length - 1) {
      const next = tiers[i + 1];
      if (t.maxQty !== 0 && next.minQty <= t.maxQty) {
        validationIssues.push(`"${label}" y "${next.name?.trim() || `Rango ${i + 2}`}": hay solapamiento o hueco (máx ${t.maxQty} → mín ${next.minQty}). El siguiente rango debe empezar en ${t.maxQty + 1} o más.`);
      }
    }
  }
  // precio descendente (recomendación, no error bloqueante)
  const priceWarning: string[] = [];
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].price >= tiers[i - 1].price) {
      priceWarning.push(`El precio del rango ${i + 1} debería ser menor que el del rango ${i} (los precios al por mayor suelen bajar con más cantidad).`);
      break;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Rangos de precios al por mayor</Label>
          <p className="text-xs text-gray-700">
            Define precios por rango de cantidad. El <strong>nombre es opcional</strong> (se autogenera como "Rango 1", "Rango 2", etc.).
            {' '}La <strong>cantidad máxima del último rango</strong> se sugiere automáticamente como el stock actual del producto ({computedStock} unidades); 0 = sin límite.
          </p>
        </div>
        {/* No permitir añadir rangos si la venta al por mayor está deshabilitada:
            primero hay que activar el toggle "Venta al por mayor habilitada"
            de arriba. Evita rangos huérfanos que no se mostrarían en la tienda. */}
        <Button
          type="button"
          onClick={addTier}
          variant="outline"
          size="sm"
          disabled={!form.wholesaleEnabled}
          title={!form.wholesaleEnabled ? 'Activa primero "Venta al por mayor habilitada"' : 'Añadir un nuevo rango'}
        >
          <Plus className="h-4 w-4 mr-1" /> Rango
        </Button>
      </div>

      {!form.wholesaleEnabled && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          ⚠ Activa el toggle <strong>"Venta al por mayor habilitada"</strong> de arriba para poder añadir rangos.
        </p>
      )}

      {tiers.length === 0 ? (
        <p className="text-sm text-gray-600 italic">Sin rangos. Agrega al menos uno para activar precios por volumen.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Nombre <span className="text-gray-600 font-normal">(opcional)</span></TableHead>
                <TableHead className="w-28">Cant. mínima</TableHead>
                <TableHead className="w-40">Cant. máxima</TableHead>
                <TableHead className="w-32">Precio por unidad</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((t, idx) => {
                const isLast = idx === tiers.length - 1;
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        value={t.name}
                        onChange={(e) => updateTier(t.id, { name: e.target.value })}
                        placeholder={`Rango ${idx + 1}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm w-24"
                        type="number"
                        min={0}
                        value={t.minQty}
                        onChange={(e) => updateTier(t.id, { minQty: parseInt(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-8 text-sm w-24"
                          type="number"
                          min={0}
                          value={t.maxQty}
                          onChange={(e) => updateTier(t.id, { maxQty: parseInt(e.target.value) || 0 })}
                          title={isLast ? '0 = sin límite (último rango)' : 'Cantidad máxima del rango'}
                        />
                        {isLast && (
                          <button
                            type="button"
                            onClick={() => updateTier(t.id, { maxQty: computedStock > 0 ? computedStock : 0 })}
                            title={`Usar stock actual (${computedStock})`}
                            className="text-[10px] px-1.5 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors whitespace-nowrap"
                          >
                            = stock
                          </button>
                        )}
                      </div>
                      {isLast && t.maxQty === 0 && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">0 = sin límite</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        type="number"
                        step="0.01"
                        value={t.price}
                        onChange={(e) => updateTier(t.id, { price: parseFloat(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => removeTier(t.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Errores de validación (bloqueantes) */}
      {validationIssues.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 leading-snug">
            <strong>Revisa los rangos antes de guardar:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              {validationIssues.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Advertencia de precios (no bloqueante) */}
      {validationIssues.length === 0 && priceWarning.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{priceWarning[0]}</p>
        </div>
      )}

      <p className="text-xs text-gray-600">
        Los rangos se ordenan automáticamente por cantidad mínima al mostrarlos en la tienda.
        Si el nombre está vacío, se mostrará "Rango 1", "Rango 2", etc.
      </p>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  // Panel de categorías fusionado en la misma vista que productos.
  // Permite gestionar categorías y productos desde un único lugar, sin sub-tabs.
  const [showCategoriesPanel, setShowCategoriesPanel] = useState<boolean>(false);

  // Form state
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [loadingDetail, setLoadingDetail] = useState(false);
  // Pestaña activa del overlay de edición a pantalla completa
  const [editTab, setEditTab] = useState<string>('info');
  // Feedback visual tras guardar (banner verde que desaparece solo).
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories'),
      ]);
      const pData = await pRes.json().catch(() => []);
      const cData = await cRes.json().catch(() => []);
      setProducts(Array.isArray(pData) ? pData : []);
      setCategories(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || '' });
    setEditTab('info');
    setSavedFeedback(null);
    setDialogOpen(true);
  };

  const openEdit = async (p: Product) => {
    setEditingProduct(p);
    setLoadingDetail(true);
    setEditTab('info');
    setSavedFeedback(null);
    setDialogOpen(true);
    // Cargar detalle completo (con variant groups, combinations, extras)
    try {
      const res = await fetch(`/api/products/${p.id}`);
      const detail = res.ok ? await res.json() : null;
      let parsedImages = '[]';
      try { parsedImages = typeof detail?.images === 'string' ? detail.images : JSON.stringify(detail?.images ?? []); } catch { /* ignore */ }
      let parsedTags = '[]';
      try { parsedTags = typeof detail?.tags === 'string' ? detail.tags : JSON.stringify(detail?.tags ?? []); } catch { /* ignore */ }
      const vGroups: ProductFormState['variantGroups'] = Array.isArray(detail?.variantGroups)
        ? detail.variantGroups.map((g: VariantGroup & { options?: VariantOption[] }) => ({
            id: g.id,
            name: g.name,
            required: g.required,
            maxSelect: g.maxSelect,
            isImageGroup: g.isImageGroup,
            isDominant: g.isDominant === true,
            sortOrder: g.sortOrder,
            options: (g.options || []).map((o) => ({
              id: o.id,
              name: o.name,
              priceMod: o.priceMod,
              image: o.image,
              stock: o.stock,
              available: o.available,
              sortOrder: o.sortOrder,
            })),
          }))
        : [];
      const combs: ProductFormState['combinations'] = Array.isArray(detail?.combinations)
        ? detail.combinations.map((c: Combination) => {
            let ids: string[] = [];
            try { const p = JSON.parse(c.optionIds || '[]'); if (Array.isArray(p)) ids = p.filter((x: unknown) => typeof x === 'string'); } catch { /* ignore */ }
            return {
              id: c.id,
              optionIds: ids,
              sku: c.sku,
              stock: c.stock,
              price: c.price,
              image: c.image,
              available: c.available,
              sortOrder: c.sortOrder,
            };
          })
        : [];
      const extras: ProductFormState['productExtras'] = Array.isArray(detail?.productExtras)
        ? detail.productExtras.map((e: ProductExtra) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            priceMod: e.priceMod,
            required: e.required,
            sortOrder: e.sortOrder,
          }))
        : [];
      const wTiers: ProductFormState['wholesaleTiers'] = Array.isArray(detail?.wholesaleTiers)
        ? detail.wholesaleTiers.map((t: WholesaleTier) => ({
            id: t.id,
            name: t.name,
            minQty: t.minQty,
            maxQty: t.maxQty,
            price: t.price,
            sortOrder: t.sortOrder,
          }))
        : [];
      setForm({
        name: p.name,
        shortName: p.shortName || '',
        sku: p.sku || '',
        description: p.description,
        price: p.price,
        image: p.image,
        images: parsedImages,
        tags: parsedTags,
        categoryId: p.categoryId,
        stock: p.stock,
        featured: p.featured,
        order: p.order,
        // SIGECOS: unidad y código
        saleUnit: (detail?.saleUnit ?? p.saleUnit) || 'unidad',
        barcode: (detail?.barcode ?? p.barcode) ?? '',
        // SIGECOS: tipo y estado
        productType: (detail?.productType ?? p.productType) || 'elaborado',
        status: (detail?.status ?? p.status) || 'active',
        // SIGECOS: disponibilidad
        posAvailable: detail?.posAvailable ?? p.posAvailable ?? true,
        tiendaAvailable: detail?.tiendaAvailable ?? p.tiendaAvailable ?? true,
        // SIGECOS: anticipo
        advanceType: (detail?.advanceType ?? p.advanceType) || 'sin',
        advanceValue: Number(detail?.advanceValue ?? p.advanceValue ?? 0),
        minHours: Number(detail?.minHours ?? p.minHours ?? 24),
        minHoursUnit: (detail?.minHoursUnit ?? p.minHoursUnit) === 'dias' ? 'dias' : 'horas',
        // SIGECOS: costos (admin only)
        costPrice: Number(detail?.costPrice ?? p.costPrice ?? 0),
        marginPercent: Number(detail?.marginPercent ?? p.marginPercent ?? 0),
        offerEnabled: p.offerEnabled ?? false,
        offerType: p.offerType || 'permanente',
        offerPrice: p.offerPrice ?? 0,
        offerStart: p.offerStart ?? null,
        offerEnd: p.offerEnd ?? null,
        wholesaleEnabled: detail?.wholesaleEnabled ?? p.wholesaleEnabled ?? false,
        wholesalePrice: detail?.wholesalePrice ?? p.wholesalePrice ?? 0,
        wholesaleMinQty: detail?.wholesaleMinQty ?? p.wholesaleMinQty ?? 10,
        wholesaleTiers: wTiers,
        reservationEnabled: detail?.reservationEnabled ?? p.reservationEnabled ?? false,
        maxReservations: detail?.maxReservations ?? p.maxReservations ?? 50,
        reservationDays: detail?.reservationDays ?? p.reservationDays ?? 7,
        reservationDeposit: detail?.reservationDeposit ?? p.reservationDeposit ?? 0,
        promoEnabled: detail?.promoEnabled ?? p.promoEnabled ?? false,
        promoType: detail?.promoType ?? p.promoType ?? 'discount',
        promoValue: detail?.promoValue ?? p.promoValue ?? 0,
        promoBuyQty: detail?.promoBuyQty ?? p.promoBuyQty ?? 0,
        promoGetQty: detail?.promoGetQty ?? p.promoGetQty ?? 0,
        promoStart: detail?.promoStart ?? p.promoStart ?? null,
        promoEnd: detail?.promoEnd ?? p.promoEnd ?? null,
        variantGroups: vGroups,
        combinations: combs,
        productExtras: extras,
      });
    } catch (err) {
      console.error('Error loading product detail:', err);
      setForm({
        name: p.name,
        shortName: p.shortName || '',
        sku: p.sku || '',
        description: p.description,
        price: p.price,
        image: p.image,
        images: p.images || '[]',
        tags: p.tags || '[]',
        categoryId: p.categoryId,
        stock: p.stock,
        featured: p.featured,
        order: p.order,
        saleUnit: p.saleUnit || 'unidad',
        barcode: p.barcode ?? '',
        productType: p.productType || 'elaborado',
        status: p.status || 'active',
        posAvailable: p.posAvailable ?? true,
        tiendaAvailable: p.tiendaAvailable ?? true,
        advanceType: p.advanceType || 'sin',
        advanceValue: Number(p.advanceValue ?? 0),
        minHours: Number(p.minHours ?? 24),
        minHoursUnit: p.minHoursUnit === 'dias' ? 'dias' : 'horas',
        costPrice: Number(p.costPrice ?? 0),
        marginPercent: Number(p.marginPercent ?? 0),
        offerEnabled: p.offerEnabled ?? false,
        offerType: p.offerType || 'permanente',
        offerPrice: p.offerPrice ?? 0,
        offerStart: p.offerStart ?? null,
        offerEnd: p.offerEnd ?? null,
        wholesaleEnabled: p.wholesaleEnabled ?? false,
        wholesalePrice: p.wholesalePrice ?? 0,
        wholesaleMinQty: p.wholesaleMinQty ?? 10,
        wholesaleTiers: [],
        reservationEnabled: p.reservationEnabled ?? false,
        maxReservations: p.maxReservations ?? 50,
        reservationDays: p.reservationDays ?? 7,
        reservationDeposit: p.reservationDeposit ?? 0,
        promoEnabled: p.promoEnabled ?? false,
        promoType: p.promoType ?? 'discount',
        promoValue: p.promoValue ?? 0,
        promoBuyQty: p.promoBuyQty ?? 0,
        promoGetQty: p.promoGetQty ?? 0,
        promoStart: p.promoStart ?? null,
        promoEnd: p.promoEnd ?? null,
        variantGroups: [],
        combinations: [],
        productExtras: [],
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  // ═══ Stock del producto: prioridad combinaciones > opciones > stock general ═══
  //
  // 1. Si hay combinaciones → el stock se calcula como la SUMA del stock de las
  //    combinaciones. El stock de cada OPCIÓN individual se congela (no es editable
  //    porque ya no gobierna el stock) y se muestra como referencia.
  // 2. Si NO hay combinaciones pero SÍ hay opciones de variantes → el stock se
  //    calcula como la SUMA del stock de las opciones.
  // 3. Si no hay variantes → se usa el campo `stock` editables directamente.
  const hasVariantGroups = form.variantGroups.length > 0;
  const hasVariantOptions = hasVariantGroups && form.variantGroups.some((g) => g.options.length > 0);
  const hasCombinations = form.combinations.length > 0;

  // Suma del stock de todas las opciones de todos los grupos (nivel 2)
  const optionsStockSum = useMemo(() => {
    return form.variantGroups.reduce(
      (total, g) => total + g.options.reduce((sub, o) => sub + (Number(o.stock) || 0), 0),
      0,
    );
  }, [form.variantGroups]);

  // Suma del stock de todas las combinaciones (nivel 1, máxima prioridad)
  const combinationsStockSum = useMemo(() => {
    return form.combinations.reduce((total, c) => total + (Number(c.stock) || 0), 0);
  }, [form.combinations]);

  // Stock calculado según la prioridad: combinaciones > opciones > stock general
  const computedStock = hasCombinations
    ? combinationsStockSum
    : hasVariantOptions
      ? optionsStockSum
      : form.stock;

  // Nivel activo para mostrar en los avisos
  const stockLevel: 'combinations' | 'options' | 'manual' = hasCombinations
    ? 'combinations'
    : hasVariantOptions
      ? 'options'
      : 'manual';

  // ¿Está el campo stock general congelado? (sí cuando hay opciones o combinaciones)
  const stockFrozen = hasVariantOptions || hasCombinations;

  // ¿Está el stock de cada opción congelado? (sí cuando hay combinaciones)
  const optionStockFrozen = hasCombinations;

  const handleSave = async () => {
    // ── Validaciones previas al guardado ──
    // 0. Bloquear si hay imágenes subiéndose aún
    if (getActiveUploads() > 0) {
      alert('⏳ Hay imágenes que aún se están subiendo al servidor.\n\nEspera unos segundos a que terminen y vuelve a hacer clic en Guardar.');
      return;
    }
    // 0.5. Validar nombre obligatorio
    if (!form.name || !form.name.trim()) {
      alert('⚠️ El nombre del producto es obligatorio.\n\nPor favor ingresa un nombre antes de guardar.');
      setSaving(false);
      return;
    }
    // 1. Fechas de oferta: fin no puede ser anterior a inicio
    if (form.offerType === 'temporada' && form.offerEnabled && form.offerStart && form.offerEnd) {
      if (form.offerEnd < form.offerStart) {
        alert('La fecha de fin de la oferta no puede ser anterior a la fecha de inicio. Corrige las fechas antes de guardar.');
        setSaving(false);
        return;
      }
    }
    // 2. Si es de temporada y sólo tiene una fecha, advertir
    if (form.offerType === 'temporada' && form.offerEnabled && ((!form.offerStart) !== (!form.offerEnd))) {
      alert('Si la oferta es de temporada, debes definir ambas fechas (inicio y fin), o cambiar el tipo a "Permanente".');
      setSaving(false);
      return;
    }
    // 3. Validar precio de oferta
    if (form.offerEnabled) {
      if (!form.offerPrice || form.offerPrice <= 0) {
        alert('Has habilitado la oferta pero el precio de oferta es 0 o está vacío.\n\nIngresa un precio de oferta mayor que 0, o desactiva el switch "Habilitar oferta".');
        setSaving(false);
        return;
      }
      if (form.offerPrice >= form.price) {
        alert(`El precio de oferta ($${form.offerPrice.toFixed(2)}) debe ser MENOR al precio regular ($${form.price.toFixed(2)}).\n\nSi no quieres rebajar el precio, desactiva el switch "Habilitar oferta".`);
        setSaving(false);
        return;
      }
    }
    // 4. Validar rangos al por mayor (si hay)
    if (form.wholesaleTiers.length > 0) {
      const sorted = [...form.wholesaleTiers].sort((a, b) => (a.minQty - b.minQty) || (a.sortOrder - b.sortOrder));
      const issues: string[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        const label = t.name?.trim() || `Rango ${i + 1}`;
        if (t.minQty <= 0) issues.push(`"${label}": la cantidad mínima debe ser mayor que 0.`);
        if (t.maxQty === 0 && i !== sorted.length - 1) issues.push(`"${label}": la cantidad máxima no puede ser 0 (sin límite) si hay rangos posteriores.`);
        if (t.maxQty !== 0 && t.minQty > t.maxQty) issues.push(`"${label}": la cantidad mínima (${t.minQty}) no puede ser mayor que la máxima (${t.maxQty}).`);
        if (t.price < 0) issues.push(`"${label}": el precio no puede ser negativo.`);
        if (i < sorted.length - 1) {
          const next = sorted[i + 1];
          if (t.maxQty !== 0 && next.minQty <= t.maxQty) {
            issues.push(`"${label}" y "${next.name?.trim() || `Rango ${i + 2}`}": hay solapamiento o hueco. El siguiente rango debe empezar en ${t.maxQty + 1} o más.`);
          }
        }
      }
      if (issues.length > 0) {
        alert('Revisa los rangos al por mayor:\n\n• ' + issues.join('\n• '));
        setSaving(false);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        shortName: form.shortName,
        sku: form.sku,
        description: form.description,
        price: form.price,
        image: form.image,
        images: form.images,
        tags: form.tags,
        categoryId: form.categoryId,
        // Si hay variantes/combinaciones, el stock general se calcula automáticamente
        // según la prioridad combinaciones > opciones; el campo queda congelado en la UI.
        stock: stockFrozen ? computedStock : form.stock,
        featured: form.featured,
        order: form.order,
        // SIGECOS
        saleUnit: form.saleUnit,
        barcode: form.barcode,
        productType: form.productType,
        status: form.status,
        posAvailable: form.posAvailable,
        tiendaAvailable: form.tiendaAvailable,
        advanceType: form.advanceType,
        advanceValue: form.advanceValue,
        minHours: form.minHours,
        minHoursUnit: form.minHoursUnit,
        costPrice: form.costPrice,
        marginPercent: form.marginPercent,
        offerEnabled: form.offerEnabled,
        offerType: form.offerType,
        offerPrice: form.offerPrice,
        offerStart: form.offerStart,
        offerEnd: form.offerEnd,
        wholesaleEnabled: form.wholesaleEnabled,
        wholesalePrice: form.wholesalePrice,
        wholesaleMinQty: form.wholesaleMinQty,
        wholesaleTiers: [...form.wholesaleTiers]
          .sort((a, b) => (a.minQty - b.minQty) || (a.sortOrder - b.sortOrder))
          .map((t, ti) => ({
            name: t.name?.trim() || `Rango ${ti + 1}`,
            minQty: t.minQty,
            maxQty: t.maxQty,
            price: t.price,
            sortOrder: ti,
          })),
        reservationEnabled: form.reservationEnabled,
        maxReservations: form.maxReservations,
        reservationDays: form.reservationDays,
        reservationDeposit: form.reservationDeposit,
        promoEnabled: form.promoEnabled,
        promoType: form.promoType,
        promoValue: form.promoValue,
        promoBuyQty: form.promoBuyQty,
        promoGetQty: form.promoGetQty,
        promoStart: form.promoStart,
        promoEnd: form.promoEnd,
        variantGroups: form.variantGroups.map((g, gi) => ({
          id: g.id,
          name: g.name,
          required: g.required,
          maxSelect: g.maxSelect,
          isImageGroup: g.isImageGroup,
          isDominant: g.isDominant === true,
          sortOrder: g.sortOrder ?? gi,
          options: g.options.map((o, oi) => ({
            id: o.id,
            name: o.name,
            priceMod: o.priceMod,
            image: o.image,
            stock: o.stock,
            available: o.available,
            sortOrder: o.sortOrder ?? oi,
          })),
        })),
        combinations: form.combinations.map((c, ci) => ({
          id: c.id,
          optionIds: JSON.stringify(c.optionIds),
          sku: c.sku,
          stock: c.stock,
          price: c.price,
          image: c.image,
          available: c.available,
          sortOrder: c.sortOrder ?? ci,
        })),
        productExtras: form.productExtras.map((e, ei) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          priceMod: e.priceMod,
          required: e.required,
          sortOrder: e.sortOrder ?? ei,
        })),
      };
      if (editingProduct) {
        const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          // Mostrar feedback de éxito SIN cerrar el overlay, para que el admin
          // pueda seguir revisando o haciendo otros cambios.
          setSavedFeedback(`✓ Cambios guardados correctamente (${new Date().toLocaleTimeString('es-ES')}).`);
          setTimeout(() => setSavedFeedback(null), 4000);
          alert('✓ Producto guardado correctamente.');
          // Recargar la lista de productos (para que la tabla refleje los cambios).
          fetchData();
          // Actualizar el editingProduct con los campos escalares que el
          // backend pudo haber recalculado (stock congelado, marginPercent).
          // No reemplazamos todo el objeto porque el detalle trae relaciones
          // (variantGroups, combinations, etc.) con tipos más complejos.
          try {
            const detail = await (await fetch(`/api/admin/products/${editingProduct.id}`)).json();
            if (detail && detail.id) {
              setEditingProduct((prev) => prev ? { ...prev, ...detail } : prev);
            }
          } catch {
            /* ignore detail refresh error */
          }
        } else {
          alert('Error al guardar los cambios. Revisa la consola para más detalles.');
        }
      } else {
        // Producto NUEVO: después de crear, sí cerramos el overlay porque el
        // producto recién creado tiene IDs nuevos que el admin no necesita
        // seguir editando inmediatamente.
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setDialogOpen(false);
          fetchData();
          alert('✓ Producto creado correctamente.');
        } else {
          alert('Error al crear el producto. Revisa la consola para más detalles.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error inesperado al guardar. Revisa la consola para más detalles.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!confirm('¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
      setDeleteId(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/products/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchData();
        alert('✓ Producto eliminado correctamente.');
      } else {
        alert('Error al eliminar el producto.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar.');
    }
  };

  const toggleFeatured = async (p: Product) => {
    try {
      await fetch(`/api/admin/products/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !p.featured }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Agrupar productos por categoría, ordenados por `order`
  const groupedProducts = useMemo(() => {
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);
    return sortedCats.map((cat) => ({
      category: cat,
      products: products
        .filter((p) => p.categoryId === cat.id)
        .sort((a, b) => a.order - b.order),
    }));
  }, [products, categories]);

  // Drag & Drop: reordenar productos dentro de una categoría
  const handleDragStart = (e: React.DragEvent, productId: string) => {
    setDraggedId(productId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, productId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId !== productId) {
      setDragOverId(productId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetProductId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetProductId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Encontrar el producto arrastrado y el destino
    const dragged = products.find((p) => p.id === draggedId);
    const target = products.find((p) => p.id === targetProductId);
    if (!dragged || !target || dragged.categoryId !== target.categoryId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Reordenar localmente
    const catProducts = products
      .filter((p) => p.categoryId === target.categoryId)
      .sort((a, b) => a.order - b.order);
    const draggedIdx = catProducts.findIndex((p) => p.id === draggedId);
    const targetIdx = catProducts.findIndex((p) => p.id === targetProductId);
    const reordered = [...catProducts];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    // Asignar nuevos órdenes (0, 1, 2, ...)
    const updates = reordered.map((p, i) => ({ id: p.id, order: i }));

    // Actualizar estado local inmediatamente
    setProducts((cur) => {
      const updated = cur.map((p) => {
        const u = updates.find((u) => u.id === p.id);
        return u ? { ...p, order: u.order } : p;
      });
      return updated;
    });

    // Persistir en el servidor
    try {
      await Promise.all(
        updates.map((u) =>
          fetch(`/api/admin/products/${u.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: u.order }),
          })
        )
      );
    } catch (err) {
      console.error('Error reordering products:', err);
      fetchData();
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const toggleCatCollapse = (catId: string) => {
    setCollapsedCats((cur) => {
      const next = new Set(cur);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Botón para mostrar/ocultar el panel de gestión de categorías.
  // Al fusionar Categorías y Productos en una sola vista, este panel
  // se renderiza inline (colapsable) sobre el listado de productos.
  const categoriesToggle = (
    <Button
      type="button"
      variant={showCategoriesPanel ? 'default' : 'outline'}
      onClick={() => setShowCategoriesPanel((v) => !v)}
      className={showCategoriesPanel ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
    >
      <FolderOpen className="h-4 w-4 mr-2" />
      {showCategoriesPanel ? 'Ocultar Categorías' : 'Gestionar Categorías'}
      <Badge variant="secondary" className="ml-2">{categories.length}</Badge>
    </Button>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Productos &amp; Categorías</h2>
            <p className="text-sm text-gray-700 mt-1">Cargando…</p>
          </div>
          {categoriesToggle}
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Productos &amp; Categorías</h2>
          <p className="text-sm text-gray-700 mt-1">
            Categorías y productos en una sola vista. Arrastra y suelta para reordenar dentro de cada categoría.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {categoriesToggle}
          <Button onClick={openNew} className="bg-brand hover:bg-amber-600">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Panel de categorías fusionado (colapsable) — mismo lugar que los productos */}
      {showCategoriesPanel && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <FolderOpen className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">Gestión de Categorías</h3>
            <Badge variant="secondary" className="ml-auto">{categories.length} categorías</Badge>
          </div>
          <div className="p-3">
            <CategoriesTab />
          </div>
        </div>
      )}

      {/* Productos agrupados por categoría */}
      <div className="space-y-4">
        {groupedProducts.map(({ category, products: catProducts }) => {
          const isCollapsed = collapsedCats.has(category.id);
          return (
            <Card key={category.id} className="overflow-hidden">
              {/* Header de categoría (clickeable para colapsar) */}
              <div
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b cursor-pointer select-none hover:bg-gray-100 transition-colors"
                onClick={() => toggleCatCollapse(category.id)}
              >
                <span className="text-xl">{category.icon}</span>
                <span className="font-semibold text-gray-900 flex-1">{category.name}</span>
                <Badge variant="secondary">{catProducts.length}</Badge>
                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
              </div>

              {/* Tabla de productos de esta categoría */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-12">Img</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="hidden sm:table-cell">Destacado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-600 py-6 text-sm">
                            Sin productos en esta categoría
                          </TableCell>
                        </TableRow>
                      ) : (
                        catProducts.map((p, idx) => (
                          <TableRow
                            key={p.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, p.id)}
                            onDragOver={(e) => handleDragOver(e, p.id)}
                            onDrop={(e) => handleDrop(e, p.id)}
                            onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                            className={`transition-all ${
                              draggedId === p.id ? 'opacity-40' : ''
                            } ${
                              dragOverId === p.id ? 'border-t-2 border-t-amber-400 bg-amber-50' : ''
                            } cursor-grab active:cursor-grabbing hover:bg-gray-50`}
                          >
                            <TableCell className="text-gray-200 select-none">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-gray-600">{idx + 1}</span>
                                <GripVertical className="h-4 w-4" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <img src={p.image || '/products/placeholder.svg'} alt={p.name} className="w-10 h-10 rounded object-cover" />
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                            <TableCell className="font-semibold">${p.price.toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`text-sm font-medium ${p.stock <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
                                {p.stock}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleFeatured(p); }}>
                                <Star className={`h-4 w-4 ${p.featured ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                              </Button>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteId(p.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Full-screen Product Edit Overlay */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center gap-2 shadow-sm shrink-0">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h1>
              {editingProduct?.name ? (
                <p className="text-xs text-gray-700 truncate hidden md:block">{editingProduct.name}</p>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="hidden sm:inline-flex"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand hover:bg-amber-600"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingProduct ? 'Guardar' : 'Crear'}
            </Button>
          </div>

          {/* Banner de feedback tras guardar (sólo edición, no creación) */}
          {savedFeedback && editingProduct && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-200 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="flex-1">{savedFeedback}</span>
              <button
                type="button"
                onClick={() => setSavedFeedback(null)}
                className="text-green-600 hover:text-green-800 text-xs"
                aria-label="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          )}

          {/* Body */}
          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Vertical tab sidebar (dark) */}
              <aside className="bg-[var(--footer-bg,#111827)] text-gray-100 md:w-60 md:shrink-0 overflow-x-auto md:overflow-y-auto">
                <nav className="flex md:flex-col gap-1 p-2 md:p-3 min-w-max md:min-w-0">
                  {PRODUCT_EDIT_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = editTab === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setEditTab(t.value)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-brand/15 text-[var(--brand-primary,#f59e0b)]'
                            : 'text-gray-200 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              {/* Content */}
              <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="p-4 sm:p-6 lg:p-8">
                  {/* INFO */}
                  {editTab === 'info' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Información general</h2>
                      <p className="text-sm text-gray-700 mb-6">Datos básicos del producto.</p>
                      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                        {/* Columna izquierda: Imagen + clasificación */}
                        <div className="space-y-5">
                          <MainImageEditor
                            value={form.image}
                            onChange={(v) => setForm({ ...form, image: v })}
                          />
                          <div>
                            <Label>Categoría</Label>
                            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                              <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                              <SelectContent>
                                {categories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Tipo de producto</Label>
                            <Select value={form.productType} onValueChange={(v) => setForm({ ...form, productType: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="elaborado">Elaborado</SelectItem>
                                <SelectItem value="mercancia">Mercancía</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Unidad de venta</Label>
                            <Select value={form.saleUnit} onValueChange={(v) => setForm({ ...form, saleUnit: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unidad">unidad</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="lb">lb</SelectItem>
                                <SelectItem value="litro">litro</SelectItem>
                                <SelectItem value="metros">metros</SelectItem>
                                <SelectItem value="caja">caja</SelectItem>
                                <SelectItem value="paquete">paquete</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1.5"><Barcode className="h-3.5 w-3.5" /> Código de barras</Label>
                            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="EAN-13, UPC, etc." />
                          </div>
                        </div>

                        {/* Columna derecha: Datos + Precios */}
                        <div className="space-y-5">
                          <div>
                            <Label>Nombre <span className="text-red-500">*</span></Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Brazo Gitano" required />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Nombre corto (opcional)</Label>
                              <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="Para tarjetas" />
                            </div>
                            <div>
                              <Label>SKU (auto si vacío)</Label>
                              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="PROD-XXXXXX" />
                            </div>
                          </div>
                          <div>
                            <Label>Descripción</Label>
                            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} />
                          </div>

                          {/* Precios y stock */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <Label>Precio de costo (USD)</Label>
                              <Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                              <Label>Precio de venta (USD)</Label>
                              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                              <Label className="flex items-center gap-1.5">
                                Stock
                                {stockFrozen && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                    <Lock className="h-2.5 w-2.5" /> Congelado
                                  </span>
                                )}
                              </Label>
                              <Input
                                type="number"
                                value={stockFrozen ? computedStock : form.stock}
                                disabled={stockFrozen}
                                onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                                className={stockFrozen ? 'bg-gray-100 text-gray-700 cursor-not-allowed' : ''}
                              />
                            </div>
                          </div>

                          {/* Aviso: stock congelado cuando hay variantes/combinaciones */}
                          {stockFrozen && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-xs text-amber-800 leading-snug">
                                <strong>Stock congelado.</strong>{' '}
                                {stockLevel === 'combinations' ? (
                                  <>
                                    Este producto tiene combinaciones, por lo que el stock general
                                    se calcula como la <strong>suma del stock de las combinaciones</strong>
                                    {' '}(actual: <strong>{computedStock}</strong>). Para modificarlo, edita el stock
                                    de cada combinación en la pestaña <strong>Variantes</strong>.
                                  </>
                                ) : (
                                  <>
                                    Este producto tiene opciones de variantes (sin combinaciones), por lo que
                                    el stock general se calcula como la <strong>suma del stock de las opciones</strong>
                                    {' '}(actual: <strong>{computedStock}</strong>). Para modificarlo, edita el stock
                                    de cada opción en la pestaña <strong>Variantes</strong>.
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Margen calculado */}
                          {(() => {
                            const sp = Number(form.price) || 0;
                            const cp = Number(form.costPrice) || 0;
                            const margin = sp > 0 ? Math.round(((sp - cp) / sp) * 10000) / 100 : 0;
                            const barColor = margin < 20 ? 'bg-red-500' : margin <= 40 ? 'bg-brand' : 'bg-green-500';
                            const textColor = margin < 20 ? 'text-red-600' : margin <= 40 ? 'text-amber-600' : 'text-green-600';
                            const label = margin < 20 ? 'Bajo' : margin <= 40 ? 'Medio' : 'Bueno';
                            return (
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between text-sm mb-1.5">
                                  <span className="text-gray-700">Margen estimado</span>
                                  <span className={`font-bold ${textColor}`}>{margin.toFixed(2)}% · {label}</span>
                                </div>
                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${barColor} transition-all`}
                                    style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  )}

                  {/* DISPONIBILIDAD */}
                  {editTab === 'availability' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Disponibilidad</h2>
                      <p className="text-sm text-gray-700 mb-6">Dónde se vende el producto y reglas de anticipo (SIGECOS).</p>
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <Switch id="tiendaAvailable" checked={form.tiendaAvailable} onCheckedChange={(v) => setForm({ ...form, tiendaAvailable: v })} />
                            <div>
                              <Label htmlFor="tiendaAvailable" className="cursor-pointer text-emerald-800">Disponible en tienda online</Label>
                              <p className="text-xs text-emerald-700">Si está apagado, no aparece en el storefront público.</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Switch id="posAvailable" checked={form.posAvailable} onCheckedChange={(v) => setForm({ ...form, posAvailable: v })} />
                            <div>
                              <Label htmlFor="posAvailable" className="cursor-pointer text-blue-800">Disponible en POS</Label>
                              <p className="text-xs text-blue-700">Disponible en tienda física / punto de venta.</p>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <Label className="flex items-center gap-1.5"><ToggleLeft className="h-4 w-4" /> Tipo de anticipo</Label>
                          <Select value={form.advanceType} onValueChange={(v) => setForm({ ...form, advanceType: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sin">Sin anticipo</SelectItem>
                              <SelectItem value="porcentaje">Porcentaje</SelectItem>
                              <SelectItem value="monto_fijo">Monto fijo</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-700 mt-1">
                            {form.advanceType === 'sin'
                              ? 'No se requiere anticipo: el cliente paga todo al recibir el pedido.'
                              : form.advanceType === 'porcentaje'
                                ? 'El cliente paga un porcentaje del total por adelantado.'
                                : 'El cliente paga un monto fijo por adelantado.'}
                          </p>

                          {/* Valor del anticipo (sólo si no es "sin") */}
                          {form.advanceType !== 'sin' && (
                            <div className="mt-3">
                              <Label>{form.advanceType === 'porcentaje' ? 'Valor del anticipo (%)' : 'Valor del anticipo (USD)'}</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={form.advanceValue}
                                onChange={(e) => setForm({ ...form, advanceValue: parseFloat(e.target.value) || 0 })}
                              />
                              {form.advanceType === 'porcentaje' && Number(form.advanceValue) > 100 && (
                                <p className="text-xs text-red-600 mt-1">El porcentaje no debería superar 100%.</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Tiempo de anticipación: sólo cuando NO es "sin" */}
                        {form.advanceType !== 'sin' && (
                          <div>
                            <Label>Tiempo mínimo de anticipación</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min={0}
                                value={form.minHoursUnit === 'dias' ? Math.floor(form.minHours / 24) : form.minHours}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  // Convertir el valor ingresado a horas según la unidad seleccionada
                                  const hours = form.minHoursUnit === 'dias' ? val * 24 : val;
                                  setForm({ ...form, minHours: hours });
                                }}
                                className="flex-1"
                              />
                              <Select
                                value={form.minHoursUnit}
                                onValueChange={(unit) => {
                                  // Al cambiar de unidad, minHours se mantiene en horas (es canónico).
                                  // Sólo cambiamos la unidad para la UX.
                                  setForm({ ...form, minHoursUnit: unit });
                                }}
                              >
                                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="horas">horas</SelectItem>
                                  <SelectItem value="dias">días</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-xs text-gray-700 mt-1">
                              Anticipación mínima con la que el cliente debe hacer el pedido.
                              {' '}Equivalente: <strong>{form.minHours} horas</strong>
                              {form.minHours >= 24 && ` (≈ ${(form.minHours / 24).toFixed(1)} días)`}.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* OFERTA */}
                  {editTab === 'oferta' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Oferta</h2>
                      <p className="text-sm text-gray-700 mb-6">Define un precio rebajado. Las ofertas permanentes no necesitan fechas.</p>
                      <div className="space-y-5">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <Switch id="offerEnabled" checked={form.offerEnabled} onCheckedChange={(v) => setForm({ ...form, offerEnabled: v })} />
                          <div>
                            <Label htmlFor="offerEnabled" className="cursor-pointer">Habilitar oferta</Label>
                            <p className="text-xs text-gray-700">Muestra precio de oferta si es menor al precio regular.</p>
                          </div>
                        </div>
                        <div>
                          <Label>Tipo de oferta</Label>
                          <Select value={form.offerType} onValueChange={(v) => setForm({ ...form, offerType: v, ...(v === 'permanente' ? { offerStart: null, offerEnd: null } : {}) })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="permanente">Permanente (sin fechas)</SelectItem>
                              <SelectItem value="temporada">Temporada (con fechas)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Precio de oferta (USD)</Label>
                          <Input type="number" step="0.01" value={form.offerPrice} onChange={(e) => setForm({ ...form, offerPrice: parseFloat(e.target.value) || 0 })} />
                        </div>
                        {form.offerType === 'temporada' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Inicio</Label>
                              <Input
                                type="date"
                                value={form.offerStart ?? ''}
                                onChange={(e) => setForm({ ...form, offerStart: e.target.value || null })}
                              />
                            </div>
                            <div>
                              <Label>Fin</Label>
                              <Input
                                type="date"
                                value={form.offerEnd ?? ''}
                                min={form.offerStart ?? undefined}
                                onChange={(e) => setForm({ ...form, offerEnd: e.target.value || null })}
                              />
                            </div>
                            {/* Validación: fin < inicio */}
                            {form.offerStart && form.offerEnd && form.offerEnd < form.offerStart && (
                              <div className="sm:col-span-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700">
                                  La <strong>fecha de fin</strong> no puede ser anterior a la <strong>fecha de inicio</strong>.
                                  Ajusta las fechas antes de guardar.
                                </p>
                              </div>
                            )}
                            {/* Validación: falta una de las dos fechas */}
                            {((form.offerStart && !form.offerEnd) || (!form.offerStart && form.offerEnd)) && (
                              <div className="sm:col-span-2 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">
                                  Te falta definir {form.offerStart ? 'la fecha de <strong>fin</strong>' : 'la fecha de <strong>inicio</strong>'}.
                                  Si querés que sea permanente, cambia el tipo a "Permanente".
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        {form.offerType === 'permanente' && form.offerEnabled && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700">
                            ✓ Esta oferta es permanente. Se mostrará siempre sin fecha de vencimiento.
                          </div>
                        )}
                        {/* Aviso de oferta expirada o no iniciada — solo para temporada */}
                        {form.offerType === 'temporada' && form.offerEnabled && form.offerStart && form.offerEnd && (
                          (() => {
                            const now = new Date();
                            const start = new Date(form.offerStart);
                            const end = new Date(form.offerEnd);
                            end.setHours(23, 59, 59, 999); // Fin de día, no medianoche
                            if (now > end) {
                              return (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700 flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                  <div>
                                    <strong>Oferta EXPIRADA.</strong> Venció el {form.offerEnd}. El precio de oferta <strong>NO se está mostrando</strong> en la tienda.
                                    Para reactivarla, cambia la fecha de fin a una futura o conviértela en permanente.
                                  </div>
                                </div>
                              );
                            }
                            if (now < start) {
                              return (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700 flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                  <div>
                                    <strong>Oferta programada.</strong> Comienza el {form.offerStart}. El precio de oferta se mostrará automáticamente a partir de esa fecha.
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700 flex items-start gap-2">
                                <span className="shrink-0 mt-0.5">✓</span>
                                <div>
                                  <strong>Oferta ACTIVA.</strong> Vigente del {form.offerStart} al {form.offerEnd}. El precio de oferta se está mostrando en la tienda.
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </>
                  )}

                  {/* ETIQUETAS */}
                  {editTab === 'tags' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Etiquetas</h2>
                      <p className="text-sm text-gray-700 mb-6">Etiquetas visuales que se muestran como badges en la tarjeta y el detalle del producto.</p>
                      <div className="space-y-5">
                        <div>
                          <Label>Presets rápidos</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {QUICK_TAG_PRESETS.map((t) => {
                              const currentTags: { name: string; color: string }[] = (() => { try { return JSON.parse(form.tags || '[]'); } catch { return []; } })();
                              const exists = currentTags.some((x) => x.name === t.name);
                              return (
                                <button
                                  key={t.name}
                                  type="button"
                                  onClick={() => {
                                    let next: { name: string; color: string }[];
                                    if (exists) {
                                      next = currentTags.filter((x) => x.name !== t.name);
                                    } else {
                                      next = [...currentTags, { name: t.name, color: t.color }];
                                    }
                                    setForm({ ...form, tags: JSON.stringify(next) });
                                  }}
                                  className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
                                  style={{ backgroundColor: t.color, opacity: exists ? 1 : 0.6 }}
                                >
                                  {exists ? '✓ ' : '+ '}{t.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <Separator />
                        <CustomTagEditor
                          value={form.tags}
                          onChange={(tagsJson) => setForm({ ...form, tags: tagsJson })}
                        />
                      </div>
                    </>
                  )}

                  {/* GALERÍA */}
                  {editTab === 'gallery' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Galería</h2>
                      <p className="text-sm text-gray-700 mb-6">Imágenes adicionales del producto. La imagen principal se muestra como fallback.</p>
                      <GalleryEditor
                        value={form.images}
                        onChange={(json) => setForm({ ...form, images: json })}
                      />
                    </>
                  )}

                  {/* VARIANTES */}
                  {editTab === 'variants' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Variantes</h2>
                      <p className="text-sm text-gray-700 mb-6">Grupos de opciones (tamaño, color, etc.) y combinaciones con stock y precio propio.</p>
                      <VariantsEditor
                        form={form}
                        setForm={setForm}
                        optionStockFrozen={optionStockFrozen}
                        computedStock={computedStock}
                        stockLevel={stockLevel}
                      />
                    </>
                  )}

                  {/* EXTRAS */}
                  {editTab === 'extras' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Extras</h2>
                      <p className="text-sm text-gray-700 mb-6">Adicionales opcionales que el cliente puede agregar al producto.</p>
                      <ExtrasEditor
                        form={form}
                        setForm={setForm}
                      />
                    </>
                  )}

                  {/* POR MAYOR */}
                  {editTab === 'wholesale' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Venta al por mayor</h2>
                      <p className="text-sm text-gray-700 mb-6">Habilita precios por volumen usando rangos (ej: 10-20 = $100, 20+ = $90).</p>
                      <div className="space-y-5">
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                          <Switch id="wholesaleEnabled" checked={form.wholesaleEnabled} onCheckedChange={(v) => setForm({ ...form, wholesaleEnabled: v })} />
                          <div>
                            <Label htmlFor="wholesaleEnabled" className="cursor-pointer text-emerald-800">Venta al por mayor habilitada</Label>
                            <p className="text-xs text-emerald-700">Muestra un badge &quot;💰 Por mayor&quot; en la tienda y la tabla de rangos en el detalle.</p>
                          </div>
                        </div>

                        <WholesaleTiersEditor
                          form={form}
                          setForm={setForm}
                          computedStock={computedStock}
                        />

                        <Separator />

                        {/* Campos legacy: precio mayorista único y cantidad mínima.
                            Se deshabilitan cuando hay rangos definidos arriba,
                            porque los rangos tienen prioridad y sobreescriben
                            estos valores en la tienda. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Precio mayorista (legacy)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={form.wholesalePrice}
                              onChange={(e) => setForm({ ...form, wholesalePrice: parseFloat(e.target.value) || 0 })}
                              disabled={form.wholesaleTiers.length > 0}
                              className={form.wholesaleTiers.length > 0 ? 'bg-gray-100 text-gray-600' : ''}
                            />
                            <p className="text-xs text-gray-700 mt-1">
                              {form.wholesaleTiers.length > 0
                                ? 'Deshabilitado porque hay rangos definidos arriba (los rangos tienen prioridad).'
                                : 'Usado sólo si no hay rangos definidos arriba.'}
                            </p>
                          </div>
                          <div>
                            <Label>Cantidad mínima (legacy)</Label>
                            <Input
                              type="number"
                              min={1}
                              value={form.wholesaleMinQty}
                              onChange={(e) => setForm({ ...form, wholesaleMinQty: parseInt(e.target.value) || 1 })}
                              disabled={form.wholesaleTiers.length > 0}
                              className={form.wholesaleTiers.length > 0 ? 'bg-gray-100 text-gray-600' : ''}
                            />
                            <p className="text-xs text-gray-700 mt-1">
                              {form.wholesaleTiers.length > 0 ? 'Deshabilitado porque hay rangos.' : 'Solo aplica si no hay rangos.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* RESERVA */}
                  {editTab === 'reservation' && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Reserva</h2>
                      <p className="text-sm text-gray-700 mb-6">Permite que los clientes reserven el producto con anticipación pagando un depósito.</p>
                      {form.productType === 'mercancia' && (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-5">
                          <p className="text-sm text-red-700 font-medium">
                            ⚠️ Las <strong>mercancías</strong> no pueden tener reserva habilitada.
                            Las mercancías son productos que el negocio ya tiene en inventario y se descuentan del stock al venderse.
                            Cambia el tipo de producto a <strong>"Elaborado"</strong> en la pestaña General para habilitar la reserva.
                          </p>
                        </div>
                      )}
                      <div className="space-y-5">
                        <div className={`flex items-center gap-3 p-4 rounded-lg border ${form.productType === 'mercancia' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-purple-50 border-purple-200'}`}>
                          <Switch
                            id="reservationEnabled"
                            checked={form.reservationEnabled}
                            onCheckedChange={(v) => {
                              if (form.productType === 'mercancia' && v) {
                                alert('⚠️ Las mercancías no pueden tener reserva habilitada.\n\nCambia el tipo de producto a "Elaborado" en la pestaña General.');
                                return;
                              }
                              setForm({ ...form, reservationEnabled: v });
                            }}
                            disabled={form.productType === 'mercancia'}
                          />
                          <div>
                            <Label htmlFor="reservationEnabled" className={`cursor-pointer ${form.productType === 'mercancia' ? 'text-gray-500' : 'text-purple-800'}`}>Reserva habilitada</Label>
                            <p className={`text-xs ${form.productType === 'mercancia' ? 'text-gray-500' : 'text-purple-700'}`}>
                              {form.productType === 'mercancia'
                                ? 'No disponible para mercancías.'
                                : 'Los clientes podrán reservar el producto indicando una fecha de entrega.'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Máximo de reservas simultáneas</Label>
                            <Input type="number" min={0} value={form.maxReservations} onChange={(e) => setForm({ ...form, maxReservations: parseInt(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <Label>Días de anticipación</Label>
                            <Input type="number" min={0} value={form.reservationDays} onChange={(e) => setForm({ ...form, reservationDays: parseInt(e.target.value) || 0 })} />
                          </div>
                        </div>
                        <div>
                          <Label>Depósito (%)</Label>
                          <Input type="number" min={0} max={100} step="0.01" value={form.reservationDeposit} onChange={(e) => setForm({ ...form, reservationDeposit: parseFloat(e.target.value) || 0 })} />
                          <p className="text-xs text-gray-700 mt-1">Porcentaje del precio total que se cobra como depósito (0-100).</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* PROMO — sección eliminada (unificada con Oferta).
                      El bloque condicional se mantiene vacío para que si
                      editTab === 'promo' por estadolegacy, no renderice nada. */}
                  {editTab === 'promo' && null}
                </div>
              </div>
            </div>
          )}

          {/* Mobile bottom action bar */}
          <div className="md:hidden bg-white border-t border-gray-200 px-4 py-3 flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-brand hover:bg-amber-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProduct ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── CATEGORIES TAB ─────────────────────────────────────────────────────────

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', slug: '', icon: '📦', image: '', order: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json().catch(() => []);
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', slug: '', icon: '📦', image: '', order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, icon: c.icon, image: c.image ?? '', order: c.order });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato no válido. Solo JPG, PNG, WebP o GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Archivo demasiado grande. Máximo 5 MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/categories/upload' + (token ? `?token=${encodeURIComponent(token)}` : ''), {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Si hay una categoría siendo editada (desde el botón de subir imagen directo en la tabla),
        // guardar la imagen en esa categoría inmediatamente
        if (editing && !dialogOpen) {
          await fetch(`/api/admin/categories/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: data.url }),
          });
          fetchData();
          setEditing(null);
        } else {
          // Si el diálogo está abierto, actualizar el form
          setForm((f) => ({ ...f, image: data.url }));
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'No se pudo subir la imagen.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al subir la imagen.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/categories/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          setDialogOpen(false);
          fetchData();
          alert('✓ Categoría actualizada correctamente.');
        } else {
          alert('Error al actualizar la categoría.');
        }
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          setDialogOpen(false);
          fetchData();
          alert('✓ Categoría creada correctamente.');
        } else {
          alert('Error al crear la categoría.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!confirm('¿Seguro que quieres eliminar esta categoría? Esta acción no se puede deshacer.')) {
      setDeleteId(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/categories/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchData();
        alert('✓ Categoría eliminada correctamente.');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al eliminar la categoría.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar.');
    }
  };

  const moveCategory = async (c: Category, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((cat) => cat.id === c.id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const other = sorted[swapIdx];
    try {
      await Promise.all([
        fetch(`/api/admin/categories/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: other.order }),
        }),
        fetch(`/api/admin/categories/${other.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: c.order }),
        }),
      ]);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categorías</h2>
          <p className="text-sm text-gray-700 mt-1">
            Sube una imagen para cada categoría. Si no hay imagen, se muestra el emoji como fallback.
          </p>
        </div>
        <Button onClick={openNew} className="bg-brand hover:bg-amber-600">
          <Plus className="h-4 w-4 mr-2" /> Nueva Categoría
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories
                .sort((a, b) => a.order - b.order)
                .map((c) => (
                  <TableRow key={c.id} className={!c.active ? 'opacity-50' : ''}>
                    <TableCell>
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                          {c.icon}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.name}
                      {!c.active && <span className="ml-2 text-xs text-red-500 font-normal">(pausada)</span>}
                    </TableCell>
                    <TableCell className="text-gray-700 font-mono text-sm">{c.slug}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c._count?.products ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Subir imagen */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c);
                            setForm({ name: c.name, slug: c.slug, icon: c.icon, image: c.image ?? '', order: c.order });
                            setTimeout(() => fileInputRef.current?.click(), 100);
                          }}
                          title="Subir imagen"
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500 text-white shadow-sm transition-all hover:bg-green-600 hover:scale-105 active:scale-95"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          title="Editar"
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white shadow-sm transition-all hover:bg-amber-600 hover:scale-105 active:scale-95"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {/* Pausar / Activar */}
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/categories/${c.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ active: !c.active }),
                            });
                            fetchData();
                          }}
                          title={c.active ? 'Pausar (ocultar de la tienda)' : 'Activar (mostrar en la tienda)'}
                          className={`flex h-8 w-8 items-center justify-center rounded-md text-white shadow-sm transition-all hover:scale-105 active:scale-95 ${
                            c.active ? 'bg-gray-500 hover:bg-gray-600' : 'bg-emerald-500 hover:bg-emerald-600'
                          }`}
                        >
                          {c.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        {/* Subir orden */}
                        <button
                          type="button"
                          onClick={() => moveCategory(c, 'up')}
                          title="Subir orden"
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 text-white shadow-sm transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        {/* Bajar orden */}
                        <button
                          type="button"
                          onClick={() => moveCategory(c, 'down')}
                          title="Bajar orden"
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 text-white shadow-sm transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={() => setDeleteId(c.id)}
                          title="Eliminar"
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white shadow-sm transition-all hover:bg-red-600 hover:scale-105 active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Imagen de la categoría */}
            <div className="space-y-2">
              <Label>Imagen de la categoría</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                  {form.image ? (
                    <img src={form.image} alt="Vista previa" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl">{form.icon || '📦'}</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subiendo…</>
                    ) : (
                      <><ImagePlus className="h-4 w-4 mr-2" /> Subir imagen</>
                    )}
                  </Button>
                  {form.image && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, image: '' })}
                      className="text-red-500 hover:text-red-600 ml-2"
                    >
                      <X className="h-4 w-4 mr-1" /> Quitar
                    </Button>
                  )}
                  <p className="text-xs text-gray-700">
                    JPG, PNG, WebP o GIF · máx 5MB · Cuadrada recomendada (1:1)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="O pega una URL / ruta pública (ej: /categories/mi-cat.webp)"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => { const n = e.target.value; setForm({ ...form, name: n, slug: autoSlug(n) }); }} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Icono (emoji, fallback)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                <p className="text-xs text-gray-700 mt-1">
                  Se muestra si no hay imagen.
                </p>
              </div>
              <div>
                <Label>Orden</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-amber-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también todos los productos de esta categoría. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── ORDERS TAB ─────────────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);
  // Detalle ampliado del pedido (reemplaza al ticket como vista por defecto
  // al hacer click en el icono de ojo). Desde ahí se puede imprimir carta / ticket 80mm / PDF.
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  // Orden de la columna "Fecha": 'desc' (más reciente primero) por defecto,
  // o 'asc' (más antiguo primero) si el usuario hace click en la cabecera.
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');
  const [store, setStore] = useState<SiteConfig | null>(null);
  const [lastOrderCount, setLastOrderCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  // ── Filtros y buscador ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paidFilter, setPaidFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // ── Sonido de notificación de nuevo pedido (alarma intensa) ──
  // Secuencia agresiva de 4 sirenas repetidas 3 veces con tonos agudos.
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      // Patrón de alarma intensa: 3 ciclos de sirena ascendente/descendente
      // cada ciclo dura ~1s, total ~3s.
      const cycleStart = 0;
      const cycleDur = 1.0;
      for (let cycle = 0; cycle < 3; cycle++) {
        const baseTime = cycleStart + cycle * cycleDur;
        // Sirena ascendente (600 → 1200 Hz en 0.4s)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(600, ctx.currentTime + baseTime);
        osc1.frequency.linearRampToValueAtTime(1200, ctx.currentTime + baseTime + 0.4);
        gain1.gain.setValueAtTime(0.4, ctx.currentTime + baseTime);
        gain1.gain.linearRampToValueAtTime(0.01, ctx.currentTime + baseTime + 0.45);
        osc1.start(ctx.currentTime + baseTime);
        osc1.stop(ctx.currentTime + baseTime + 0.45);
        // Sirena descendente (1200 → 600 Hz en 0.4s)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(1200, ctx.currentTime + baseTime + 0.45);
        osc2.frequency.linearRampToValueAtTime(600, ctx.currentTime + baseTime + 0.85);
        gain2.gain.setValueAtTime(0.4, ctx.currentTime + baseTime + 0.45);
        gain2.gain.linearRampToValueAtTime(0.01, ctx.currentTime + baseTime + 0.9);
        osc2.start(ctx.currentTime + baseTime + 0.45);
        osc2.stop(ctx.currentTime + baseTime + 0.9);
        // Beep agudo final del ciclo (1500 Hz, 0.1s)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.type = 'square';
        osc3.frequency.value = 1500;
        gain3.gain.setValueAtTime(0.3, ctx.currentTime + baseTime + 0.9);
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + baseTime + 1.0);
        osc3.start(ctx.currentTime + baseTime + 0.9);
        osc3.stop(ctx.currentTime + baseTime + 1.0);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Notificación in-app (toast de sonner, no del navegador) ──
  // Usamos toast de sonner porque la Notification API del navegador
  // requiere permiso explícito y no funciona en iframes / contextos
  // sin foco. El toast aparece siempre dentro de la propia app.
  const showInAppNotification = useCallback((title: string, body: string) => {
    toast.success(title, {
      description: body,
      duration: 10000,
      style: {
        fontSize: '18px',
        padding: '16px',
        fontWeight: 'bold',
      },
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, sRes, pRes] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/siteconfig'),
        fetch('/api/admin/products'),
      ]);
      const newOrdersRaw = await oRes.json().catch(() => []);
      const pData = await pRes.json().catch(() => []);
      // Construir mapa de productos reservables
      const productMap = new Map<string, { reservationEnabled?: boolean; stock?: number }>();
      if (Array.isArray(pData)) {
        pData.forEach((p: { id: string; reservationEnabled?: boolean; stock?: number }) => {
          productMap.set(p.id, { reservationEnabled: p.reservationEnabled, stock: p.stock });
        });
      }
      const newOrders: Order[] = (Array.isArray(newOrdersRaw) ? newOrdersRaw : []).map((o: Order) => ({
        ...o,
        hasReservableItems: (o.items || []).some((item) => {
          const prod = productMap.get(item.productId);
          if (!prod?.reservationEnabled) return false;
          if (Number(prod.stock) < item.quantity) return true;
          if (item.variantInfo && item.variantInfo !== '[]') return true;
          return false;
        }),
      }));
      const sData = await sRes.json();
      // Solo aceptar config válido (no objeto de error)
      if (sData && !sData.error && sData.id) {
        setStore(sData as SiteConfig);
      }
      // Detectar nuevos pedidos (solo si ya teníamos una carga previa)
      if (lastOrderCount > 0 && newOrders.length > lastOrderCount && soundEnabled) {
        playNotificationSound();
        // Mostrar notificación emergente con el pedido más reciente
        const newest = newOrders[0];
        const alertMsg = `¡Nuevo pedido! #${newest.orderNumber} — ${newest.customerName} — $${newest.total.toFixed(2)}`;
        setNewOrderAlert(alertMsg);
        setTimeout(() => setNewOrderAlert(null), 15000);
        // Notificación in-app (toast de sonner)
        showInAppNotification(
          '🛎️ ¡Nuevo pedido!',
          `${newest.customerName} — $${newest.total.toFixed(2)} — ${newest.orderNumber}`
        );
      }
      setOrders(newOrders);
      setLastOrderCount(newOrders.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [lastOrderCount, soundEnabled, playNotificationSound, showInAppNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Polling: revisar nuevos pedidos cada 30 segundos ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetch('/api/admin/orders')
          .then((r) => r.json().catch(() => []))
          .then((rawOrders) => {
            const newOrders: Order[] = Array.isArray(rawOrders) ? rawOrders : [];
            if (lastOrderCount > 0 && newOrders.length > lastOrderCount && soundEnabled) {
              playNotificationSound();
              const newest = newOrders[0];
              const alertMsg = `¡Nuevo pedido! #${newest.orderNumber} — ${newest.customerName} — $${newest.total.toFixed(2)}`;
              setNewOrderAlert(alertMsg);
              setTimeout(() => setNewOrderAlert(null), 15000);
              // Notificación in-app (toast de sonner)
              showInAppNotification(
                '🛎️ ¡Nuevo pedido!',
                `${newest.customerName} — $${newest.total.toFixed(2)} — ${newest.orderNumber}`
              );
            }
            setOrders(newOrders);
            setLastOrderCount(newOrders.length);
          })
          .catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, lastOrderCount, soundEnabled, playNotificationSound, showInAppNotification]);

  // ── Aplicar filtros en cliente ──
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = orders.filter((o) => {
      // Filtro por texto (busca en múltiples campos)
      if (q) {
        const haystack = [
          o.orderNumber,
          o.customerName,
          o.customerEmail,
          o.customerPhone,
          o.recipientName,
          o.recipientPhone,
          o.recipientCity,
          o.recipientAddress,
          o.deliveryZoneName,
          o.zelleRef,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Filtro por estado
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      // Filtro por pago
      if (paidFilter === 'paid' && !o.isPaid) return false;
      if (paidFilter === 'unpaid' && o.isPaid) return false;
      // Filtro por horario
      if (slotFilter !== 'all' && o.deliveryTimeSlot !== slotFilter) return false;
      // Filtro por fecha de entrega (rango)
      if (dateFrom && (!o.deliveryDate || o.deliveryDate < dateFrom)) return false;
      if (dateTo && (!o.deliveryDate || o.deliveryDate > dateTo)) return false;
      return true;
    });
    // Ordenar por createdAt según el estado dateSort (desc = más reciente primero).
    return filtered.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return dateSort === 'desc' ? db - da : da - db;
    });
  }, [orders, search, statusFilter, paidFilter, slotFilter, dateFrom, dateTo, dateSort]);

  const hasActiveFilters = !!(search.trim() || statusFilter !== 'all' || paidFilter !== 'all' || slotFilter !== 'all' || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaidFilter('all');
    setSlotFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // Contadores rápidos por estado (para los chips)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of orders) {
      if (counts[o.status] !== undefined) counts[o.status]++;
    }
    return counts;
  }, [orders]);

  const changeStatus = async (orderId: string, status: string) => {
    try {
      await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status }),
      });
      // Los clientes hacen seguimiento de sus pedidos desde la página
      // "Mis Pedidos" con el timeline en tiempo real. No se envían
      // mensajes de WhatsApp automáticos para no sobrecargar a los dueños.
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePaid = async (orderId: string, isPaid: boolean) => {
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid }),
      });
      // Actualizar localmente para feedback inmediato
      setOrders((cur) => cur.map((o) => o.id === orderId ? { ...o, isPaid } : o));
      setTicketOrder((cur) => cur && cur.id === orderId ? { ...cur, isPaid } : cur);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/orders?id=${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchData();
        alert('✓ Pedido eliminado correctamente.');
      } else {
        alert('Error al eliminar el pedido.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Notificación emergente de nuevo pedido ── */}
      {newOrderAlert && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white rounded-xl shadow-2xl p-4 max-w-sm animate-bounce">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🛒</span>
            <div className="flex-1">
              <p className="font-bold">{newOrderAlert}</p>
              <p className="text-xs text-emerald-100 mt-1">Revisa la tabla de pedidos para ver los detalles.</p>
            </div>
            <button
              type="button"
              onClick={() => setNewOrderAlert(null)}
              className="text-white/80 hover:text-white shrink-0"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Pedidos</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Silenciar notificaciones' : 'Activar notificaciones'}
            className={soundEnabled ? 'text-emerald-600 border-emerald-300' : 'text-gray-600'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
        </div>
      </div>

      {/* ── Barra de filtros y buscador ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Buscador + filtro por fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
              <Input
                placeholder="Buscar por #pedido, cliente, email, teléfono, ciudad, ref Zelle…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div>
              <Label className="text-[11px] text-gray-700 mb-1 block">Entrega desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-[11px] text-gray-700 mb-1 block">Entrega hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className="h-9"
              />
            </div>
          </div>

          {/* Chips de estado */}
          <div>
            <Label className="text-[11px] text-gray-700 mb-1.5 block">Estado</Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all',       label: 'Todos',       color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                { key: 'pending',   label: 'Pendiente',   color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                { key: 'confirmed', label: 'Confirmado',  color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                { key: 'shipped',   label: 'Enviado',     color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                { key: 'delivered', label: 'Entregado',   color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                { key: 'cancelled', label: 'Cancelado',   color: 'bg-red-100 text-red-700 hover:bg-red-200' },
              ].map((s) => {
                const active = statusFilter === s.key;
                const count = statusCounts[s.key] ?? 0;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatusFilter(s.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                      active
                        ? 'bg-brand text-white border-amber-500 shadow-sm'
                        : `${s.color} border-transparent`
                    }`}
                  >
                    {s.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-white/60'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chips de pago + horario + limpiar */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-[11px] text-gray-700 mb-1.5 block">Pago</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all',    label: 'Todos' },
                  { key: 'paid',   label: '✓ Pagados' },
                  { key: 'unpaid', label: 'Pendientes' },
                ].map((p) => {
                  const active = paidFilter === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPaidFilter(p.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                        active
                          ? 'bg-brand text-white border-amber-500 shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-gray-700 mb-1.5 block">Horario</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all',    label: 'Todos' },
                  { key: 'normal', label: 'Normal' },
                  { key: 'asap',   label: '⚡ ASAP' },
                ].map((s) => {
                  const active = slotFilter === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSlotFilter(s.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                        active
                          ? 'bg-brand text-white border-amber-500 shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto">
                <X className="h-3.5 w-3.5 mr-1" /> Limpiar filtros
              </Button>
            )}
          </div>

          {/* Contador de resultados */}
          <div className="text-xs text-gray-700 pt-1 border-t border-gray-100">
            {filteredOrders.length === orders.length ? (
              <span>Mostrando los <strong>{orders.length}</strong> pedidos.</span>
            ) : (
              <span>Mostrando <strong>{filteredOrders.length}</strong> de <strong>{orders.length}</strong> pedidos.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  {/* Cabecera "Fecha" clickeable: alterna entre desc (▼) y asc (▲).
                      Por defecto desc = más reciente primero. */}
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => setDateSort((cur) => cur === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-1 font-medium text-gray-700 hover:text-brand-dark transition-colors"
                      title={dateSort === 'desc' ? 'Más reciente primero. Clic para invertir.' : 'Más antiguo primero. Clic para invertir.'}
                    >
                      Fecha
                      <span className="text-xs">{dateSort === 'desc' ? '▼' : '▲'}</span>
                    </button>
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Recibe</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">Entrega</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-700 py-8">
                      {hasActiveFilters
                        ? 'No hay pedidos que coincidan con los filtros seleccionados.'
                        : 'No hay pedidos todavía.'}
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">#{o.orderNumber}</span>
                        {o.deliveryTimeSlot === 'asap' && (
                          <span title="Entrega urgente (ASAP)" className="inline-flex items-center justify-center w-5 h-5 bg-amber-100 rounded-full text-[10px]">
                            ⚡
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {/* Fecha de creación del pedido en zona horaria Cuba (America/Havana).
                        Usa el helper formatCubaDate para evitar "Invalid Date". */}
                    <TableCell className="text-xs text-gray-700 whitespace-nowrap">
                      <div>{formatCubaDate(o.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">{o.customerName}</div>
                      <div className="text-xs text-gray-700">{o.customerPhone}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">{o.recipientName || '—'}</div>
                      {o.recipientCity && (
                        <div className="text-xs text-gray-700">{o.recipientCity}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">${o.total.toFixed(2)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => togglePaid(o.id, !o.isPaid)}
                        title={o.isPaid ? 'Marcado como pagado. Clic para marcar pendiente.' : 'Pendiente de pago. Clic para marcar pagado.'}
                        className="inline-flex"
                      >
                        <Badge
                          variant="outline"
                          className={o.isPaid
                            ? 'bg-green-100 text-green-700 border-green-200 cursor-pointer'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-200 cursor-pointer'}
                        >
                          {o.isPaid ? '✓ Pagado' : 'Pendiente'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={o.status} onValueChange={(v) => changeStatus(o.id, v)}>
                        <SelectTrigger className="w-[150px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="shipped">Enviado</SelectItem>
                          <SelectItem value="delivered">Entregado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-700">
                      {o.deliveryDate && (
                        <div>{formatDeliveryDate(o.deliveryDate)}</div>
                      )}
                      <div className="text-xs">
                        {o.deliveryTimeSlot === 'asap' ? '⚡ ASAP' : 'Normal'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap px-2 py-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* El ojo abre la nueva vista de detalle ampliada (OrderDetailModal).
                            Desde ahí se puede imprimir carta / ticket 80mm / PDF. */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDetailOrder(o)}
                          title="Ver detalle del pedido"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteId(o.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      {/* Ticket modal — sigue disponible para imprimir ticket 80mm.
          Se abre desde OrderDetailModal cuando el usuario hace click en
          "Imprimir Ticket 80mm". */}
      <OrderTicket
        order={ticketOrder}
        open={!!ticketOrder}
        onOpenChange={(open) => { if (!open) setTicketOrder(null); }}
        onTogglePaid={togglePaid}
        store={store ? {
          storeName: store.storeName,
          phone: store.phone,
          whatsappNumber: store.whatsappNumber,
          address: store.address,
          normalSchedule: store.normalSchedule,
        } : null}
      />

      {/* Detalle ampliado del pedido (casi pantalla completa).
          Sustituye al ticket como vista por defecto al hacer click en el ojo.
          Desde aquí se puede: imprimir carta (letter), imprimir ticket 80mm,
          o exportar a PDF (print-to-PDF del navegador). */}
      <OrderDetailModal
        order={detailOrder}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        onPrintTicket80={() => {
          // Abrir el OrderTicket existente con tamaño 80mm pre-seleccionado.
          // NO cerramos el OrderDetailModal: el admin puede seguir viendo el
          // detalle después de imprimir el ticket.
          setTicketOrder(detailOrder);
        }}
        onTogglePaid={togglePaid}
        store={store ? {
          storeName: store.storeName,
          phone: store.phone,
          whatsappNumber: store.whatsappNumber,
          address: store.address,
          normalSchedule: store.normalSchedule,
        } : null}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pedido será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// OrderDetailModal — Vista de detalle ampliada del pedido (casi pantalla completa)
// ════════════════════════════════════════════════════════════════════════════
//
// Sustituye al OrderTicket como vista por defecto al hacer click en el ojo de
// la tabla de pedidos. Tres acciones al pie:
//   1. "Imprimir Carta"   — imprime en tamaño carta (letter) con CSS de impresión.
//   2. "Imprimir Ticket 80mm" — abre el OrderTicket existente con tamaño 80mm.
//   3. "Exportar PDF"     — dispara window.print() con CSS de impresión para que
//                           el usuario elija "Guardar como PDF" en el diálogo.
//
// Usa formatCubaDate para todas las fechas (zona horaria Cuba, sin "Invalid Date").
// Muestra variantes y extras de cada item con formatVariantInfo / formatExtrasInfo.

interface OrderDetailStore {
  storeName: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  normalSchedule: string;
}

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onPrintTicket80: () => void;
  onTogglePaid?: (orderId: string, isPaid: boolean) => Promise<void> | void;
  store?: OrderDetailStore | null;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function OrderDetailModal({ order, open, onClose, onPrintTicket80, onTogglePaid, store }: OrderDetailModalProps) {
  // Render null si no hay order o no está abierto. Mantenemos el hook de estado
  // de "marcar pagado" arriba para no violar las reglas de hooks.
  const [togglingPaid, setTogglingPaid] = useState(false);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !order) return null;

  const subtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const storeName = store?.storeName || 'Díaz Premium Envíos';
  const storePhone = store?.phone || '';
  const storeAddress = store?.address || '';
  const normalSchedule = store?.normalSchedule || '15:00 - 18:00';
  const slotLabel = order.deliveryTimeSlot === 'asap'
    ? `Entrega Prioritaria${order.asapTimeSlot ? ` (hora prevista: ${order.asapTimeSlot})` : ''}`
    : `Normal (${normalSchedule})`;

  // Imprimir en tamaño carta: setea el atributo data-paper-size en <html>
  // para que el CSS @media print del OrderTicket aplique el layout de carta.
  // Como aquí no tenemos el OrderTicket montado, simplemente usamos window.print()
  // con CSS de impresión propio (todo el modal es imprimible salvo la toolbar).
  const handlePrintLetter = () => {
    document.documentElement.setAttribute('data-paper-size', 'letter');
    document.body.classList.add('printing-order-detail');
    const styleId = 'dynamic-page-size';
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = '@page { size: letter; margin: 10mm; }';
    // Clonar el detalle al body
    const original = document.getElementById('printable-order-detail');
    let clone: HTMLElement | null = null;
    if (original) {
      clone = original.cloneNode(true) as HTMLElement;
      clone.id = 'printable-order-detail-clone';
      clone.style.position = 'static';
      clone.style.width = '100%';
      clone.style.maxWidth = '100%';
      clone.style.margin = '0';
      clone.style.padding = '0';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.borderRadius = '0';
      document.body.appendChild(clone);
      original.style.display = 'none';
      original.id = 'printable-order-detail-hidden';
    }
    document.documentElement.offsetHeight;
    window.print();
    setTimeout(() => {
      document.documentElement.removeAttribute('data-paper-size');
      document.body.classList.remove('printing-order-detail');
      if (style) style.textContent = '';
      if (clone) clone.remove();
      const hidden = document.getElementById('printable-order-detail-hidden');
      if (hidden) {
        hidden.id = 'printable-order-detail';
        hidden.style.display = '';
      }
    }, 1000);
  };

  const handleExportPDF = () => {
    handlePrintLetter();
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
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center print:bg-white print:static print:block"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del pedido #${order.orderNumber}`}
    >
      {/* Panel blanco casi pantalla completa.
          En print, ocupa toda la página sin bordes ni scroll.
          El id="printable-order-detail" permite que el CSS @media print
          muestre sólo este panel cuando el body tiene la clase
          .printing-order-detail (seteada por handlePrintLetter/handleExportPDF). */}
      <div
        id="printable-order-detail"
        className="bg-white w-full h-full sm:w-[95%] sm:h-[95%] sm:rounded-lg overflow-hidden flex flex-col print:w-full print:h-auto print:rounded-none print:overflow-visible print:shadow-none print:block"
      >
        {/* ── Cabecera (no se imprime) ── */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-3 print:hidden z-10">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              Pedido #{order.orderNumber}
            </h2>
            <Badge variant="outline" className={
              order.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
              order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
              order.status === 'shipped' ? 'bg-purple-100 text-purple-700 border-purple-200' :
              order.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              'bg-yellow-100 text-yellow-700 border-yellow-200'
            }>
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </Badge>
            <Badge variant="outline" className={
              order.isPaid
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
            }>
              {order.isPaid ? '✓ Pagado' : 'Pendiente de pago'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onTogglePaid && (
              <Button
                variant="outline"
                size="sm"
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
            <Button variant="ghost" size="icon" onClick={onClose} title="Cerrar (Esc)">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* ── Cuerpo: todos los detalles del pedido ──
            overflow-y-auto aquí (y overflow-hidden en el contenedor padre)
            para que sólo el contenido scrolle, no toda la modal. */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 print:p-0 print:space-y-3 print:overflow-visible">
          {/* Encabezado del comercio (sólo en print) */}
          <div className="hidden print:block text-center pb-2 border-b border-dashed border-gray-400">
            <div className="font-bold text-lg">{storeName}</div>
            {storePhone && <div>Tel: {storePhone}</div>}
            {storeAddress && <div className="text-xs">{storeAddress}</div>}
          </div>

          {/* Resumen rápido: nº pedido, fecha, estado, pago */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-2">
            <div className="bg-gray-50 rounded-lg p-3 print:bg-transparent print:p-1">
              <div className="text-[11px] uppercase tracking-wide text-gray-700">Nº Pedido</div>
              <div className="font-mono font-semibold text-gray-900 break-all">{order.orderNumber}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 print:bg-transparent print:p-1">
              <div className="text-[11px] uppercase tracking-wide text-gray-700">Fecha</div>
              <div className="font-medium text-gray-900">{formatCubaDate(order.createdAt)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 print:bg-transparent print:p-1">
              <div className="text-[11px] uppercase tracking-wide text-gray-700">Estado</div>
              <div className="font-medium text-gray-900">{ORDER_STATUS_LABELS[order.status] || order.status}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 print:bg-transparent print:p-1">
              <div className="text-[11px] uppercase tracking-wide text-gray-700">Pago</div>
              <div className={`font-medium ${order.isPaid ? 'text-green-700' : 'text-yellow-700'}`}>
                {order.isPaid ? '✓ Pagado' : 'Pendiente'}
              </div>
            </div>
          </div>

          {/* Personas: quien envía / quien recibe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Persona que Envía
              </h3>
              <div className="space-y-1 text-sm text-gray-700">
                <div><span className="text-gray-700">Nombre:</span> <span className="font-medium">{order.customerName || '—'}</span></div>
                <div><span className="text-gray-700">Teléfono:</span> {order.customerPhone || '—'}</div>
                <div><span className="text-gray-700">Email:</span> {order.customerEmail || '—'}</div>
                {(order.city || order.state || order.zipCode) && (
                  <div><span className="text-gray-700">Ubicación:</span> {[order.city, order.state, order.zipCode].filter(Boolean).join(', ')}</div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Persona que Recibe
              </h3>
              <div className="space-y-1 text-sm text-gray-700">
                <div><span className="text-gray-700">Nombre:</span> <span className="font-medium">{order.recipientName || '—'}</span></div>
                <div><span className="text-gray-700">Teléfono:</span> {order.recipientPhone || '—'}</div>
                <div><span className="text-gray-700">Dirección:</span> {order.recipientAddress || '—'}</div>
                {order.recipientCity && <div><span className="text-gray-700">Ciudad:</span> {order.recipientCity}</div>}
                {order.recipientNotes && <div><span className="text-gray-700">Notas:</span> <em>{order.recipientNotes}</em></div>}
              </div>
            </div>
          </div>

          {/* Datos de entrega */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Entrega
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-2 text-sm text-gray-700">
              <div>
                <div className="text-[11px] uppercase text-gray-700">Fecha</div>
                <div className="font-medium">
                  {order.deliveryDate
                    ? formatDeliveryDate(order.deliveryDate)
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-gray-700">Horario</div>
                <div className="font-medium">{slotLabel}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-gray-700">Zona</div>
                <div className="font-medium">{order.deliveryZoneName || '—'}</div>
              </div>
              {order.deliverySurcharge > 0 && !order.hasReservableItems && (
                <div>
                  <div className="text-[11px] uppercase text-gray-700">Costo de Entrega Prioritaria</div>
                  <div className="font-medium text-brand-dark">+${order.deliverySurcharge.toFixed(2)}</div>
                </div>
              )}
              {order.zelleRef && (
                <div>
                  <div className="text-[11px] uppercase text-gray-700">Ref Zelle</div>
                  <div className="font-mono text-xs">{order.zelleRef}</div>
                </div>
              )}
            </div>
          </div>

          {/* Items del pedido — muestra variantes y extras si los hay */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Productos ({order.items.length})
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden print:border-gray-400">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 print:bg-transparent">
                  <tr>
                    <th className="text-left p-2 font-semibold text-gray-700">Producto</th>
                    <th className="text-right p-2 font-semibold text-gray-700 w-16">Cant.</th>
                    <th className="text-right p-2 font-semibold text-gray-700 w-24">Precio</th>
                    <th className="text-right p-2 font-semibold text-gray-700 w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const variantText = formatVariantInfo(item.variantInfo);
                    const extrasText = formatExtrasInfo(item.extrasInfo);
                    return (
                      <tr key={item.id} className="border-t border-gray-100 print:border-gray-300 align-top">
                        <td className="p-2">
                          <div className="flex gap-2">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 rounded object-cover bg-gray-50 shrink-0 print:hidden"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">
                                {item.name}
                                {order.hasReservableItems && (item.variantInfo && item.variantInfo !== '[]') && (
                                  <span className="ml-2 inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">📅 RESERVADO</span>
                                )}
                              </div>
                              {variantText && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  <span className="text-gray-700">Variante:</span> {variantText}
                                </div>
                              )}
                              {extrasText && (
                                <div className="text-xs text-gray-600">
                                  <span className="text-gray-700">Extras:</span> {extrasText}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-right text-gray-700">{item.quantity}</td>
                        <td className="p-2 text-right text-gray-700">${item.price.toFixed(2)}</td>
                        <td className="p-2 text-right font-semibold text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Envío{order.deliveryZoneName ? ` · ${order.deliveryZoneName}` : ''}</span>
                <span className="font-medium">${order.shippingCost.toFixed(2)}</span>
              </div>
              {order.deliverySurcharge > 0 && !order.hasReservableItems && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo de Entrega Prioritaria ⚡</span>
                  <span className="font-medium text-brand-dark">+${order.deliverySurcharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-brand-dark">${order.total.toFixed(2)}</span>
              </div>
              {!order.isPaid && (
                <div className="mt-2 text-center font-bold border border-yellow-300 bg-yellow-50 text-yellow-800 rounded p-2">
                  ⚠ PENDIENTE DE PAGO
                </div>
              )}
              {order.isPaid && (
                <div className="mt-2 text-center font-bold border border-green-300 bg-green-50 text-green-700 rounded p-2">
                  ✓ PAGADO
                </div>
              )}
            </div>
          </div>

          {/* Footer del comercio (sólo en print) */}
          <div className="hidden print:block text-center text-xs mt-4 pt-2 border-t border-dashed border-gray-400">
            <div>¡Gracias por su compra!</div>
            {store?.whatsappNumber && <div>WhatsApp: {store.whatsappNumber}</div>}
          </div>
        </div>

        {/* ── Pie con los 3 botones de impresión (no se imprime) ── */}
        <div className="shrink-0 bg-white border-t border-gray-200 px-5 py-3 flex flex-wrap items-center justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="outline" onClick={onPrintTicket80} title="Imprimir en ticket térmico de 80mm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Ticket 80mm
          </Button>
          <Button variant="outline" onClick={handlePrintLetter} title="Imprimir en tamaño carta">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Carta
          </Button>
          <Button onClick={handleExportPDF} className="bg-brand hover:bg-brand-dark text-white" title="Exportar a PDF (diálogo del navegador)">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS TAB ───────────────────────────────────────────────────────────

// ─── Editor del cintillo de titulares (marquee) ───
function TickerEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items = (() => {
    try { return JSON.parse(value || '[]') as string[]; } catch { return []; }
  })();

  const updateItem = (idx: number, newText: string) => {
    const next = [...items];
    next[idx] = newText;
    onChange(JSON.stringify(next));
  };

  const removeItem = (idx: number) => {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)));
  };

  const addItem = () => {
    onChange(JSON.stringify([...items, 'Nuevo titular']));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <span className="text-xs text-gray-600 w-6 shrink-0">{idx + 1}.</span>
          <Input
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            className="flex-1 h-8 text-sm"
          />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveItem(idx, -1)} title="Subir" disabled={idx === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveItem(idx, 1)} title="Bajar" disabled={idx === items.length - 1}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => removeItem(idx)} title="Eliminar">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" onClick={addItem} variant="outline" size="sm">
        <Plus className="h-3.5 w-3.5 mr-1" /> Añadir titular
      </Button>
    </div>
  );
}

// ─── Editor de las cards de Horario y Entregas ───
interface HorarioCard { icon: string; title: string; description: string; color: string; visible?: boolean; }

const HORARIO_CARD_COLORS: Record<string, { label: string; bg: string; iconBg: string; border: string; text: string }> = {
  blue: { label: 'Azul', bg: 'bg-blue-50', iconBg: 'bg-blue-100', border: 'border-blue-100', text: 'text-blue-700' },
  emerald: { label: 'Verde', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', border: 'border-emerald-100', text: 'text-emerald-700' },
  purple: { label: 'Púrpura', bg: 'bg-purple-50', iconBg: 'bg-purple-100', border: 'border-purple-100', text: 'text-purple-700' },
  amber: { label: 'Ámbar', bg: 'bg-amber-50', iconBg: 'bg-amber-100', border: 'border-amber-100', text: 'text-amber-700' },
  rose: { label: 'Rosa', bg: 'bg-rose-50', iconBg: 'bg-rose-100', border: 'border-rose-100', text: 'text-rose-700' },
};

function HorarioCardsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const cards = (() => {
    try { return JSON.parse(value || '[]') as HorarioCard[]; } catch { return []; }
  })();

  const updateCard = (idx: number, patch: Partial<HorarioCard>) => {
    const next = cards.map((c, i) => i === idx ? { ...c, ...patch } : c);
    onChange(JSON.stringify(next));
  };

  const removeCard = (idx: number) => {
    onChange(JSON.stringify(cards.filter((_, i) => i !== idx)));
  };

  const addCard = () => {
    onChange(JSON.stringify([...cards, { icon: '✨', title: 'Nueva tarjeta', description: 'Descripción de la tarjeta.', color: 'amber' }]));
  };

  const moveCard = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= cards.length) return;
    const next = [...cards];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Tarjetas (actualmente: {cards.length})</Label>
      {cards.map((card, idx) => {
        const colorInfo = HORARIO_CARD_COLORS[card.color] || HORARIO_CARD_COLORS.amber;
        return (
          <div key={idx} className={`rounded-xl border-2 ${colorInfo.border} ${colorInfo.bg} p-4 space-y-3 transition-opacity ${card.visible === false ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">Tarjeta {idx + 1}</span>
                <Switch
                  checked={card.visible !== false}
                  onCheckedChange={(v) => updateCard(idx, { visible: v })}
                  aria-label={`Mostrar tarjeta ${idx + 1}`}
                />
                <span className={`text-[10px] font-medium ${card.visible !== false ? 'text-green-600' : 'text-gray-600'}`}>
                  {card.visible !== false ? 'Visible' : 'Oculta'}
                </span>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(idx, -1)} title="Subir" disabled={idx === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(idx, 1)} title="Bajar" disabled={idx === cards.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeCard(idx)} title="Eliminar">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div>
                <Label className="text-xs">Icono</Label>
                <Input value={card.icon} onChange={(e) => updateCard(idx, { icon: e.target.value })} className="h-8 text-center text-lg" maxLength={4} />
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={card.title} onChange={(e) => updateCard(idx, { title: e.target.value })} className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descripción (usa **texto** para negritas)</Label>
              <Textarea value={card.description} onChange={(e) => updateCard(idx, { description: e.target.value })} rows={2} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Color de la tarjeta</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(HORARIO_CARD_COLORS).map(([code, info]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => updateCard(idx, { color: code })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${info.bg} ${info.text} ${
                      card.color === code ? 'border-gray-900 scale-105' : `${info.border} opacity-60 hover:opacity-100`
                    }`}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Preview */}
            <div className={`rounded-lg ${colorInfo.bg} ${colorInfo.border} border p-3 mt-2`}>
              <p className="text-xs text-gray-700 mb-1">Vista previa:</p>
              <div className="flex items-start gap-2">
                <div className={`w-10 h-10 ${colorInfo.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900">{card.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{card.description.replace(/\*\*/g, '')}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" onClick={addCard} variant="outline" size="sm">
        <Plus className="h-3.5 w-3.5 mr-1" /> Añadir tarjeta
      </Button>
    </div>
  );
}

// ─── Editor genérico para arrays JSON administrables ───
function JsonArrayEditor<T extends Record<string, unknown>>({
  value,
  onChange,
  fields,
  itemName,
  newItem,
}: {
  value: string;
  onChange: (v: string) => void;
  fields: { key: string; label: string; type?: 'text' | 'number' | 'textarea' | 'select'; options?: string[] }[];
  itemName: string;
  newItem: T;
}) {
  const items = (() => {
    try { const p = JSON.parse(value || '[]'); return Array.isArray(p) ? p as T[] : []; } catch { return []; }
  })();

  const updateItem = (idx: number, patch: Partial<T>) => {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    onChange(JSON.stringify(next));
  };

  const removeItem = (idx: number) => {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)));
  };

  const addItem = () => {
    onChange(JSON.stringify([...items, { ...newItem }]));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{itemName} {idx + 1}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeItem(idx)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <Label className="text-[11px] text-gray-700">{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea
                    value={String(item[f.key] ?? '')}
                    onChange={(e) => updateItem(idx, { [f.key]: e.target.value } as Partial<T>)}
                    rows={2}
                    className="text-sm"
                  />
                ) : f.type === 'select' ? (
                  <Select value={String(item[f.key] ?? '')} onValueChange={(v) => updateItem(idx, { [f.key]: v } as Partial<T>)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(f.options || []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-8 text-sm"
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={String(item[f.key] ?? '')}
                    onChange={(e) => updateItem(idx, { [f.key]: f.type === 'number' ? (Number(e.target.value) || 0) : e.target.value } as Partial<T>)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button type="button" onClick={addItem} variant="outline" size="sm">
        <Plus className="h-3.5 w-3.5 mr-1" /> Añadir {itemName}
      </Button>
    </div>
  );
}

// ─── Editor con toggle de visibilidad ───
// ─── IconPreview: muestra vista previa del icono en dropdowns ──────────────
const ICON_PREVIEW_MAP: Record<string, React.ReactNode> = {
  package: <Package className="h-4 w-4" />,
  send: <Send className="h-4 w-4" />,
  check: <CheckCircle2 className="h-4 w-4" />,
  creditcard: <CreditCard className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
  shield: <ShieldCheck className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  whatsapp: <Globe className="h-4 w-4" />,
  facebook: <Globe className="h-4 w-4" />,
  instagram: <Globe className="h-4 w-4" />,
  telegram: <Globe className="h-4 w-4" />,
  tiktok: <Globe className="h-4 w-4" />,
  twitter: <Globe className="h-4 w-4" />,
  youtube: <Globe className="h-4 w-4" />,
};

function IconPreview({ name }: { name: string }) {
  return <span className="inline-flex items-center justify-center w-5 h-5">{ICON_PREVIEW_MAP[name] || <Package className="h-4 w-4" />}</span>;
}


// Helper para toggle de secciones: homeSectionsEnabled es JSON object {"sectionId": false}
function isSectionEnabled(config: any, sectionId: string): boolean {
  try {
    const enabled = JSON.parse(config?.homeSectionsEnabled || '{}');
    return enabled[sectionId] !== false;
  } catch { return true; }
}

function toggleSection(config: any, updateField: (k: string, v: string) => void, sectionId: string, enable: boolean) {
  try {
    const enabled = JSON.parse(config?.homeSectionsEnabled || '{}');
    if (enable) {
      delete enabled[sectionId]; // eliminar = visible por defecto
    } else {
      enabled[sectionId] = false;
    }
    updateField('homeSectionsEnabled', JSON.stringify(enabled));
  } catch {
    updateField('homeSectionsEnabled', enable ? '{}' : JSON.stringify({ [sectionId]: false }));
  }
}

// ─── ToggleSwitch: switch bonito para activar/desactivar secciones ─────────
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function VisibleJsonArrayEditor<T extends Record<string, unknown> & { visible: boolean }>({
  value,
  onChange,
  fields,
  itemName,
  newItem,
}: {
  value: string;
  onChange: (v: string) => void;
  fields: { key: string; label: string; type?: 'text' | 'number' | 'textarea' | 'select'; options?: string[] }[];
  itemName: string;
  newItem: T;
}) {
  const items = (() => {
    try { const p = JSON.parse(value || '[]'); return Array.isArray(p) ? p as T[] : []; } catch { return []; }
  })();

  const updateItem = (idx: number, patch: Partial<T>) => {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    onChange(JSON.stringify(next));
  };

  const removeItem = (idx: number) => {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)));
  };

  const addItem = () => {
    onChange(JSON.stringify([...items, { ...newItem }]));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        // Normalizar `visible`: tratar `undefined` como `true` (visible por defecto),
        // igual que el filtro de renderizado (`visible !== false`).
        const isVisible = item.visible !== false;
        return (
        <div key={idx} className={`rounded-xl border p-3 space-y-2 ${isVisible ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-gray-50/50 opacity-75'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{itemName} {idx + 1}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => updateItem(idx, { visible: !isVisible } as Partial<T>)}
                title={isVisible ? 'Ocultar' : 'Mostrar'}
              >
                {isVisible ? '👁️' : '🚫'}
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeItem(idx)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <Label className="text-[11px] text-gray-700">{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea
                    value={String(item[f.key] ?? '')}
                    onChange={(e) => updateItem(idx, { [f.key]: e.target.value } as Partial<T>)}
                    rows={2}
                    className="text-sm w-full"
                  />
                ) : f.type === 'select' ? (
                  <Select value={String(item[f.key] ?? '')} onValueChange={(v) => updateItem(idx, { [f.key]: v } as Partial<T>)}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {f.key === 'icon' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <IconPreview name={opt} />
                              {opt}
                            </span>
                          ) : opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-9 text-sm w-full"
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={String(item[f.key] ?? '')}
                    onChange={(e) => updateItem(idx, { [f.key]: f.type === 'number' ? (Number(e.target.value) || 0) : e.target.value } as Partial<T>)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        );
      })}
      <Button type="button" onClick={addItem} variant="outline" size="sm">
        <Plus className="h-3.5 w-3.5 mr-1" /> Añadir {itemName}
      </Button>
    </div>
  );
}

// ─── BenefitsEditor: editor + vista previa alineados por fila ──────────────
// Cada beneficio tiene su propia fila con el editor a la izquierda y la
// vista previa del beneficio (icono + título + desc + colores) a la derecha.
// Así el admin ve inmediatamente cómo se ve cada beneficio mientras lo edita,
// sin tener que ir a una columna separada de "vista previa" desordenada.

interface BenefitItem {
  icon: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
  visible?: boolean;
}

function BenefitsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const items: BenefitItem[] = (() => {
    try {
      const p = JSON.parse(value || '[]');
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  })();

  const updateItem = (idx: number, patch: Partial<BenefitItem>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(JSON.stringify(next));
  };

  const removeItem = (idx: number) => {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)));
  };

  const addItem = () => {
    onChange(JSON.stringify([
      ...items,
      { icon: 'shield', title: 'Nuevo beneficio', desc: 'Descripción', color: 'text-green-600', bg: 'bg-green-50', visible: true },
    ]));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    onChange(JSON.stringify(next));
  };

  const ICON_OPTIONS = ['shield', 'truck', 'globe', 'heart', 'package', 'send', 'check'];
  const COLOR_OPTIONS = ['text-green-600', 'text-blue-600', 'text-amber-600', 'text-rose-600', 'text-purple-600'];
  const BG_OPTIONS = ['bg-green-50', 'bg-blue-50', 'bg-amber-50', 'bg-rose-50', 'bg-purple-50'];

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const isVisible = item.visible !== false;
        return (
          <div
            key={idx}
            className={`rounded-xl border p-3 transition-opacity ${isVisible ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50 opacity-75'}`}
          >
            {/* Encabezado de la fila: número + controles */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">
                Beneficio {idx + 1}
              </span>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateItem(idx, { visible: !isVisible })}
                  title={isVisible ? 'Ocultar' : 'Mostrar'}
                >
                  {isVisible ? '👁️' : '🚫'}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeItem(idx)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Cuerpo: editor (izq) + vista previa del beneficio (der) */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(180px,220px)] gap-3">
              {/* Editor compacto */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-gray-700">Icono</Label>
                  <Select value={item.icon || 'shield'} onValueChange={(v) => updateItem(idx, { icon: v })}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          <span className="inline-flex items-center gap-1.5">
                            <IconPreview name={opt} />
                            {opt}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-gray-700">Título</Label>
                  <Input
                    className="h-9 text-sm w-full"
                    value={item.title || ''}
                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                    placeholder="Título del beneficio"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px] text-gray-700">Descripción</Label>
                  <Input
                    className="h-9 text-sm w-full"
                    value={item.desc || ''}
                    onChange={(e) => updateItem(idx, { desc: e.target.value })}
                    placeholder="Descripción corta"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-700">Color texto</Label>
                  <Select value={item.color || 'text-green-600'} onValueChange={(v) => updateItem(idx, { color: v })}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt.replace('text-', '').replace('-600', '')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-gray-700">Color fondo</Label>
                  <Select value={item.bg || 'bg-green-50'} onValueChange={(v) => updateItem(idx, { bg: v })}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BG_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt.replace('bg-', '').replace('-50', '')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vista previa del beneficio — alineada con este beneficio */}
              <div className="flex flex-col">
                <Label className="text-[11px] text-gray-500 mb-1">Vista previa</Label>
                <div className={`rounded-lg p-3 ${item.bg || 'bg-gray-50'} flex items-center gap-2 border border-gray-100 h-full`}>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm shrink-0">
                    <span className={item.color || 'text-gray-700'}>
                      <IconPreview name={item.icon || 'shield'} />
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${item.color || 'text-gray-700'} leading-tight`}>
                      {item.title || 'Beneficio'}
                    </p>
                    <p className="text-xs text-gray-600 leading-snug mt-0.5">
                      {item.desc || 'Descripción'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" onClick={addItem} variant="outline" size="sm">
        <Plus className="h-3.5 w-3.5 mr-1" /> Añadir beneficio
      </Button>
    </div>
  );
}

// ─── PROFILE TAB (top-level) ──────────────────────────────────────────────
// Antes estaba dentro de SettingsTab como "Mi Perfil". Se movió a una
// pestaña de nivel superior para que el admin pueda acceder a cambiar su
// contraseña sin tener que entrar a Ajustes.
function ProfileTab() {
  // ── Mi Perfil: cambio de contraseña del admin autenticado ──
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * Decodifica el JWT del admin (sin verificar firma) para obtener el
   * username/email del admin actualmente autenticado. Es solo para mostrar
   * (el server valida el token al procesar el cambio de contraseña).
   */
  const currentAdminEmail = (() => {
    if (typeof window === 'undefined') return '';
    try {
      const token = tokenManager.getAdminToken();
      if (!token) return '';
      const parts = token.split('.');
      if (parts.length !== 3) return '';
      // El payload es la 2ª parte, base64url
      const payload = JSON.parse(
        decodeURIComponent(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );
      // En admin, `username` realmente guarda el email del superadmin
      return payload?.username || '';
    } catch {
      return '';
    }
  })();

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setSavingPassword(true);
    try {
      const token = tokenManager.getAdminToken();
      const res = await fetch('/api/admin/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setPasswordMessage({ type: 'success', text: '✓ Contraseña actualizada correctamente.' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: data?.error || 'No se pudo cambiar la contraseña.' });
      }
    } catch (err) {
      console.error('Error cambiando contraseña admin:', err);
      setPasswordMessage({ type: 'error', text: 'Error de red. Intenta de nuevo.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand" />
            Cuenta del Administrador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email actual (solo lectura) */}
          <div className="space-y-2">
            <Label className="font-semibold">Email actual</Label>
            <Input
              value={currentAdminEmail || '—'}
              readOnly
              disabled
              className="bg-gray-50 text-gray-700"
            />
            <p className="text-xs text-gray-700">
              Este es el email con el que iniciaste sesión. No se puede cambiar.
            </p>
          </div>

          {/* Nueva contraseña */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Confirmar contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Mensaje de feedback (éxito / error) */}
          {passwordMessage && (
            <div
              className={`text-sm rounded-lg px-3 py-2 border ${
                passwordMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          {/* Botón cambiar contraseña */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="bg-brand hover:bg-amber-600"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Cambiar contraseña
            </Button>
            <span className="text-xs text-gray-700">
              Te pediremos iniciar sesión de nuevo con la nueva contraseña en otros dispositivos.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>('tienda');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/siteconfig');
        const data = await res.json();
        // Si la API responde con error (ej. 404), no aceptamos el objeto.
        if (!res.ok || !data || data.error || !data.id) {
          console.error('siteconfig load failed:', data);
          setConfig(null);
        } else {
          setConfig(data as SiteConfig);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Guarda solo los campos indicados en `fields` en vez de toda la config.
   * Esto permite tener un botón "Guardar" por pestaña/sección que solo
   * persista los campos relevantes, evitando sobreescribir cambios no
   * guardados de otras pestañas.
   */
  const handleSaveFields = async (fields: (keyof SiteConfig)[], tabKey: string) => {
    if (!config) return;
    // No bloquear si ya se está guardando — cada sección es independiente.
    setSavedField(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        payload[f] = config[f];
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('diaz-admin-token') : null;
      const res = await fetch('/api/siteconfig', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedField(tabKey);
        setTimeout(() => setSavedField(null), 2000);
      } else {
        console.error('Error guardando', tabKey, await res.json().catch(() => ({})));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateField = (field: keyof SiteConfig, value: string | number) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!config) {
    // No se pudo cargar la configuración desde la API.
    // Mostramos un mensaje claro con botón de reintentar en vez de un
    // spinner infinito o un formulario vacío.
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <p className="text-red-600 font-semibold">No se pudo cargar la configuración del sitio.</p>
        <p className="text-sm text-gray-700">Verifica que el servidor esté corriendo y que el archivo <code>data/siteconfig.json</code> exista.</p>
        <Button onClick={() => window.location.reload()} className="bg-brand hover:bg-amber-600">
          Reintentar
        </Button>
      </div>
    );
  }

  const dayFields: { key: keyof SiteConfig; label: string }[] = [
    { key: 'scheduleLunes', label: 'Lunes' },
    { key: 'scheduleMartes', label: 'Martes' },
    { key: 'scheduleMiercoles', label: 'Miércoles' },
    { key: 'scheduleJueves', label: 'Jueves' },
    { key: 'scheduleViernes', label: 'Viernes' },
    { key: 'scheduleSabado', label: 'Sábado' },
    { key: 'scheduleDomingo', label: 'Domingo' },
  ];

  // Botón "Guardar" reutilizable con feedback visual por sección.
  // Se coloca dentro de cada Card para evitar scroll excesivo.
  const SaveButton = ({ tabKey, fields, className = '' }: { tabKey: string; fields: (keyof SiteConfig)[]; className?: string }) => {
    const [localSaving, setLocalSaving] = useState(false);
    return (
      <div className={`flex items-center gap-2 pt-3 border-t border-gray-100 mt-3 ${className}`}>
        <Button
          onClick={async () => {
            setLocalSaving(true);
            await handleSaveFields(fields, tabKey);
            setLocalSaving(false);
          }}
          disabled={localSaving}
          size="sm"
          className="bg-brand hover:bg-amber-600 min-w-[100px]"
        >
          {localSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Guardar
        </Button>
        {savedField === tabKey && (
          <span className="text-green-600 font-medium text-xs">✓ Guardado</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-900">Ajustes</h2>

      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 mb-4 h-auto">
          <TabsTrigger value="tienda" className="text-xs sm:text-sm">🏪 Tienda</TabsTrigger>
          <TabsTrigger value="envios" className="text-xs sm:text-sm">🚚 Envíos</TabsTrigger>
          <TabsTrigger value="inicio" className="text-xs sm:text-sm">🏠 Inicio</TabsTrigger>
          <TabsTrigger value="secciones" className="text-xs sm:text-sm">📂 Secciones</TabsTrigger>
          <TabsTrigger value="sidebar" className="text-xs sm:text-sm">📋 Barra Lateral</TabsTrigger>
          <TabsTrigger value="footer" className="text-xs sm:text-sm">🦶 Footer</TabsTrigger>
          <TabsTrigger value="apariencia" className="text-xs sm:text-sm">🎨 Diseño</TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 1: TIENDA — imágenes, info, zelle                              */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tienda" className="space-y-6">
          {/* Imágenes del Negocio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-brand" />
                Imágenes del Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div className="space-y-2">
                <Label className="font-semibold">Logo del negocio</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="h-16 w-16 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                    {config.logo ? (
                      <img src={config.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-gray-200" />
                    )}
                  </div>
                  <Input value={config.logo} onChange={(e) => updateField('logo', e.target.value)} placeholder="/logo-real.webp" className="flex-1 min-w-[180px]" />
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-1.5" />
                        Subir imagen
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const path = await uploadImage(file, 400, 0.85);
                          updateField('logo', path);
                        } catch (err) {
                          console.error('Error subiendo logo:', err);
                          alert(err instanceof Error ? err.message : 'Error al subir la imagen');
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-700">Sube una imagen desde tu dispositivo o pega una URL. Máximo 2MB, se optimiza automáticamente.</p>
              </div>
              {/* Imagen principal (hero) */}
              <div className="space-y-2">
                <Label className="font-semibold">Imagen principal (hero)</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="h-16 w-24 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                    {config.cover ? (
                      <img src={config.cover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-gray-200" />
                    )}
                  </div>
                  <Input value={config.cover} onChange={(e) => updateField('cover', e.target.value)} placeholder="/products/cover-real.webp" className="flex-1 min-w-[180px]" />
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-1.5" />
                        Subir imagen
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const path = await uploadImage(file, 1600, 0.8);
                          updateField('cover', path);
                        } catch (err) {
                          console.error('Error subiendo cover:', err);
                          alert(err instanceof Error ? err.message : 'Error al subir la imagen');
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-700">Esta es la imagen grande que se ve en la página principal. Sube desde tu dispositivo o pega una URL.</p>
              </div>

              {/* Textos del Hero (sobre la imagen) */}
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label className="font-semibold">Título del Hero</Label>
                  <Input
                    value={config.heroTitle || ''}
                    onChange={(e) => updateField('heroTitle', e.target.value)}
                    placeholder="Sabor y elegancia para tus momentos especiales"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Texto grande que aparece sobre la imagen. Si lo dejas vacío, se usa el texto por defecto.
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Subtítulo del Hero</Label>
                  <Input
                    value={config.heroSubtitle || ''}
                    onChange={(e) => updateField('heroSubtitle', e.target.value)}
                    placeholder="Pasteles personalizados, cupcakes y postres elaborados con amor."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Texto secundario bajo el título. Si lo dejas vacío, se usa el texto por defecto.
                  </p>
                </div>
              </div>

              <SaveButton tabKey="imagenes" fields={['logo', 'cover', 'heroTitle', 'heroSubtitle']} />
            </CardContent>
          </Card>

          {/* Información de la Tienda */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la Tienda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input value={config.storeName} onChange={(e) => updateField('storeName', e.target.value)} />
                </div>
                <div>
                  <Label>Eslogan</Label>
                  <Input value={config.tagline} onChange={(e) => updateField('tagline', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Dirección</Label>
                <Input value={config.address} onChange={(e) => updateField('address', e.target.value)} />
              </div>
              <p className="text-xs text-gray-700 -mt-2">
                El teléfono y WhatsApp se configuran en la pestaña <strong>Footer</strong> (también aparecen ahí en el pie de página).
              </p>
              <SaveButton tabKey="infoTienda" fields={['storeName', 'tagline', 'address']} />
            </CardContent>
          </Card>

          {/* Pago Zelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Pago Zelle</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.zelleEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {config.zelleEnabled ? 'Activo' : 'Inactivo'}
                  </span>
                  <Switch
                    checked={config.zelleEnabled}
                    onCheckedChange={(v) => updateField('zelleEnabled', v)}
                    aria-label="Activar pago Zelle"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            {config.zelleEnabled && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Email Zelle</Label>
                  <Input value={config.zelleEmail} onChange={(e) => updateField('zelleEmail', e.target.value)} />
                </div>
                <div>
                  <Label>Nombre Zelle</Label>
                  <Input value={config.zelleName} onChange={(e) => updateField('zelleName', e.target.value)} />
                </div>
              </div>
              <SaveButton tabKey="zelle" fields={['zelleEmail', 'zelleName', 'zelleEnabled']} />
            </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 2: ENVÍOS — envío gratis, horario, países, recargo ASAP       */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="envios" className="space-y-6">
          {/* Envío y Entregas */}
          <Card>
            <CardHeader>
              <CardTitle>Envío y Entregas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle envío gratis */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Envío gratis</Label>
                  <p className="text-xs text-gray-700 mt-0.5">
                    Activa el envío gratis para pedidos que superen el monto mínimo.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.freeShippingEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {config.freeShippingEnabled ? 'Activo' : 'Inactivo'}
                  </span>
                  <Switch
                    checked={config.freeShippingEnabled}
                    onCheckedChange={(v) => updateField('freeShippingEnabled', v)}
                    aria-label="Activar envío gratis"
                  />
                </div>
              </div>

              {config.freeShippingEnabled && (
              <div>
                <Label>Envío gratis desde ($)</Label>
                <Input type="number" step="0.01" value={config.freeShippingMin} onChange={(e) => updateField('freeShippingMin', parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-gray-700 mt-1">
                  Pedidos con subtotal igual o superior a este monto tendrán envío gratis. El costo de envío por zona se gestiona desde la pestaña <strong>Delivery</strong>.
                </p>
              </div>
              )}

              <div>
                <Label>Monto mínimo de pedido ($)</Label>
                <Input type="number" step="0.01" value={config.minOrderAmount || 0} onChange={(e) => updateField('minOrderAmount', parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-gray-700 mt-1">
                  Los clientes no podrán completar pedidos con un subtotal inferior a este monto. Por defecto: $10.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Horario normal de entrega</Label>
                <Input
                  value={config.normalSchedule}
                  onChange={(e) => updateField('normalSchedule', e.target.value)}
                  placeholder="15:00 - 18:00"
                />
                <p className="text-xs text-gray-700">
                  Texto que se muestra al cliente como horario normal de entrega.
                </p>
              </div>

              <Separator />

              {/* Toggle registro de clientes */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Registro de clientes</Label>
                  <p className="text-xs text-gray-700 mt-0.5">
                    Permite que nuevos clientes creen cuentas en la tienda.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.customerRegistrationEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {config.customerRegistrationEnabled ? 'Activo' : 'Inactivo'}
                  </span>
                  <Switch
                    checked={config.customerRegistrationEnabled}
                    onCheckedChange={(v) => updateField('customerRegistrationEnabled', v)}
                    aria-label="Activar registro de clientes"
                  />
                </div>
              </div>

              {/* Toggle login de clientes */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Inicio de sesión de clientes</Label>
                  <p className="text-xs text-gray-700 mt-0.5">
                    Permite que clientes existentes inicien sesión.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.customerLoginEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {config.customerLoginEnabled ? 'Activo' : 'Inactivo'}
                  </span>
                  <Switch
                    checked={config.customerLoginEnabled}
                    onCheckedChange={(v) => updateField('customerLoginEnabled', v)}
                    aria-label="Activar inicio de sesión de clientes"
                  />
                </div>
              </div>

              <Separator />

              {/* SaveButton propio del card "Envío y Entregas" — guarda los
                  campos de envío general (no los de horario por día). */}
              <SaveButton tabKey="enviosGeneral" fields={[
                'freeShippingEnabled', 'freeShippingMin', 'shippingCost', 'minOrderAmount', 'normalSchedule',
                'customerRegistrationEnabled', 'customerLoginEnabled',
              ]} />
            </CardContent>
          </Card>

          {/* Horario por día */}
          <Card>
            <CardHeader>
              <CardTitle>Horario por Días</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-700 -mt-1">
                Define el horario de atención de cada día. Selecciona "Cerrado" si no atiendes,
                o elige las horas de inicio y fin con los selectores. Puedes añadir hasta 3 turnos
                por día (ej: mañana y tarde) con el botón "+ Añadir turno".
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {dayFields.map(({ key, label }) => {
                const currentValue = config[key] as string;
                const isClosed = !currentValue || currentValue.toLowerCase() === 'cerrado';
                return (
                  <ScheduleDayEditor
                    key={key}
                    label={label}
                    value={currentValue}
                    isClosed={isClosed}
                    onChange={(v) => updateField(key, v)}
                  />
                );
              })}
              </div>
              <SaveButton tabKey="enviosHorario" fields={[
                'scheduleLunes', 'scheduleMartes', 'scheduleMiercoles', 'scheduleJueves',
                'scheduleViernes', 'scheduleSabado', 'scheduleDomingo',
              ]} />
            </CardContent>
          </Card>

          {/* SaveButton PROMINENTE al final de toda la pestaña "Envíos" —
              guarda TODOS los campos relacionados en una sola operación. */}
          <Card className="border-2 border-amber-300 bg-amber-50/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Save className="h-5 w-5 text-amber-600" />
                    Guardar toda la configuración de Envíos
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Guarda en una sola operación: envío gratis, monto mínimo, horario normal,
                    registro/login de clientes y horario por días.
                  </p>
                </div>
                <SaveButton
                  tabKey="enviosAll"
                  className="sm:flex-shrink-0"
                  fields={[
                    'freeShippingEnabled', 'freeShippingMin', 'shippingCost', 'minOrderAmount', 'normalSchedule',
                    'customerRegistrationEnabled', 'customerLoginEnabled',
                    'scheduleLunes', 'scheduleMartes', 'scheduleMiercoles', 'scheduleJueves',
                    'scheduleViernes', 'scheduleSabado', 'scheduleDomingo',
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 3: INICIO — cintillo, sección horario, beneficios, stats     */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="inicio" className="space-y-6">
          {/* Orden de las secciones del home (drag & drop) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-brand" />
                Orden de las Secciones del Home
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-700 -mt-2">
                Arrastra las secciones para reordenar cómo aparecen en la página de inicio.
                El cambio se refleja inmediatamente en la vista previa de la derecha y en
                la tienda al guardar. También puedes usar los botones ↑/↓.
              </p>
              <SectionOrderEditor
                value={config.homeSectionsOrder || ''}
                enabledValue={config.homeSectionsEnabled || ''}
                onChange={(v) => updateField('homeSectionsOrder', v)}
                onEnabledChange={(v) => updateField('homeSectionsEnabled', v)}
              />
            </CardContent>
          </Card>

          {/* Fechas especiales (countdown del home) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand" />
                Próxima Fecha Especial (Countdown)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-700 -mt-2">
                Fechas que rota el countdown del home. Solo se muestra la próxima
                dentro de 60 días. Se cargan las fechas actuales por defecto para
                que puedas editarlas o eliminarlas. Puedes elegir fecha del año en
                curso o el siguiente, subir una imagen de fondo por tarjeta y
                elegir su color. Guarda los cambios al final.
              </p>
              <SpecialDatesEditor
                value={config.specialDates || ''}
                onChange={(v) => updateField('specialDates', v)}
              />
              <SaveButton tabKey="specialDates" fields={['specialDates']} />
            </CardContent>
          </Card>

          {/* Modo de visualización del catálogo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-brand" />
                Modo de Visualización del Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-700 -mt-1">
                Elige cómo se muestran los productos en la página de inicio.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('catalogLayout', 'categories')}
                  className={`px-3 py-3 text-xs font-medium rounded-lg border-2 transition-all text-left ${
                    (config.catalogLayout || 'categories') === 'categories' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <span className="text-base block mb-0.5">🛒</span>
                  <strong>Carruseles por categoría</strong>
                  <p className="text-[10px] text-gray-700 mt-0.5">Cada categoría en su propio carrusel horizontal.</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('catalogLayout', 'stacked')}
                  className={`px-3 py-3 text-xs font-medium rounded-lg border-2 transition-all text-left ${
                    config.catalogLayout === 'stacked' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <span className="text-base block mb-0.5">📦</span>
                  <strong>Grid apilado</strong>
                  <p className="text-[10px] text-gray-700 mt-0.5">Productos en grid, ideal para pocos productos por categoría.</p>
                </button>
              </div>
              <SaveButton tabKey="catalogLayout" fields={['catalogLayout']} />
            </CardContent>
          </Card>

          {/* Carrusel de Ofertas Destacadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-brand" />
                Carrusel de Ofertas Destacadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-700 -mt-2 mb-4">
                Carrusel especial que aparece al inicio del catálogo, antes de las
                categorías. Personaliza el título, subtítulo, colores y selecciona
                productos específicos o deja que se auto-detecten las ofertas activas.
              </p>
              <OffersCarouselEditor
                value={config.offersCarousel || ''}
                onChange={(v) => updateField('offersCarousel', v)}
              />
              <SaveButton tabKey="ofertasCarousel" fields={['offersCarousel']} />
            </CardContent>
          </Card>

          {/* Sección Horario y Entregas (hero) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand" />
                Sección "Horario y Entregas" (Inicio)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-700">
                Configura el título, la descripción y las 3 tarjetas que ven los clientes en la página de inicio debajo de la imagen principal.
              </p>
              <div>
                <Label>Título de la sección</Label>
                <Input
                  value={config.horarioSectionTitle}
                  onChange={(e) => updateField('horarioSectionTitle', e.target.value)}
                  placeholder="Pide cuando quieras, recíbelo en casa"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input
                  value={config.horarioSectionDesc}
                  onChange={(e) => updateField('horarioSectionDesc', e.target.value)}
                  placeholder="Tres cosas que debes saber sobre cómo trabajamos..."
                />
              </div>
              <Separator />
              <HorarioCardsEditor
                value={config.horarioCards}
                onChange={(v) => updateField('horarioCards', v)}
              />
              <SaveButton tabKey="inicioHorario" fields={['horarioSectionTitle', 'horarioSectionDesc', 'horarioCards']} />
            </CardContent>
          </Card>

          {/* Contenido de la Página de Inicio */}
          <div className="space-y-4">
            {/* Beneficios — ancho completo */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-brand" />
                    Beneficios
                  </CardTitle>
                  <span className="text-[10px] text-gray-500 italic">
                    Activa/desactiva en &quot;Orden de las Secciones del Home&quot;
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 pt-2 sm:pt-2">
                <p className="text-xs text-gray-700 -mt-1 mb-3">
                  Cada beneficio se edita con su vista previa alineada a la derecha.
                  Cambia icono, título, descripción y colores para ver al instante cómo se verá en la tienda.
                </p>
                <BenefitsEditor
                  value={config.homeBenefits}
                  onChange={(v) => updateField('homeBenefits', v)}
                />
                <SaveButton tabKey="benefits" fields={['homeBenefits', 'homeSectionsEnabled']} />
              </CardContent>
            </Card>

            {/* Estadísticas + Testimonios — el toggle de cada sección está en
                "Orden de las Secciones del Home" (Estadísticas = socialStats,
                Testimonios/Reseñas = storeReviews). Aquí solo se edita el
                CONTENIDO de cada uno, no su visibilidad. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Estadísticas (números) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-brand" />
                      Estadísticas (números)
                    </CardTitle>
                    <span className="text-[10px] text-gray-500 italic">
                      Activa/desactiva en &quot;Orden de las Secciones del Home&quot;
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] text-gray-600 mb-2">
                    Edita los números que se muestran en el home (pedidos, clientes, etc.).
                  </p>
                  <VisibleJsonArrayEditor
                    value={config.socialStats}
                    onChange={(v) => updateField('socialStats', v)}
                    itemName="Estadística"
                    newItem={{ value: '0', label: 'Nueva estadística', visible: true }}
                    fields={[
                      { key: 'value', label: 'Valor' },
                      { key: 'label', label: 'Etiqueta' },
                    ]}
                  />
                  <SaveButton tabKey="socialStats" fields={['socialStats']} />
                </CardContent>
              </Card>

              {/* Testimonios (reseñas manuales) — se muestran dentro de la
                  sección "Reseñas y Testimonios" del home (storeReviews),
                  junto con las reseñas reales que escriben los clientes. */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-brand" />
                      Testimonios (reseñas)
                    </CardTitle>
                    <span className="text-[10px] text-gray-500 italic">
                      Visible en &quot;Reseñas y Testimonios&quot; del Home
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] text-gray-600 mb-2">
                    Testimonios manuales que se muestran junto a las reseñas reales de clientes
                    en la sección &quot;Reseñas y Testimonios&quot;. Para ocultar toda la sección,
                    desactiva &quot;Reseñas y Testimonios&quot; en el ordenador del Home.
                  </p>
                  <VisibleJsonArrayEditor
                    value={config.testimonials}
                    onChange={(v) => updateField('testimonials', v)}
                    itemName="Testimonio"
                    newItem={{ name: 'Cliente', location: 'Ciudad', text: 'Texto del testimonio', rating: 5, visible: true }}
                    fields={[
                      { key: 'name', label: 'Nombre' },
                      { key: 'location', label: 'Ubicación' },
                      { key: 'text', label: 'Testimonio', type: 'textarea' },
                      { key: 'rating', label: 'Estrellas (1-5)', type: 'number' },
                    ]}
                  />
                  <SaveButton tabKey="testimonials" fields={['testimonials']} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SaveButton de la pestaña Inicio — solo layout del home */}
          <SaveButton
            tabKey="inicio"
            fields={['homeSectionsOrder', 'homeSectionsEnabled', 'catalogLayout', 'offersCarousel', 'horarioSectionTitle', 'horarioSectionDesc', 'horarioCards', 'homeBenefits', 'socialStats', 'testimonials']}
            className="mt-4"
          />
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 3b: SECCIONES — Hero slides, servicios, promociones, galería  */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="secciones" className="space-y-6">
          {/* Hero Slides (Banner Rotativo) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-brand" />
                🖼️ Hero Slides (Banner Rotativo)
              </CardTitle>
              <p className="text-sm text-gray-500">Edita los 5 slides del banner principal. Cada slide corresponde a una sección y rota cada 5 segundos.</p>
            </CardHeader>
            <CardContent>
              <HeroSlidesEditor
                value={config.heroSlides || ''}
                onChange={(v) => updateField('heroSlides', v)}
              />
              <SaveButton tabKey="heroSlides" fields={['heroSlides']} className="mt-3" />
            </CardContent>
          </Card>

          {/* Servicios para Eventos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand" />
                🎨 Servicios para Eventos
              </CardTitle>
              <p className="text-sm text-gray-500">Gestiona los servicios que ofreces para eventos (decoración, entretenimiento, sueños sorpresa, etc.). Se crean/editan desde la pestaña Productos → Servicios.</p>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl p-4" style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
                <p className="text-sm" style={{ color: '#2E1065' }}>
                  Los servicios se gestionan desde <strong>Productos → Servicios</strong> en el menú lateral. Allí puedes:
                </p>
                <ul className="text-xs mt-2 space-y-1" style={{ color: '#4B5563' }}>
                  <li>• Crear nuevos servicios con nombre, descripción, precio CUP/USD e imagen</li>
                  <li>• Activar/desactivar servicios</li>
                  <li>• Reordenar servicios</li>
                  <li>• Categorizar (decoración, entretenimiento, personalizado, sueños sorpresa)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Promociones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-brand" />
                💝 Promociones por Fechas
              </CardTitle>
              <p className="text-sm text-gray-500">Crea, edita o elimina promociones especiales. Cada promoción tiene título, descripción, descuento y fechas.</p>
            </CardHeader>
            <CardContent>
              <PromotionManager />
            </CardContent>
          </Card>

          {/* Galería de Eventos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-brand" />
                🖼️ Galería de Eventos
              </CardTitle>
              <p className="text-sm text-gray-500">Añade, edita o elimina fotos de eventos pasados. Cada item tiene título, imagen, tipo de evento y descripción.</p>
            </CardHeader>
            <CardContent>
              <GalleryManager />
            </CardContent>
          </Card>

          <SaveButton tabKey="secciones" fields={['heroSlides']} className="mt-4" />
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 3c: BARRA LATERAL — nav sections + hamburger items            */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sidebar" className="space-y-6">
          {/* Secciones de Navegación (Barra Principal) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-brand" />
                🧭 Secciones de Navegación (Barra Principal)
              </CardTitle>
              <p className="text-sm text-gray-500">Secciones que aparecen en la barra de navegación del header (desktop). Cada sección tiene id, label, icono y visibilidad.</p>
            </CardHeader>
            <CardContent>
              <NavSectionsEditor
                value={config.navSections || ''}
                onChange={(v) => updateField('navSections', v)}
              />
              <SaveButton tabKey="navSections" fields={['navSections']} className="mt-3" />
            </CardContent>
          </Card>

          {/* Items del Menú Hamburguesa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="h-5 w-5 text-brand" />
                🍔 Items del Menú Hamburguesa
              </CardTitle>
              <p className="text-sm text-gray-500">Items de utilidad que aparecen en el menú lateral deslizable (horarios, zonas, cuenta, etc.). Visible en desktop y móvil.</p>
            </CardHeader>
            <CardContent>
              <HamburgerItemsEditor
                value={config.hamburgerItems || ''}
                onChange={(v) => updateField('hamburgerItems', v)}
              />
              <SaveButton tabKey="hamburgerItems" fields={['hamburgerItems']} className="mt-3" />
            </CardContent>
          </Card>

          <SaveButton tabKey="sidebar" fields={['navSections', 'hamburgerItems']} className="mt-4" />
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 4: FOOTER — teléfono, whatsapp, redes sociales                */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="footer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-brand" />
                Contacto del Footer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-700 -mt-2">
                Estos son los datos de contacto que se muestran en el pie de página del sitio.
                El teléfono aparece como enlace <code>tel:</code> y el WhatsApp como enlace directo
                a <code>wa.me</code>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={config.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+5363169968"
                  />
                  <p className="text-xs text-gray-700 mt-1">Número visible en el footer para llamadas.</p>
                </div>
                <div>
                  <Label>WhatsApp (para pedidos)</Label>
                  <Input
                    value={config.whatsappNumber}
                    onChange={(e) => updateField('whatsappNumber', e.target.value)}
                    placeholder="+5350782825"
                  />
                  <p className="text-xs text-gray-700 mt-1">Se usa para el enlace del footer y para enviar los pedidos.</p>
                </div>
              </div>
              <SaveButton tabKey="footerContacto" fields={['phone', 'whatsappNumber']} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-brand" />
                Redes Sociales del Footer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-xs text-gray-700 -mt-2">
                Añade, edita o elimina las redes sociales que aparecen en el footer.
                Cada ícono se muestra con su color de marca original (WhatsApp verde, Facebook azul, etc.).
                Usa el interruptor "visible" para ocultar una red sin borrarla.
              </p>
              <div>
                <Label className="font-semibold mb-2 block">Redes sociales</Label>
                <VisibleJsonArrayEditor
                  value={config.socialLinks}
                  onChange={(v) => updateField('socialLinks', v)}
                  itemName="Red social"
                  newItem={{ platform: 'Nueva red', url: '#', icon: 'globe', visible: true }}
                  fields={[
                    { key: 'platform', label: 'Plataforma' },
                    { key: 'url', label: 'URL' },
                    { key: 'icon', label: 'Icono', type: 'select', options: ['whatsapp', 'facebook', 'instagram', 'telegram', 'tiktok', 'twitter', 'youtube', 'globe'] },
                  ]}
                />
              </div>
              <SaveButton tabKey="footer" fields={['phone', 'whatsappNumber', 'socialLinks']} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 5: APARIENCIA — Design System completo                      */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="apariencia" className="space-y-6">
          {/* ThemeEditor: plantilla + color + modo diseñador (solo Personalizado) */}
          <ThemeEditor
            config={config}
            onConfigChange={(next) => setConfig(next)}
            onSave={async (themeId, themeData, legacyFields) => {
              if (!config) return;
              setSaving(true);
              setSavedField(null);
              try {
                const payload: Record<string, unknown> = {
                  themeId,
                  themeData,
                  ...legacyFields,
                };
                const res = await fetch('/api/siteconfig', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                if (res.ok) {
                  setSavedField('apariencia');
                  setTimeout(() => setSavedField(null), 2500);
                  const fresh = await fetch('/api/siteconfig').then((r) => r.json());
                  if (fresh && !fresh.error) setConfig(fresh as SiteConfig);
                }
              } catch (err) {
                console.error(err);
              } finally {
                setSaving(false);
              }
            }}
            saving={saving}
            saved={savedField === 'apariencia'}
          />

          {/* Vista previa REAL con iframe de la tienda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-brand" />
                Vista previa real de la tienda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
                <iframe
                  src="/"
                  className="w-full"
                  style={{
                    height: '600px',
                    border: 'none',
                    // Aplicar colores del config directamente al iframe via CSS filter
                    // para feedback visual inmediato antes de guardar
                  }}
                  title="Vista previa de la tienda"
                  key={savedField === 'apariencia' ? 'saved-' + Date.now() : 'preview'}
                />
              </div>
              <p className="text-xs text-gray-700 mt-2 text-center">
                Esta es la vista real de tu tienda. Cambia los colores arriba y pulsa <strong>Guardar Diseño</strong> para verlos reflejados aquí.
              </p>
            </CardContent>
          </Card>

          {/* Botón Guardar al final */}
          <div className="flex justify-end">
            <Button
              className="bg-brand hover:bg-amber-600 text-white px-8"
              onClick={async () => {
                if (!config) return;
                setSaving(true);
                setSavedField(null);
                try {
                  const res = await fetch('/api/siteconfig', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      themeId: config.themeId,
                      themeData: config.themeData,
                      primaryColor: config.primaryColor,
                      primaryColorDark: config.primaryColorDark,
                      primaryColorLight: config.primaryColorLight,
                      footerBgColor: config.footerBgColor,
                      footerTextColor: config.footerTextColor,
                      footerAccentColor: config.footerAccentColor,
                      catalogLayout: config.catalogLayout,
                      homeSectionsOrder: config.homeSectionsOrder,
                      homeSectionsEnabled: config.homeSectionsEnabled,
                    }),
                  });
                  if (res.ok) {
                    setSavedField('apariencia');
                    setTimeout(() => setSavedField(null), 2500);
                    toast.success('Diseño guardado correctamente.');
                  }
                } catch (err) {
                  console.error(err);
                  toast.error('Error al guardar el diseño.');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {savedField === 'apariencia' ? '✓ Guardado' : 'Guardar Diseño'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── TEMPLATES TAB (pestaña Plantillas — Task 7) ──────────────────────────

interface TemplatesTabProps {
  config: SiteConfig | null;
  templates: StorePreset[];
  onApply: (template: StorePreset) => Promise<void>;
  saving: boolean;
  saved: boolean;
}

function TemplatesTab({ config, templates, onApply, saving, saved }: TemplatesTabProps) {
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleApply = async (template: StorePreset) => {
    setApplyingId(template.id);
    try {
      await onApply(template);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-brand" />
            Plantillas de Tienda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 -mt-2">
            Aplica una plantilla preconfigurada para arrancar rápidamente. La plantilla
            establece la paleta de colores, las secciones del home activas y el orden del
            catálogo. Después de aplicar, puedes personalizar libremente colores, logo,
            tipografía y más desde las demás pestañas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const isApplying = applyingId === tpl.id && saving;
              const enabledCount = (() => {
                try {
                  const obj = JSON.parse(tpl.config.homeSectionsEnabled);
                  return Object.values(obj).filter(Boolean).length;
                } catch { return 0; }
              })();
              return (
                <div
                  key={tpl.id}
                  className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Preview del header con los colores de la plantilla */}
                  <div
                    className="h-24 flex items-center px-4 relative"
                    style={{
                      background: `linear-gradient(135deg, ${tpl.config.primaryColor} 0%, ${tpl.config.primaryColorDark} 100%)`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    >
                      🏪
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="h-2.5 w-20 bg-white/80 rounded-full mb-1.5" />
                      <div className="h-2 w-28 bg-white/50 rounded-full" />
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: tpl.config.primaryColorDark }}
                    >
                      Ver plantilla
                    </div>
                  </div>

                  {/* Cuerpo de la tarjeta */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 text-base">{tpl.name}</h3>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-3 flex-1">{tpl.description}</p>

                    {/* Chips con info rápida */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tpl.config.primaryColor }} />
                        {tpl.config.primaryColor}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {enabledCount} secciones
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {tpl.config.catalogLayout === 'stacked' ? 'Grid apilado' : 'Carruseles'}
                      </span>
                    </div>

                    {/* Mini representación de las secciones del home */}
                    <div className="mt-3 space-y-1">
                      <div className="h-2 bg-gray-100 rounded-full" style={{ width: '90%' }} />
                      <div className="flex gap-1">
                        <div className="h-2 bg-gray-200 rounded-full flex-1" />
                        <div className="h-2 bg-gray-200 rounded-full flex-1" />
                        <div className="h-2 bg-gray-200 rounded-full flex-1" />
                        <div className="h-2 bg-gray-200 rounded-full flex-1" />
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded"
                            style={{ backgroundColor: tpl.config.primaryColorLight }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <div className="h-2 bg-gray-200 rounded-full flex-1" />
                        <div
                          className="h-2 rounded-full flex-1"
                          style={{ backgroundColor: tpl.config.primaryColor, opacity: 0.5 }}
                        />
                      </div>
                    </div>

                    {/* Botón aplicar */}
                    <Button
                      type="button"
                      onClick={() => handleApply(tpl)}
                      disabled={isApplying}
                      className="w-full mt-4 text-white"
                      style={{
                        backgroundColor: tpl.config.primaryColor,
                        // Hover más oscuro — Tailwind no puede con estilos inline,
                        // así que forzamos el color base y dejamos el hover al CSS.
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = tpl.config.primaryColorDark; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = tpl.config.primaryColor; }}
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Aplicando…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Aplicar Plantilla
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {saved && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Plantilla aplicada correctamente. Revisa el home para ver los cambios.
            </div>
          )}

          {/* Estado actual */}
          {config && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
              <p className="font-semibold text-gray-800 mb-2">Estado actual de tu tienda:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-gray-700">Color principal</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: config.primaryColor }}
                    />
                    <span className="font-mono">{config.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-700">Color oscuro</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: config.primaryColorDark }}
                    />
                    <span className="font-mono">{config.primaryColorDark}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-700">Catálogo</p>
                  <p className="font-medium text-gray-800 mt-1">
                    {config.catalogLayout === 'stacked' ? 'Grid apilado' : 'Carruseles por categoría'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-700">Theme ID</p>
                  <p className="font-mono text-gray-800 mt-1 truncate">{config.themeId}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── DESIGN SYSTEM EDITOR (pestaña Apariencia) ─────────────────────────────

/** Colores rápidos para el Modo Básico. */
const QUICK_COLORS = ['#0E3446', '#f59e0b', '#2563eb', '#10b981', '#dc2626', '#7c3aed', '#ec4899', '#06b6d4'];

/** Presets de personalidad para el Modo Básico. */
const PERSONALITY_PRESETS: {
  id: string;
  label: string;
  icon: string;
  buttonStyle: ButtonStyle;
  shadows: ShadowStyle;
  cardStyle: CardStyle;
}[] = [
  { id: 'minimalista', label: 'Minimalista', icon: '⚪', buttonStyle: 'square', shadows: 'none', cardStyle: 'compact' },
  { id: 'elegante', label: 'Elegante', icon: '🎩', buttonStyle: 'rounded', shadows: 'soft', cardStyle: 'premium' },
  { id: 'moderno', label: 'Moderno', icon: '✨', buttonStyle: 'rounded', shadows: 'modern', cardStyle: 'classic' },
  { id: 'premium', label: 'Premium', icon: '💎', buttonStyle: 'pill', shadows: 'elevated', cardStyle: 'premium' },
];

/**
 * Ajusta un color hex haciéndolo más oscuro (amount negativo) o más claro (positivo).
 * Amount: -100 a 100. -25 = 25% más oscuro, 85 = 85% más claro (mezcla con blanco).
 */
function adjustColor(hex: string, amount: number): string {
  // Remover # y parsear RGB.
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;

  const adjust = (c: number) => {
    if (amount >= 0) {
      // Mezclar con blanco.
      return Math.round(c + (255 - c) * (amount / 100));
    } else {
      // Mezclar con negro.
      return Math.round(c * (1 + amount / 100));
    }
  };

  const toHex = (c: number) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

/**
 * ═══ THEME ENGINE — Experiencia tipo Shopify ═══
 *
 * 1. El usuario elige una plantilla (Comida, Moda, Farmacia…).
 * 2. Elige una paleta de colores.
 * 3. Guarda. Tienda lista.
 *
 * Todo lo técnico va en Modo Diseñador.
 */
function ThemeEditor({
  config,
  onConfigChange,
  onSave,
  saving,
  saved,
}: {
  config: SiteConfig;
  onConfigChange: (next: SiteConfig) => void;
  onSave: (themeId: string, themeData: string, legacyFields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  saved: boolean;
}) {
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Resolver tema actual.
  const currentTheme: ThemeTokens = useMemo(() => {
    if (config.themeData && config.themeData.trim()) {
      try { return parseTheme(config.themeData); } catch { /* fall through */ }
    }
    if (config.themeId && config.themeId !== 'custom') {
      const predefined = getPredefinedTheme(config.themeId);
      if (predefined) return predefined;
    }
    return DEFAULT_THEME;
  }, [config]);

  // Vista previa en vivo.
  useEffect(() => {
    applyTheme(currentTheme);
    loadGoogleFont(currentTheme.typography.fontFamily);
  }, [currentTheme]);

  // Cuando se selecciona plantilla + color, generar y aplicar.
  const handleApply = (templateId: TemplateId, color: string) => {
    const theme = applyTemplate(templateId, color);
    onConfigChange({
      ...config,
      themeId: 'custom',
      themeData: serializeTheme(theme),
      primaryColor: theme.palette.primary,
      primaryColorDark: theme.palette.primaryDark,
      primaryColorLight: theme.palette.primaryLight,
      footerBgColor: theme.footer.bg,
      footerTextColor: theme.footer.text,
      footerAccentColor: theme.footer.accent,
    });
  };

  const handleSave = () => {
    const legacyFields = {
      primaryColor: config.primaryColor,
      primaryColorDark: config.primaryColorDark,
      primaryColorLight: config.primaryColorLight,
      footerBgColor: config.footerBgColor,
      footerTextColor: config.footerTextColor,
      footerAccentColor: config.footerAccentColor,
      savedThemes: config.savedThemes,
    };
    onSave(config.themeId, config.themeData, legacyFields);
  };

  const handleExport = () => {
    const json = serializeTheme(currentTheme);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tema-${currentTheme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = String(ev.target?.result || '');
        const imported = parseTheme(json);
        onConfigChange({
          ...config,
          themeId: 'custom',
          themeData: serializeTheme(imported),
          primaryColor: imported.palette.primary,
          primaryColorDark: imported.palette.primaryDark,
          primaryColorLight: imported.palette.primaryLight,
          footerBgColor: imported.footer.bg,
          footerTextColor: imported.footer.text,
          footerAccentColor: imported.footer.accent,
        });
        setImportSuccess(`Tema importado.`);
        setTimeout(() => setImportSuccess(null), 3000);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Error al importar.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Detectar plantilla y color actuales para resaltar.
  const currentTemplateId = useMemo(() => {
    try {
      const parsed = JSON.parse(config.themeData || '{}');
      if (parsed.name) {
        const t = STORE_TEMPLATES.find(t => t.name === parsed.name);
        if (t) return t.id;
      }
    } catch { /* ignore */ }
    return null;
  }, [config.themeData]);

  return (
    <>
      {/* ═══ MODO BÁSICO: Elegir plantilla + paleta ═══ */}
      {!advancedMode && (
        <div className="space-y-4">
          {/* Paso 1: Elegir plantilla */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-brand" />
                1. Elige una plantilla para tu tienda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {STORE_TEMPLATES.map((t) => {
                  const isSelected = currentTemplateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(t.id);
                        setSelectedColor(t.defaultPalette);
                        handleApply(t.id, t.defaultPalette);
                      }}
                      className={`rounded-xl border-2 overflow-hidden transition-all text-left ${
                        isSelected ? 'border-amber-500 shadow-md scale-[1.02]' : 'border-gray-200 hover:border-amber-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Mini preview de la plantilla */}
                      <div className="h-24 relative overflow-hidden" style={{ backgroundColor: isSelected ? t.defaultPalette : '#f3f4f6' }}>
                        <div className="absolute inset-0 flex flex-col">
                          {/* Mini header */}
                          <div className="h-5 flex items-center px-2" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : '#fff' }}>
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: isSelected ? t.defaultPalette : '#d1d5db' }} />
                            <div className="ml-1.5 h-1.5 w-8 rounded-full" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : '#e5e7eb' }} />
                          </div>
                          {/* Mini products */}
                          <div className="flex-1 grid grid-cols-3 gap-1 p-1.5">
                            {[0,1,2].map(i => (
                              <div key={i} className="rounded" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#e5e7eb' }} />
                            ))}
                          </div>
                          {/* Mini footer */}
                          <div className="h-3" style={{ backgroundColor: isSelected ? 'rgba(0,0,0,0.3)' : '#d1d5db' }} />
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{t.icon}</span>
                          <p className="font-semibold text-xs text-gray-900">{t.name}</p>
                        </div>
                        <p className="text-[10px] text-gray-700 mt-0.5 line-clamp-2">{t.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Paso 2: Elegir paleta de colores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-brand" />
                2. Elige el color de tu tienda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 flex-wrap">
                {COLOR_PALETTES.map((c) => {
                  const isActive = (config?.primaryColor || '#f59e0b').toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        setSelectedColor(c.hex);
                        const templateId = currentTemplateId || selectedTemplate || 'delivery';
                        handleApply(templateId, c.hex);
                      }}
                      className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                    >
                      <span
                        className={`w-12 h-12 rounded-full border-4 transition-all ${isActive ? 'border-gray-900 shadow-lg ring-2 ring-amber-400' : 'border-gray-200'}`}
                        style={{ background: c.hex }}
                      />
                      <span className={`text-xs ${isActive ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{c.name}</span>
                    </button>
                  );
                })}
                {/* Color personalizado */}
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="color"
                    value={config?.primaryColor || '#f59e0b'}
                    onChange={(e) => {
                      const templateId = currentTemplateId || selectedTemplate || 'delivery';
                      handleApply(templateId, e.target.value);
                    }}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-[10px] text-gray-700">Personalizado</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modo Diseñador */}
          <div className="pt-2 border-t border-gray-100">
            <Button onClick={() => setAdvancedMode(true)} variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              Modo Diseñador (avanzado)
            </Button>
            <p className="text-[10px] text-gray-600 mt-1">Para diseñadores que quieren controlar cada detalle.</p>
          </div>
        </div>
      )}

      {/* ═══ MODO DISEÑADOR ═══ */}
      {advancedMode && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-4 w-4 text-brand" />
                Modo Diseñador — Tokens de Diseño
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setAdvancedMode(false)} variant="outline" size="sm" className="mb-4">
                ← Volver al Modo Básico
              </Button>
              <ThemeTokenEditor theme={currentTheme} onThemeChange={(updater) => {
                const next = updater(currentTheme);
                onConfigChange({
                  ...config,
                  themeId: 'custom',
                  themeData: serializeTheme(next),
                  primaryColor: next.palette.primary,
                  primaryColorDark: next.palette.primaryDark,
                  primaryColorLight: next.palette.primaryLight,
                  footerBgColor: next.footer.bg,
                  footerTextColor: next.footer.text,
                  footerAccentColor: next.footer.accent,
                });
              }} />
            </CardContent>
          </Card>

          {/* Exportar / Importar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpDown className="h-4 w-4 text-brand" />
                Exportar / Importar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1.5" /> Exportar
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1.5" /> Importar
                </Button>
                <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
              </div>
              {importError && <p className="text-xs text-red-600">⚠ {importError}</p>}
              {importSuccess && <p className="text-xs text-green-600">✓ {importSuccess}</p>}
            </CardContent>
          </Card>

          {/* Galería */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Save className="h-4 w-4 text-brand" />
                Galería de Diseños
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SavedThemesGallery
                value={config.savedThemes || '[]'}
                currentTheme={currentTheme}
                onChange={(v) => onConfigChange({ ...config, savedThemes: v })}
                onApplyTheme={(theme) => {
                  onConfigChange({
                    ...config,
                    themeId: 'custom',
                    themeData: serializeTheme(theme),
                    primaryColor: theme.palette.primary,
                    primaryColorDark: theme.palette.primaryDark,
                    primaryColorLight: theme.palette.primaryLight,
                    footerBgColor: theme.footer.bg,
                    footerTextColor: theme.footer.text,
                    footerAccentColor: theme.footer.accent,
                  });
                }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

// ─── VISTA PREVIA ──────────────────────────────────────────────────────────

function ThemeLivePreview({ theme }: { theme: ThemeTokens }) {
  const RADIUS_MAP: Record<string, string> = { none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px' };
  const imgRadius = theme.imageRadiusMode === 'custom'
    ? (RADIUS_MAP[theme.imageRadius] || '0px')
    : (RADIUS_MAP[theme.radius.card] || '0px');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-brand" />
          Vista Previa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ fontFamily: `"${theme.typography.fontFamily}", sans-serif` }}>
          {/* Header */}
          <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7" style={{ backgroundColor: theme.palette.primary, borderRadius: RADIUS_MAP[theme.radius.button] }} />
              <div>
                <p className="text-sm font-bold text-gray-900" style={{ fontWeight: theme.typography.headingWeight }}>Mi Tienda</p>
                <p className="text-[9px] font-semibold uppercase" style={{ color: theme.palette.primaryDark }}>Demo</p>
              </div>
            </div>
            <div style={{ backgroundImage: `linear-gradient(to right, ${theme.palette.primary}, ${theme.palette.primaryDark})`, borderRadius: theme.buttonStyle === 'pill' ? '9999px' : '6px' }} className="text-white text-[10px] px-3 py-1">
              🕐 Cintillo
            </div>
          </div>

          {/* Hero */}
          <div className="relative h-24 flex items-center px-4" style={{ background: `linear-gradient(135deg, ${theme.palette.primaryDark}, ${theme.palette.primary})` }}>
            <div>
              <p className="text-white font-bold text-sm">Banner principal</p>
              <p className="text-white/80 text-[10px]">Tu mensaje aquí</p>
              <button className="mt-1.5 text-[10px] font-semibold px-3 py-1" style={{ backgroundColor: theme.palette.primaryLight, color: theme.palette.primaryDark, borderRadius: theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0px' : '6px' }}>
                Comprar
              </button>
            </div>
          </div>

          {/* Productos + badges */}
          <div className="p-3 space-y-2 bg-gray-50">
            <div className="flex gap-2 flex-wrap">
              <span className="text-[9px] font-bold px-2 py-0.5" style={{ backgroundColor: theme.palette.primaryLight, color: theme.palette.primaryDark, borderRadius: '4px' }}>BADGE</span>
              <span className="text-[9px] font-bold px-2 py-0.5 text-white" style={{ backgroundColor: theme.palette.success, borderRadius: '4px' }}>✓ ÉXITO</span>
            </div>
            <div className="bg-white overflow-hidden flex" style={{ borderRadius: RADIUS_MAP[theme.radius.card], boxShadow: theme.shadows === 'none' ? 'none' : '0 2px 4px rgba(0,0,0,0.08)' }}>
              <div className="w-20 h-20 shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: theme.palette.primaryLight, aspectRatio: '1/1', borderRadius: imgRadius }}>
                <span className="text-xl">🖼️</span>
              </div>
              <div className="flex-1 p-2 min-w-0">
                <p className="text-xs font-bold text-gray-900">Producto de muestra</p>
                <p className="text-[10px] text-gray-700">Categoría</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-bold" style={{ color: theme.palette.primaryDark }}>$25.00</p>
                  <button className="text-white text-[9px] font-semibold px-2 py-1" style={{ backgroundColor: theme.palette.primary, borderRadius: theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0px' : '4px' }}>Agregar</button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Buscar…" disabled className="flex-1 h-8 px-2 text-[10px] border bg-gray-50" style={{ borderRadius: RADIUS_MAP[theme.radius.input], borderColor: '#e5e7eb' }} />
              <button className="text-white text-[10px] font-semibold px-3 h-8" style={{ backgroundColor: theme.palette.primary, borderRadius: theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0px' : '6px' }}>Ir</button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 flex items-center justify-between text-[10px]" style={{ backgroundColor: theme.footer.bg, color: theme.footer.text }}>
            <span>© 2026 Mi Tienda</span>
            <span style={{ color: theme.footer.accent }}>Síguenos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── THEME TOKEN EDITOR (Modo Diseñador) ───────────────────────────────────

function ThemeTokenEditor({
  theme,
  onThemeChange,
}: {
  theme: ThemeTokens;
  onThemeChange: (updater: (t: ThemeTokens) => ThemeTokens) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold mb-2 block">Paleta</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { key: 'primary', label: 'Primario' },
            { key: 'primaryDark', label: 'Primario oscuro' },
            { key: 'primaryLight', label: 'Primario claro' },
            { key: 'secondary', label: 'Secundario' },
            { key: 'accent', label: 'Acento' },
            { key: 'success', label: 'Éxito' },
            { key: 'warning', label: 'Advertencia' },
            { key: 'error', label: 'Error' },
            { key: 'info', label: 'Información' },
          ] as const).map((f) => (
            <ColorField key={f.key} label={f.label} value={theme.palette[f.key]} onChange={(v) => onThemeChange((t) => ({ ...t, palette: { ...t.palette, [f.key]: v } }))} />
          ))}
        </div>
      </div>
      <div>
        <Label className="text-sm font-semibold mb-2 block">Tipografía</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Familia</Label>
            <Select value={theme.typography.fontFamily} onValueChange={(v) => onThemeChange((t) => ({ ...t, typography: { ...t.typography, fontFamily: v } }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{AVAILABLE_FONTS.map((f) => (<SelectItem key={f.family} value={f.family}>{f.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Peso títulos</Label>
            <Select value={String(theme.typography.headingWeight)} onValueChange={(v) => onThemeChange((t) => ({ ...t, typography: { ...t.typography, headingWeight: Number(v) } }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[300,400,500,600,700,800,900].map((w) => (<SelectItem key={w} value={String(w)}>{w}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Peso texto</Label>
            <Select value={String(theme.typography.bodyWeight)} onValueChange={(v) => onThemeChange((t) => ({ ...t, typography: { ...t.typography, bodyWeight: Number(v) } }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[300,400,500,600,700].map((w) => (<SelectItem key={w} value={String(w)}>{w}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <Label className="text-sm font-semibold mb-2 block">Radios</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([['button','Botones'],['card','Tarjetas'],['input','Inputs']] as const).map(([k,l]) => (
            <div key={k}>
              <Label className="text-xs text-gray-700 mb-1 block">{l}</Label>
              <Select value={theme.radius[k]} onValueChange={(v) => onThemeChange((t) => ({ ...t, radius: { ...t.radius, [k]: v as RadiusSize } }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(RADIUS_LABELS) as RadiusSize[]).map((r) => (<SelectItem key={r} value={r}>{RADIUS_LABELS[r]}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-sm font-semibold mb-2 block">Imágenes</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Forma</Label>
            <Select value={theme.cardImageRatio} onValueChange={(v) => onThemeChange((t) => ({ ...t, cardImageRatio: v as CardImageRatio }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(CARD_IMAGE_RATIO_LABELS) as CardImageRatio[]).map((r) => (<SelectItem key={r} value={r}>{CARD_IMAGE_RATIO_LABELS[r]}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Ajuste</Label>
            <Select value={theme.cardImageFit} onValueChange={(v) => onThemeChange((t) => ({ ...t, cardImageFit: v as CardImageFit }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(CARD_IMAGE_FIT_LABELS) as CardImageFit[]).map((f) => (<SelectItem key={f} value={f}>{CARD_IMAGE_FIT_LABELS[f]}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Radio imagen</Label>
            <Select value={theme.imageRadiusMode === 'custom' ? theme.imageRadius : 'inherit'} onValueChange={(v) => { if (v === 'inherit') { onThemeChange((t) => ({ ...t, imageRadiusMode: 'inherit' })); } else { onThemeChange((t) => ({ ...t, imageRadiusMode: 'custom', imageRadius: v as RadiusSize })); } }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="inherit">Heredar</SelectItem>{(Object.keys(RADIUS_LABELS) as RadiusSize[]).map((r) => (<SelectItem key={r} value={r}>{RADIUS_LABELS[r]}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><Label className="text-xs text-gray-700 mb-1 block">Sombras</Label><Select value={theme.shadows} onValueChange={(v) => onThemeChange((t) => ({ ...t, shadows: v as ShadowStyle }))}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(SHADOW_LABELS) as ShadowStyle[]).map((s) => (<SelectItem key={s} value={s}>{SHADOW_LABELS[s]}</SelectItem>))}</SelectContent></Select></div>
        <div><Label className="text-xs text-gray-700 mb-1 block">Botones</Label><Select value={theme.buttonStyle} onValueChange={(v) => onThemeChange((t) => ({ ...t, buttonStyle: v as ButtonStyle }))}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(BUTTON_STYLE_LABELS) as ButtonStyle[]).map((s) => (<SelectItem key={s} value={s}>{BUTTON_STYLE_LABELS[s]}</SelectItem>))}</SelectContent></Select></div>
        <div><Label className="text-xs text-gray-700 mb-1 block">Tarjetas</Label><Select value={theme.cardStyle} onValueChange={(v) => onThemeChange((t) => ({ ...t, cardStyle: v as CardStyle }))}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(CARD_STYLE_LABELS) as CardStyle[]).map((s) => (<SelectItem key={s} value={s}>{CARD_STYLE_LABELS[s]}</SelectItem>))}</SelectContent></Select></div>
      </div>
      <div>
        <Label className="text-sm font-semibold mb-2 block">Footer</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ColorField label="Fondo" value={theme.footer.bg} onChange={(v) => onThemeChange((t) => ({ ...t, footer: { ...t.footer, bg: v } }))} />
          <ColorField label="Texto" value={theme.footer.text} onChange={(v) => onThemeChange((t) => ({ ...t, footer: { ...t.footer, text: v } }))} />
          <ColorField label="Acento" value={theme.footer.accent} onChange={(v) => onThemeChange((t) => ({ ...t, footer: { ...t.footer, accent: v } }))} />
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange, description }: { label: string; value: string; onChange: (v: string) => void; description?: string; }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded-md border border-gray-200 cursor-pointer p-1 bg-white shrink-0" />
        <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#f59e0b" className="flex-1 font-mono text-xs h-9" />
      </div>
      {description && <p className="text-xs text-gray-700">{description}</p>}
    </div>
  );
}

// ─── SCHEDULE DAY EDITOR (time picker con turnos validados) ────────────────

/** Genera opciones de hora en incrementos de 30 min: 00:00, 00:30, ..., 23:30. */
const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

interface Shift {
  start: string;
  end: string;
}

/**
 * Parsea un string de horario en array de turnos.
 * Acepta formatos:
 *  - "15:00 - 18:00" → [{ start: "15:00", end: "18:00" }]
 *  - "09:00 - 12:00, 15:00 - 18:00" → [{ start: "09:00", end: "12:00" }, { start: "15:00", end: "18:00" }]
 *  - "Cerrado" o "" → []
 */
function parseShifts(value: string): Shift[] {
  if (!value || value.toLowerCase() === 'cerrado') return [];
  const parts = value.split(',').map(s => s.trim()).filter(Boolean);
  const shifts: Shift[] = [];
  for (const part of parts) {
    const match = part.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (match) {
      shifts.push({
        start: match[1].padStart(5, '0'),
        end: match[2].padStart(5, '0'),
      });
    }
  }
  return shifts;
}

/** Serializa array de turnos a string: "09:00 - 12:00, 15:00 - 18:00". */
function serializeShifts(shifts: Shift[]): string {
  if (shifts.length === 0) return 'Cerrado';
  return shifts.map(s => `${s.start} - ${s.end}`).join(', ');
}

/** Valida que el inicio < fin de cada turno y que no se solapen. */
function validateShifts(shifts: Shift[]): string | null {
  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i];
    if (s.start >= s.end) {
      return `Turno ${i + 1}: la hora de inicio debe ser menor que la de fin.`;
    }
    // Verificar solapamiento con el turno anterior.
    if (i > 0) {
      const prev = shifts[i - 1];
      if (s.start < prev.end) {
        return `Turno ${i + 1} solapa con el turno ${i}.`;
      }
    }
  }
  return null;
}

/**
 * Editor de horario para un día con turnos múltiples validados.
 *
 * Características:
 *  - Toggle Abierto/Cerrado.
 *  - Turno 1: select inicio + select fin (siempre visible).
 *  - "+ Turno": añade un nuevo par de selects (máximo 3 turnos).
 *  - "✕": elimina un turno (mínimo 1 si está abierto).
 *  - Validación: inicio < fin, sin solapamientos.
 *  - Todo mediante selects (sin input manual).
 */
function ScheduleDayEditor({
  label,
  value,
  isClosed,
  onChange,
}: {
  label: string;
  value: string;
  isClosed: boolean;
  onChange: (v: string) => void;
}) {
  const shifts = parseShifts(value);
  const validationError = isClosed ? null : validateShifts(shifts);

  const updateShift = (index: number, field: 'start' | 'end', newTime: string) => {
    const next = shifts.map((s, i) => i === index ? { ...s, [field]: newTime } : s);
    onChange(serializeShifts(next));
  };

  const addShift = () => {
    if (shifts.length >= 3) return;
    // Sugerir horario que no solape: empezar 1h después del último fin.
    const lastEnd = shifts.length > 0 ? shifts[shifts.length - 1].end : '12:00';
    const [lh, lm] = lastEnd.split(':').map(Number);
    const newStartH = Math.min(23, lh + 1);
    const newStart = `${String(newStartH).padStart(2, '0')}:${String(lm).padStart(2, '0')}`;
    const newEndH = Math.min(23, newStartH + 3);
    const newEnd = `${String(newEndH).padStart(2, '0')}:${String(lm).padStart(2, '0')}`;
    onChange(serializeShifts([...shifts, { start: newStart, end: newEnd }]));
  };

  const removeShift = (index: number) => {
    if (shifts.length <= 1) return;
    onChange(serializeShifts(shifts.filter((_, i) => i !== index)));
  };

  const defaultStart = shifts[0]?.start || '09:00';
  const defaultEnd = shifts[0]?.end || '18:00';

  return (
    <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] items-start gap-2 sm:gap-4 py-1">
      <Label className="text-sm font-medium pt-1.5">{label}</Label>
      <div className="flex flex-col gap-1.5">
        {/* Toggle Abierto/Cerrado */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={isClosed ? 'closed' : 'open'}
            onChange={(e) => {
              if (e.target.value === 'closed') {
                onChange('Cerrado');
              } else {
                onChange(serializeShifts(shifts.length > 0 ? shifts : [{ start: defaultStart, end: defaultEnd }]));
              }
            }}
            className="h-8 rounded-md border border-gray-200 text-xs px-2 bg-white"
          >
            <option value="open">Abierto</option>
            <option value="closed">Cerrado</option>
          </select>

          {!isClosed && (
            <span className="text-[10px] text-gray-600">
              {shifts.length} turno{shifts.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* Turnos */}
        {!isClosed && (
          <div className="flex flex-col gap-1.5 pl-1">
            {shifts.map((shift, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-gray-600 font-mono w-12 shrink-0">
                  Turno {i + 1}:
                </span>
                {/* Select inicio */}
                <select
                  value={shift.start}
                  onChange={(e) => updateShift(i, 'start', e.target.value)}
                  className="h-8 rounded-md border border-gray-200 text-xs px-1.5 bg-white"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-600">→</span>
                {/* Select fin */}
                <select
                  value={shift.end}
                  onChange={(e) => updateShift(i, 'end', e.target.value)}
                  className="h-8 rounded-md border border-gray-200 text-xs px-1.5 bg-white"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {/* Eliminar turno */}
                {shifts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeShift(i)}
                    className="h-6 w-6 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors text-xs"
                    aria-label="Eliminar turno"
                    title="Eliminar turno"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Añadir turno */}
            {shifts.length < 3 && (
              <button
                type="button"
                onClick={addShift}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium w-fit flex items-center gap-1 mt-0.5"
              >
                + Añadir turno
              </button>
            )}

            {/* Error de validación */}
            {validationError && (
              <p className="text-[10px] text-red-600 mt-0.5">⚠ {validationError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DELIVERY TAB ───────────────────────────────────────────────────────────

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
  asapMinLeadTimeOverride?: number | null;
  asapMaxPerHourOverride?: number | null;
  asapExcludeNormalHoursOverride?: boolean;
  createdAt: string;
}

function DeliveryTab() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZone | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [viewingZone, setViewingZone] = useState<DeliveryZone | null>(null);

  const blankForm: DeliveryZone = {
    id: '',
    name: '',
    description: '',
    price: 0,
    estimatedTime: 'Mismo día',
    active: true,
    order: 0,
    allowsPriorityDelivery: false,
    asapSurchargeOverride: false,
    asapSurchargeType: 'fixed',
    asapSurchargeValue: 0,
    asapMinLeadTimeOverride: null,
    asapMaxPerHourOverride: null,
    asapExcludeNormalHoursOverride: false,
    createdAt: '',
  };
  const [form, setForm] = useState<DeliveryZone>(blankForm);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/delivery-zones');
      const data = (await res.json().catch(() => [])) as DeliveryZone[];
      setZones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const openCreate = () => {
    setEditingZone(null);
    const nextOrder = zones.length > 0 ? Math.max(...zones.map((z) => z.order ?? 0)) + 1 : 0;
    setForm({ ...blankForm, order: nextOrder });
    setDialogOpen(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setForm({ ...zone });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        estimatedTime: form.estimatedTime.trim() || 'Mismo día',
        active: form.active,
        order: Number(form.order) || 0,
        allowsPriorityDelivery: form.allowsPriorityDelivery,
        asapSurchargeOverride: form.asapSurchargeOverride,
        asapSurchargeType: form.asapSurchargeType,
        asapSurchargeValue: Number(form.asapSurchargeValue) || 0,
        asapMinLeadTimeOverride: form.asapMinLeadTimeOverride || null,
        asapMaxPerHourOverride: form.asapMaxPerHourOverride || null,
        asapExcludeNormalHoursOverride: form.asapExcludeNormalHoursOverride || false,
      };
      const res = await fetch(
        editingZone
          ? `/api/admin/delivery-zones/${editingZone.id}`
          : '/api/admin/delivery-zones',
        {
          method: editingZone ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        setDialogOpen(false);
        await fetchZones();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Error guardando zona:', err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      const res = await fetch(`/api/admin/delivery-zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !zone.active }),
      });
      if (res.ok) await fetchZones();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/delivery-zones/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        await fetchZones();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Zonas de Delivery</h2>
          <p className="text-sm text-gray-700 mt-1">
            Define las zonas de entrega con precios personalizados. El cliente elegirá una zona durante el checkout.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-brand hover:bg-amber-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Zona
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{zones.length}</div>
            <p className="text-xs text-gray-700 mt-1">Zonas totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {zones.filter((z) => z.active).length}
            </div>
            <p className="text-xs text-gray-700 mt-1">Zonas activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">
              ${zones.length > 0
                ? Math.min(...zones.filter((z) => z.active).map((z) => Number(z.price) || 0)).toFixed(2)
                : '0.00'}
            </div>
            <p className="text-xs text-gray-700 mt-1">Envío más económico</p>
          </CardContent>
        </Card>
      </div>

      {/* Zones table */}
      {zones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-700 mb-4">Aún no has creado ninguna zona de delivery.</p>
            <Button onClick={openCreate} className="bg-brand hover:bg-amber-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear primera zona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Orden</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead className="w-28">Precio</TableHead>
                  <TableHead className="w-36">Tiempo estimado</TableHead>
                  <TableHead className="w-28">Prioritaria</TableHead>
                  <TableHead className="w-24">Estado</TableHead>
                  <TableHead className="w-32 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-mono text-xs text-gray-700">
                        {zone.order ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{zone.name}</div>
                        {zone.description && (
                          <div className="text-xs text-gray-700 mt-0.5 line-clamp-2 max-w-md">
                            {zone.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-amber-600">
                          ${Number(zone.price).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {zone.estimatedTime}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/admin/delivery-zones/${zone.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ allowsPriorityDelivery: !zone.allowsPriorityDelivery }),
                              });
                              if (res.ok) await fetchZones();
                            } catch (err) { console.error(err); }
                          }}
                          title={zone.allowsPriorityDelivery ? 'Click para desactivar entrega prioritaria' : 'Click para activar entrega prioritaria'}
                        >
                          <Badge
                            variant="outline"
                            className={
                              zone.allowsPriorityDelivery
                                ? 'bg-amber-100 text-amber-700 border-amber-200 cursor-pointer'
                                : 'bg-gray-100 text-gray-700 border-gray-200 cursor-pointer'
                            }
                          >
                            {zone.allowsPriorityDelivery ? '⚡ Sí' : '— No'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleActive(zone)}
                          className="inline-flex"
                          title={zone.active ? 'Click para desactivar' : 'Click para activar'}
                        >
                          <Badge
                            variant="outline"
                            className={
                              zone.active
                                ? 'bg-green-100 text-green-700 border-green-200 cursor-pointer'
                                : 'bg-gray-100 text-gray-700 border-gray-200 cursor-pointer'
                            }
                          >
                            {zone.active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingZone(zone)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(zone)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(zone)}
                            title="Eliminar"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? 'Editar Zona de Delivery' : 'Nueva Zona de Delivery'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Nombre de la zona *</Label>
              <Input
                id="zone-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Ciego de Ávila (Ciudad)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-desc">Descripción</Label>
              <Textarea
                id="zone-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Municipios o áreas que cubre esta zona, indicaciones, etc."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone-price">Precio de envío (USD) *</Label>
                <Input
                  id="zone-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-time">Tiempo estimado</Label>
                <Input
                  id="zone-time"
                  value={form.estimatedTime}
                  onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
                  placeholder="Ej: Mismo día, 1-2 días"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone-order">Orden de visualización</Label>
                <Input
                  id="zone-order"
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
                <p className="text-xs text-gray-700">Las zonas se ordenan de menor a mayor.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-active">Estado</Label>
                <div className="flex items-center h-10">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      id="zone-active"
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="h-4 w-4 accent-amber-500"
                    />
                    <span className="text-sm text-gray-700">
                      {form.active ? 'Activa (visible en el checkout)' : 'Inactiva (oculta)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Permite entrega prioritaria */}
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowsPriorityDelivery}
                  onChange={(e) => setForm({ ...form, allowsPriorityDelivery: e.target.checked })}
                  className="h-4 w-4 accent-amber-500"
                />
                <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  ⚡ Permite entrega prioritaria ("Entrega Prioritaria")
                </span>
              </label>
              <p className="text-xs text-gray-700 -mt-1">
                Si activas esto, los clientes que seleccionen esta zona en el checkout verán la opción
                de entrega urgente "Entrega Prioritaria" con su recargo correspondiente. Las zonas donde
                no se habilite esta opción solo permitirán entrega en horario normal.
              </p>
            </div>

            {/* Recargo ASAP opcional por zona */}
            <div className="rounded-lg border border-gray-200 p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.asapSurchargeOverride}
                  onChange={(e) => setForm({ ...form, asapSurchargeOverride: e.target.checked })}
                  className="h-4 w-4 accent-amber-500"
                />
                <span className="text-sm font-medium text-gray-800">
                  Recargo "Entrega Prioritaria" personalizado para esta zona
                </span>
              </label>
              <p className="text-xs text-gray-700 -mt-1">
                Si activas esto, esta zona usará su propio recargo para entregas urgentes en vez del global.
              </p>
              {form.asapSurchargeOverride && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={form.asapSurchargeType}
                      onValueChange={(v) => setForm({ ...form, asapSurchargeType: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                        <SelectItem value="percent">Porcentaje (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      {form.asapSurchargeType === 'percent' ? 'Porcentaje (%)' : 'Monto (USD)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.asapSurchargeValue}
                      onChange={(e) => setForm({ ...form, asapSurchargeValue: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Configuración de Entrega Prioritaria por zona */}
            {form.allowsPriorityDelivery && (
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-3 space-y-3">
                <p className="text-sm font-semibold text-amber-800">⚙️ Configuración de Entrega Prioritaria</p>

                {/* Tiempo mínimo de antelación */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Tiempo mínimo de antelación (minutos)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="15"
                    value={form.asapMinLeadTimeOverride ?? ''}
                    onChange={(e) => setForm({ ...form, asapMinLeadTimeOverride: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Usar global (60)"
                  />
                  <p className="text-[11px] text-gray-700">Tiempo mínimo entre el pedido y la entrega. Vacío = usar configuración global.</p>
                </div>

                {/* Máximo de pedidos por hora */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Máximo de pedidos prioritarios por hora</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.asapMaxPerHourOverride ?? ''}
                    onChange={(e) => setForm({ ...form, asapMaxPerHourOverride: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Usar global (5)"
                  />
                  <p className="text-[11px] text-gray-700">Límite de pedidos ASAP por hora para evitar colapsos. Vacío = usar global.</p>
                </div>

                {/* Excluir horario normal */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.asapExcludeNormalHoursOverride || false}
                    onChange={(e) => setForm({ ...form, asapExcludeNormalHoursOverride: e.target.checked })}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <span className="text-sm text-gray-700">Excluir horario de entrega normal de los slots prioritarios</span>
                </label>
                <p className="text-[11px] text-gray-700">Si activas esto, las horas del horario normal (ej: 15:00-18:00) no aparecerán como opción prioritaria.</p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand hover:bg-amber-600 text-white"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingZone ? 'Guardar cambios' : 'Crear zona'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vista lectura de zona */}
      <Dialog open={!!viewingZone} onOpenChange={(open) => !open && setViewingZone(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-gray-700" />
              {viewingZone?.name || 'Detalles de zona'}
            </DialogTitle>
          </DialogHeader>
          {viewingZone && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700 text-xs">Precio de envío</p>
                  <p className="font-bold text-lg">${Number(viewingZone.price).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700 text-xs">Tiempo estimado</p>
                  <p className="font-semibold">{viewingZone.estimatedTime || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700 text-xs">Estado</p>
                  <Badge variant={viewingZone.active ? 'default' : 'secondary'}>{viewingZone.active ? 'Activa' : 'Inactiva'}</Badge>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700 text-xs">Orden</p>
                  <p className="font-semibold">{viewingZone.order}</p>
                </div>
              </div>
              {viewingZone.description && (
                <div className="border-t pt-3">
                  <p className="text-gray-700 text-xs mb-1">Descripción</p>
                  <p className="text-gray-700">{viewingZone.description}</p>
                </div>
              )}
              <div className="border-t pt-3 space-y-2">
                <p className="text-gray-700 text-xs font-semibold">Entrega Prioritaria</p>
                <div className="flex items-center gap-2">
                  <Badge variant={viewingZone.allowsPriorityDelivery ? 'default' : 'secondary'}>
                    {viewingZone.allowsPriorityDelivery ? '✓ Habilitada' : '✗ No disponible'}
                  </Badge>
                </div>
                {viewingZone.allowsPriorityDelivery && (
                  <div className="pl-4 space-y-1 text-xs text-gray-600">
                    <p>• Antelación mínima: <strong>{viewingZone.asapMinLeadTimeOverride != null ? `${viewingZone.asapMinLeadTimeOverride} min` : 'Global (60 min)'}</strong></p>
                    <p>• Máx pedidos/hora: <strong>{viewingZone.asapMaxPerHourOverride != null ? viewingZone.asapMaxPerHourOverride : 'Global (5)'}</strong></p>
                    <p>• Excluir horario normal: <strong>{viewingZone.asapExcludeNormalHoursOverride ? 'Sí' : 'No'}</strong></p>
                    {viewingZone.asapSurchargeOverride ? (
                      <p>• Recargo personalizado: <strong>{viewingZone.asapSurchargeType === 'percent' ? `${viewingZone.asapSurchargeValue}%` : `$${Number(viewingZone.asapSurchargeValue).toFixed(2)}`}</strong></p>
                    ) : (
                      <p>• Recargo: <strong>Global</strong></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingZone(null)}>Cerrar</Button>
            <Button onClick={() => { if (viewingZone) { openEdit(viewingZone); setViewingZone(null); } }} className="bg-brand hover:bg-amber-600 text-white">
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zona de delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.
              Los pedidos existentes conservarán la zona que se les asignó en su momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── CUSTOMERS TAB ───────────────────────────────────────────────────────────

interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  country: string;
  address: string;
  deliveryZoneName: string | null;
  savedRecipients: { id: string }[];
  createdAt: string;
}

// (COUNTRY_INFO y CountryFlag se importan desde @/components/ecommerce/CountryFlag)

// ─── Form state para crear/editar cliente ───
interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  country: string;
  address: string;
  deliveryZoneName: string;
  password: string; // vacío = no cambiar (edición) / autogenerada (creación)
}

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  country: 'US',
  address: '',
  deliveryZoneName: '',
  password: '',
};

function CustomersTab() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailCustomer, setDetailCustomer] = useState<AdminCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);

  // CRUD: diálogo de crear/editar
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<AdminCustomer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // CRUD: confirmación de eliminación
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/customers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => []);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los clientes. Esto puede deberse a una recompilación del servidor. Haz clic en "Reintentar".');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q);
  });

  // ── Abrir formulario para nuevo cliente ──
  const openNew = () => {
    setEditingCustomer(null);
    setForm(EMPTY_CUSTOMER_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  // ── Abrir formulario para editar cliente existente ──
  const openEdit = (c: AdminCustomer) => {
    setEditingCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email,
      country: c.country || 'US',
      address: c.address || '',
      deliveryZoneName: c.deliveryZoneName || '',
      password: '', // vacío = no cambiar
    });
    setFormError(null);
    setFormOpen(true);
    setDetailCustomer(null); // cerrar el diálogo de detalle si estaba abierto
  };

  // ── Guardar (crear o actualizar) ──
  const handleSave = async () => {
    setFormError(null);
    // Validaciones básicas
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setFormError('Nombre, teléfono y correo son obligatorios.');
      return;
    }
    // Validar formato de email simple
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('El correo electrónico no tiene un formato válido.');
      return;
    }
    // Si es creación, la contraseña es obligatoria (o se autogenera si está vacía)
    // Si es edición, la contraseña es opcional (vacío = no cambiar)
    if (!editingCustomer && form.password && form.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (editingCustomer && form.password && form.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        country: form.country,
        address: form.address.trim(),
        deliveryZoneName: form.deliveryZoneName.trim(),
      };
      // Sólo enviar password si no está vacío
      if (form.password) payload.password = form.password;

      let res: Response;
      if (editingCustomer) {
        res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      setFormOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : 'Error al guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar cliente ──
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/customers/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      setDeleteId(null);
      setDetailCustomer(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error al eliminar el cliente.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No se pudieron cargar los clientes</h3>
        <p className="text-sm text-gray-700 max-w-md mb-4">{error}</p>
        <Button onClick={fetchData} className="bg-brand hover:bg-amber-600 text-white">
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes Registrados</h2>
          <p className="text-sm text-gray-700 mt-1">{customers.length} cliente{customers.length === 1 ? '' : 's'} registrado{customers.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openNew} className="bg-brand hover:bg-amber-600 text-white">
            <UserPlus className="h-4 w-4 mr-2" /> Nuevo Cliente
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar por nombre, correo o teléfono…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-700">
            <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            {search ? 'No se encontraron clientes con ese criterio.' : 'Aún no hay clientes registrados.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Correo</TableHead>
                    <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead className="hidden lg:table-cell">Dirección</TableHead>
                    <TableHead className="hidden sm:table-cell">Destinatarios</TableHead>
                    <TableHead className="hidden md:table-cell">Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailCustomer(c)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-700">{c.email}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-700">{c.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          <CountryFlag code={c.country} />
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-700 max-w-[200px] truncate">
                        {c.address || '—'}
                        {c.deliveryZoneName && <span className="text-gray-600"> · {c.deliveryZoneName}</span>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">
                          <Heart className="h-3 w-3 mr-1" />
                          {c.savedRecipients?.length ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-700">
                        {formatCubaDateOnly(c.createdAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDetailCustomer(c)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(c)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => setDeleteId(c.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalle del cliente */}
      <Dialog open={!!detailCustomer} onOpenChange={(o) => !o && setDetailCustomer(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {detailCustomer?.name.charAt(0).toUpperCase()}
              </div>
              {detailCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {detailCustomer && (
            <div className="space-y-4">
              {/* Datos del cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Correo</p>
                  <p className="text-sm text-gray-900 flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-gray-600" /> {detailCustomer.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Teléfono</p>
                  <p className="text-sm text-gray-900 flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-gray-600" /> {detailCustomer.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">País</p>
                  <Badge variant="outline" className="text-xs"><CountryFlag code={detailCustomer.country} /></Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Registro</p>
                  <p className="text-sm text-gray-900">{formatCubaDateOnly(detailCustomer.createdAt)}</p>
                </div>
                {detailCustomer.address && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-600 font-medium">Dirección</p>
                    <p className="text-sm text-gray-900 flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-600" /> {detailCustomer.address}{detailCustomer.deliveryZoneName ? ` · ${detailCustomer.deliveryZoneName}` : ''}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Familiares guardados */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Familiares Guardados ({detailCustomer.savedRecipients?.length ?? 0})
                </h4>
                {detailCustomer.savedRecipients && detailCustomer.savedRecipients.length > 0 ? (
                  <div className="space-y-2">
                    {detailCustomer.savedRecipients.map((r: { id: string; label: string; name: string; phone: string; address: string; notes?: string }) => (
                      <div key={r.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[11px]">{r.label}</Badge>
                          <span className="font-medium text-gray-900 text-sm">{r.name}</span>
                        </div>
                        <p className="text-xs text-gray-700">📞 {r.phone}</p>
                        <p className="text-xs text-gray-700">📍 {r.address}</p>
                        {r.notes && <p className="text-xs text-gray-600 italic mt-0.5">📝 {r.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Sin familiares guardados.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => setDeleteId(detailCustomer?.id ?? null)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDetailCustomer(null)}>Cerrar</Button>
              <Button
                className="bg-brand hover:bg-amber-600 text-white"
                onClick={() => detailCustomer && openEdit(detailCustomer)}
              >
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Crear / Editar cliente */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o && !saving) setFormOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingCustomer ? <Pencil className="h-5 w-5 text-brand" /> : <UserPlus className="h-5 w-5 text-brand" />}
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre completo *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Teléfono *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+53 5555 1234" />
              </div>
              <div>
                <Label>Correo electrónico *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@email.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>País</Label>
                <Select value={form.country || 'US'} onValueChange={(v) => setForm({ ...form, country: v })}>
                  <SelectTrigger>
                    <span className="inline-flex items-center gap-1.5">
                      <img
                        src={`https://flagcdn.com/w20/${(form.country || 'US').toLowerCase()}.webp`}
                        srcSet={`https://flagcdn.com/w40/${(form.country || 'US').toLowerCase()}.png 2x`}
                        alt={form.country || 'US'}
                        className="h-3 w-4 object-cover rounded-[2px]"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="font-semibold">{COUNTRY_INFO[form.country]?.abbr || form.country || 'US'}</span>
                      <span className="text-gray-700 font-normal">— {COUNTRY_INFO[form.country]?.name || ''}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COUNTRY_INFO).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        <span className="inline-flex items-center gap-2">
                          <img
                            src={`https://flagcdn.com/w20/${code.toLowerCase()}.webp`}
                            srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 2x`}
                            alt={info.abbr}
                            className="h-3 w-4 object-cover rounded-[2px]"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <span className="font-semibold">{info.abbr}</span>
                          <span className="text-gray-700 font-normal">— {info.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zona de delivery (opcional)</Label>
                <Input value={form.deliveryZoneName} onChange={(e) => setForm({ ...form, deliveryZoneName: e.target.value })} placeholder="Ciego de Ávila (Ciudad)" />
              </div>
            </div>
            <div>
              <Label>Dirección (opcional)</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle 1 entre 2 y 4, Rpto. Sueño" />
            </div>
            <div>
              <Label>
                Contraseña{' '}
                {editingCustomer
                  ? <span className="text-xs text-gray-600">(vacío = no cambiar)</span>
                  : <span className="text-xs text-gray-600">(vacío = autogenerada)</span>}
              </Label>
              <PasswordInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingCustomer ? 'Dejar vacío para mantener la actual' : 'Se genera automáticamente si está vacío'}
                autoComplete="new-password"
                id="customer-password-field"
              />
              <p className="text-[11px] text-gray-700 mt-1">Mínimo 6 caracteres.</p>
            </div>

            {formError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-amber-600 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cliente será eliminado permanentemente,
              junto con sus destinatarios guardados. Los pedidos ya realizados no se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── REVIEWS TAB ────────────────────────────────────────────────────────────

interface AdminReview {
  id: string;
  productId: string;
  customerId: string | null;
  authorName: string;
  rating: number;
  comment: string;
  status: string;
  adminReply: string;
  createdAt: string;
}

function ReviewsTab() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewType, setReviewType] = useState<'products' | 'store'>('products');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        fetch('/api/admin/reviews'),
        fetch('/api/admin/products'),
      ]);
      const reviewsData = await rRes.json().catch(() => []);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      const prodsData = await pRes.json().catch(() => []);
      const prods = Array.isArray(prodsData) ? prodsData : [];
      setProducts(prods.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (reviewId: string, status: string) => {
    try {
      await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setReviews((cur) => cur.map((r) => r.id === reviewId ? { ...r, status } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await fetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
      setReviews((cur) => cur.filter((r) => r.id !== reviewId));
    } catch (err) {
      console.error(err);
    }
  };

  // Filtrar por tipo (productos vs negocio) y por estado.
  const typedReviews = reviewType === 'store'
    ? reviews.filter((r) => r.productId === 'store')
    : reviews.filter((r) => r.productId !== 'store');
  const filtered = filter === 'all' ? typedReviews : typedReviews.filter((r) => r.status === filter);
  const productName = (productId: string) => {
    if (productId === 'store') return 'Reseña del negocio';
    return products.find((p) => p.id === productId)?.name || 'Producto eliminado';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reseñas</h2>
          <p className="text-sm text-gray-700 mt-1">
            {typedReviews.filter(r => r.status === 'pending').length} pendientes · {typedReviews.filter(r => r.status === 'approved').length} aprobadas · {typedReviews.filter(r => r.status === 'rejected').length} rechazadas
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      {/* Tabs: Reseñas de Productos / Reseñas del Negocio */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${reviewType === 'products' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-700 hover:text-gray-700'}`}
          onClick={() => { setReviewType('products'); setFilter('all'); }}
        >
          Reseñas de Productos
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${reviewType === 'store' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-700 hover:text-gray-700'}`}
          onClick={() => { setReviewType('store'); setFilter('all'); }}
        >
          Reseñas del Negocio
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            className={filter === f ? 'bg-brand hover:bg-amber-600 text-white' : ''}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : 'Rechazadas'}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-700">
            <Star className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            No hay reseñas {filter !== 'all' ? 'con este filtro' : ''}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{r.authorName}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'text-brand fill-amber-500' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <Badge variant="outline" className={`text-[11px] ${
                        r.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                        r.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                        'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {r.status === 'approved' ? 'Aprobada' : r.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {productName(r.productId)} · {formatCubaDateOnly(r.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">{r.comment}</p>
                {r.adminReply && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 mb-3">
                    <p className="text-xs text-blue-800"><strong>Respuesta del admin:</strong> {r.adminReply}</p>
                  </div>
                )}
                {/* Acciones */}
                <div className="flex items-center gap-2">
                  {r.status !== 'approved' && (
                    <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white h-7" onClick={() => updateStatus(r.id, 'approved')}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprobar
                    </Button>
                  )}
                  {r.status !== 'rejected' && (
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 h-7" onClick={() => updateStatus(r.id, 'rejected')}>
                      Rechazar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 h-7" onClick={() => deleteReview(r.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Download source code button ─────────────────────────────────────────────
function DownloadCodeButton() {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'done' | 'error'>('idle');
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleDownload = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    if (!token) {
      setErrorMsg('No hay sesión activa. Inicia sesión de nuevo.');
      setStatus('error');
      return;
    }
    setStatus('preparing');
    setFileCount(null);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/download?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Si el token expiró, mostrar mensaje claro
        if (res.status === 401) {
          setErrorMsg('Tu sesión expiró. Cierra sesión, vuelve a ingresar al admin e inténtalo de nuevo.');
        } else {
          setErrorMsg(err.error || `Error ${res.status}`);
        }
        throw new Error(err.error || `Error ${res.status}`);
      }
      const count = res.headers.get('X-File-Count');
      if (count) setFileCount(parseInt(count, 10));

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      let filename = `diaz-premium-envios-${Date.now()}.zip`;
      const match = disposition.match(/filename="([^"]+)"/);
      if (match) filename = match[1];

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Download error:', err);
      if (!errorMsg) {
        setErrorMsg('No se pudo generar el paquete. Intenta de nuevo.');
      }
      setStatus('error');
      setTimeout(() => { setStatus('idle'); setErrorMsg(''); }, 8000);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <Button
        onClick={handleDownload}
        disabled={status === 'preparing'}
        className="bg-brand hover:bg-amber-600 text-white"
      >
        {status === 'preparing' ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Preparando zip…</>
        ) : status === 'done' ? (
          <><CheckCircle2 className="h-4 w-4 mr-2" /> Descargado</>
        ) : (
          <><Download className="h-4 w-4 mr-2" /> Descargar Código</>
        )}
      </Button>
      {fileCount !== null && status === 'done' && (
        <span className="text-sm text-gray-600">
          {fileCount} archivos incluidos en el paquete.
        </span>
      )}
      {status === 'error' && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-red-600">
            {errorMsg || 'No se pudo generar el paquete. Intenta de nuevo.'}
          </span>
          {errorMsg.includes('sesión') && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-600 border-amber-300 hover:bg-amber-50 w-fit"
              onClick={() => {
                localStorage.removeItem(ADMIN_TOKEN_KEY);
                window.location.href = '/admin';
              }}
            >
              Ir a iniciar sesión
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ADMIN PANEL ───────────────────────────────────────────────────────

export function AdminPanel() {
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  // Sidebar colapsable en TODOS los tamaños. Por defecto: colapsado en móvil,
  // expandido en desktop (lg+). El botón hamburguesa del header alterna en todos.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Configurar interceptor HTTP global ──
  // Añade Authorization: Bearer <token> a todas las peticiones /api/admin/*
  // y maneja 401 (token expirado) cerrando sesión automáticamente.
  useEffect(() => {
    setupFetchInterceptor();
    sessionManager.onAdminLogout(() => {
      tokenManager.clearAdminToken();
      window.location.href = '/admin?expired=1';
    });
  }, []);

  // Por defecto: expandido en desktop (lg+), colapsado en móvil.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarOpen(true);
    }
  }, []);

  const renderTab = () => {
    switch (adminTab) {
      case 'dashboard': return <DashboardTab />;
      case 'products': return <ProductsTab />;
      case 'orders': return <OrdersTab />;
      case 'delivery': return <DeliveryTab />;
      case 'customers': return <CustomersTab />;
      case 'reviews': return <ReviewsTab />;
      case 'reservations': return <EventReservationsTab />;
      case 'settings': return <SettingsTab />;
      case 'profile': return <ProfileTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-56 bg-[var(--footer-bg,#111827)] text-white
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'}
        flex flex-col
      `}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--brand-primary,#f59e0b)]">Menú</h2>
            <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen(false)}>
              ✕
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => { setAdminTab(item.tab); setSidebarOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors
                ${adminTab === item.tab
                  ? 'bg-brand text-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <a
            href="/"
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Ver Tienda
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar with hamburger (visible on ALL screen sizes) */}
        <div className="flex items-center gap-3 p-4 border-b bg-white">
          <Button variant="outline" size="icon" onClick={() => setSidebarOpen((v) => !v)} aria-label="Mostrar/ocultar menú">
            <Menu className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold capitalize">
            {navItems.find((n) => n.tab === adminTab)?.label}
          </h2>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
