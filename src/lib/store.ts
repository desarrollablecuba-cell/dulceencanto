/**
 * JSON-file-based storage layer with a Prisma-compatible API.
 *
 * Design goals:
 *  - Drop-in replacement for `import { db } from '@/lib/db'` used by all API routes.
 *  - In-memory cache for fast reads (serverless-friendly).
 *  - Best-effort persistence to /data/*.json files (writes fail silently on read-only FS).
 *  - Auto-seeds from SEED data on first access if files are missing.
 *  - Supports the subset of Prisma Client syntax used by the existing routes:
 *      findMany, findUnique, findFirst, create, update, delete, deleteMany, upsert, count
 *      where: { field, OR, AND, contains }
 *      orderBy: { field: 'asc' | 'desc' }
 *      include: { category, items, _count: { select: { products } } }
 *      nested create: { items: { create: [...] } }
 *      atomic operations: { stock: { decrement: n } }
 */

import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Types — mirror Prisma models
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  /** Emoji mostrado como fallback si no hay imagen. */
  icon: string;
  /** URL o ruta pública (/categories/foo.webp) de la imagen de la categoría. */
  image: string;
  order: number;
  /** Si la categoría está pausada (false), no se muestra en la tienda del cliente. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  /** Nombre corto para tarjetas (opcional) */
  shortName: string;
  description: string;
  /** SKU auto-generado PROD-XXXXXX si vacío */
  sku: string;
  price: number;
  image: string;
  /** JSON string de array de data URLs (galería) */
  images: string;
  /** JSON string de array de { name, color } (tags/etiquetas) */
  tags: string;
  categoryId: string;
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  order: number;
  // ─── Unidad de venta y código (SIGECOS) ───
  /** Unidad de venta: "unidad", "kg", "lb", "litro", etc. (default "unidad") */
  saleUnit: string;
  /** Código de barras (opcional) */
  barcode: string;
  // ─── Tipo y estado (SIGECOS) ───
  /** "elaborado" | "mercancia" (default "elaborado") */
  productType: string;
  /** "active" | "inactive" | "draft" (default "active") */
  status: string;
  // ─── Disponibilidad (SIGECOS) ───
  /** Disponible en POS/tienda física (default true) */
  posAvailable: boolean;
  /** Disponible en tienda online (default true) */
  tiendaAvailable: boolean;
  // ─── Anticipo (SIGECOS) ───
  /** "sin" | "porcentaje" | "monto_fijo" (default "sin") */
  advanceType: string;
  /** Valor del anticipo (default 0) */
  advanceValue: number;
  /** Horas mínimas de anticipación (default 24) */
  minHours: number;
  /** Unidad para mostrar/editar minHours: "horas" | "dias" (default "horas").
   *  Internamente minHours siempre se guarda en horas; este campo sólo
   *  controla la UX del admin. */
  minHoursUnit: string;
  // ─── Costos (admin only, no en storefront) ───
  /** Precio de costo (default 0) */
  costPrice: number;
  /** % margen calculado (default 0) */
  marginPercent: number;
  /** Sistema de oferta */
  offerEnabled: boolean;
  offerType: string; // "permanente" | "temporada"
  offerPrice: number;
  offerStart: string | null;
  offerEnd: string | null;
  /** Venta al por mayor (SIGECOS) — los rangos se guardan en WholesaleTier */
  wholesaleEnabled: boolean;
  /** @deprecated usar WholesaleTier[] */
  wholesalePrice: number;
  /** @deprecated usar WholesaleTier[] */
  wholesaleMinQty: number;
  /** Reserva (SIGECOS) */
  reservationEnabled: boolean;
  maxReservations: number;
  reservationDays: number;
  reservationDeposit: number;
  /** Promoción (legacy SIGECOS) */
  promoEnabled: boolean;
  promoType: string; // "discount" | "fixed_price" | "bogo"
  promoValue: number;
  promoBuyQty: number;
  promoGetQty: number;
  promoStart: string | null;
  promoEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleTier {
  id: string;
  productId: string;
  /** "Mayorista", "Distribuidor", etc. */
  name: string;
  /** Cantidad mínima (0 = sin mínimo) */
  minQty: number;
  /** Cantidad máxima (0 = sin límite) */
  maxQty: number;
  /** Precio por unidad en este rango */
  price: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VariantGroup {
  id: string;
  productId: string;
  name: string;
  required: boolean;
  maxSelect: number;
  isImageGroup: boolean;
  /** Grupo dominante: cuando hay 2+ grupos, sólo uno puede ser dominante.
   *  Sus opciones definen las imágenes por defecto de las combinaciones. */
  isDominant: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VariantOption {
  id: string;
  groupId: string;
  name: string;
  priceMod: number;
  image: string;
  stock: number;
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCombination {
  id: string;
  productId: string;
  optionIds: string; // JSON string de array de IDs
  sku: string;
  stock: number;
  price: number | null; // null = auto-calc
  image: string;
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductExtra {
  id: string;
  productId: string;
  name: string;
  description: string;
  priceMod: number;
  required: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
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
  /** Zona de delivery seleccionada por el cliente (snapshot). */
  deliveryZoneId: string | null;
  deliveryZoneName: string | null;
  deliveryZonePrice: number;
  /** Fecha de entrega elegida por el cliente (ISO date YYYY-MM-DD). */
  deliveryDate: string | null;
  /** Horario elegido: 'normal' (15:00-18:00) o 'asap' (lo antes posible). */
  deliveryTimeSlot: string;
  /** Monto adicional cobrado por entrega ASAP (0 si horario normal). */
  deliverySurcharge: number;
  shippingCost: number;
  total: number;
  status: string;
  /** Marca manual del admin: el pedido fue pagado externamente. */
  isPaid: boolean;
  zelleRef: string | null;
  paymentProof: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Admin {
  id: string;
  username: string;
  password: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedRecipient {
  id: string;
  /** Etiqueta corta para identificar el destinatario: "Mamá", "Tío Pedro", etc. */
  label: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  deliveryZoneId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** Hash simple (SHA-256) — nunca se devuelve al cliente. */
  passwordHash: string;
  /** Código ISO del país del cliente: 'US', 'CU', etc. */
  country: string;
  /** Dirección del cliente (calle, número, etc.) — requerida si es de Cuba. */
  address: string;
  /** Zona de delivery seleccionada al registrarse — requerida si es de Cuba. */
  deliveryZoneId: string | null;
  /** Ciudad/municipio (snapshot del nombre de la zona de delivery). */
  deliveryZoneName: string | null;
  /** Destinatarios guardados para autocompletado en el checkout. */
  savedRecipients: SavedRecipient[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  /** ID del cliente que escribió la reseña (null si era invitado). */
  customerId: string | null;
  /** Nombre del autor (snapshot). */
  authorName: string;
  rating: number;
  comment: string;
  /** 'pending' | 'approved' | 'rejected' */
  status: string;
  /** Respuesta del admin (opcional). */
  adminReply: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteConfig {
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
  /**
   * Color principal de la marca (hex). Se inyecta como variable CSS
   * `--brand-primary` y se expone como utilidad `bg-brand` / `text-brand` /
   * `from-brand` / `to-brand` en Tailwind v4.
   *
   * Lo usan los botones, cintillo (marquee), carrito, badges, enlaces
   * activos, etc. Cambiar este color desde el admin actualiza TODA la
   * tienda en runtime sin necesidad de recompilar.
   */
  primaryColor: string;
  /** Variante oscura del color principal (para hover, bordes, sombras). */
  primaryColorDark: string;
  /** Variante clara del color principal (para fondos suaves, badges). */
  primaryColorLight: string;
  /** Color de fondo del footer (hex). Default: gris muy oscuro. */
  footerBgColor: string;
  /** Color de texto principal del footer (hex). */
  footerTextColor: string;
  /** Color de acento del footer (hex) — hover de enlaces, "Síguenos", etc. */
  footerAccentColor: string;
  /**
   * Identificador del tema predefinido ('clasico-naranja', 'azul-corporativo',
   * etc.) o 'custom' si el tema fue personalizado por el admin.
   * Ver src/lib/themes.ts para el catálogo completo.
   */
  themeId: string;
  /**
   * JSON string con los tokens completos del tema (paleta, tipografía,
   * radios, sombras, estilos de botón/tarjeta, footer). Cuando themeId
   * es un predefinido, themeData puede estar vacío (se usa el default).
   * Cuando themeId === 'custom', themeData contiene los tokens editados.
   */
  themeData: string;
  /**
   * Orden de las secciones del home, separado por comas.
   * Ej: 'hero,benefits,catalog,howItWorks,schedule,promoBanner,socialProof'.
   * Si está vacío o es inválido, se usa DEFAULT_HOME_SECTIONS_ORDER.
   * El admin puede reordenar estas secciones con drag & drop.
   */
  homeSectionsOrder: string;
  /**
   * Estado de activación de cada sección del home. JSON string con
   * { sectionId: boolean }. Si una sección no está en el objeto, se
   * considera activa por defecto. Permite al admin ocultar secciones
   * sin eliminarlas del orden.
   */
  homeSectionsEnabled: string;
  /**
   * Configuración del carrusel de ofertas destacadas. JSON string con:
   * { enabled, title, subtitle, productIds: string[], backgroundColor, textColor }
   * Si está vacío o deshabilitado, no se muestra el carrusel.
   */
  offersCarousel: string;
  /**
   * Galería de diseños guardados por el admin. JSON string de array de
   * { id, name, theme: ThemeTokens, createdAt }. Cada diseño es un tema
   * completo que el admin puede re-aplicar en cualquier momento.
   */
  savedThemes: string;
  /** Si true, el pago con Zelle está habilitado. */
  zelleEnabled: boolean;
  /** Si true, el envío gratis está habilitado (freeShippingMin). */
  freeShippingEnabled: boolean;
  /** Si true, el registro de clientes está habilitado. */
  customerRegistrationEnabled: boolean;
  /** Si true, el inicio de sesión de clientes está habilitado. */
  customerLoginEnabled: boolean;
  /** Si true, el cintillo de titulares (marquee del header) está visible. */
  tickerEnabled: boolean;
  /** Modo de visualización del catálogo: 'categories' (carruseles por categoría) o 'stacked' (grid simple). */
  catalogLayout: string;
  freeShippingMin: number;
  shippingCost: number;
  scheduleLunes: string;
  scheduleMartes: string;
  scheduleMiercoles: string;
  scheduleJueves: string;
  scheduleViernes: string;
  scheduleSabado: string;
  scheduleDomingo: string;
  /** Tipo de recargo global por entrega ASAP: 'fixed' (monto fijo) o 'percent' (porcentaje). */
  asapSurchargeType: string;
  /** Valor del recargo ASAP global: monto en USD si type=fixed, porcentaje (0-100) si type=percent. */
  asapSurchargeValue: number;
  /** Horario normal de entrega mostrado al cliente (texto libre, ej: "15:00 - 18:00"). */
  normalSchedule: string;
  /** Lista de códigos ISO de países activos para registro de clientes. Ej: ['US','CU']. */
  activeCountries: string;
  /** Items del cintillo de titulares (marquee del header). JSON string de array
   *  de strings, ej: '["🕐 Pedidos 24/7","🚚 Entregas diarias..."]'. */
  tickerItems: string;
  /** Título de la sección "Horario y Entregas" en el hero. */
  horarioSectionTitle: string;
  /** Descripción de la sección "Horario y Entregas". */
  horarioSectionDesc: string;
  /** Cards de la sección horario. JSON string de array de objetos. */
  horarioCards: string;
  /** Redes sociales. JSON string de array: { platform, url, icon, visible }. */
  socialLinks: string;
  /** Elementos de confianza del footer. JSON string de array: { icon, text, visible }. */
  trustBadges: string;
  /** Estadísticas de prueba social. JSON string de array: { value, label }. */
  socialStats: string;
  /** Testimonios. JSON string de array: { name, location, text, rating }. */
  testimonials: string;
  /** Beneficios de la banda de confianza. JSON string de array: { icon, title, desc, color, bg }. */
  homeBenefits: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Tiempo estimado de entrega mostrado al cliente (texto libre). Ej: "Mismo día", "1-2 días". */
  estimatedTime: string;
  /** Si la zona está activa para seleccionar en el checkout. */
  active: boolean;
  /** Orden de visualización (asc). */
  order: number;
  /**
   * Si la zona permite entrega prioritaria ("Lo antes posible" / ASAP).
   * Cuando es false, la opción ASAP no se muestra en el checkout para esta zona.
   */
  allowsPriorityDelivery: boolean;
  /**
   * Override opcional del recargo ASAP para esta zona.
   * Si `asapSurchargeOverride` es true, se usan asapSurchargeType/asapSurchargeValue;
   * si no, se cae al recargo global del SiteConfig.
   */
  asapSurchargeOverride: boolean;
  asapSurchargeType: string;
  asapSurchargeValue: number;
  createdAt: string;
  updatedAt: string;
}

/** Result type after applying Prisma-style `include` resolution. */
type Resolved<T> = T & {
  category?: Category | null;
  items?: OrderItem[];
  products?: Product[];
  _count?: { products?: number; items?: number };
  [k: string]: unknown;
};

// ============================================================================
// ID + time helpers
// ============================================================================

function generateId(prefix = 'c'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}${ts}${rand}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ============================================================================
// Query helpers (Prisma-compatible subset)
// ============================================================================

type WhereInput = Record<string, unknown>;

function matchesWhere(item: Record<string, unknown>, where?: WhereInput): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  for (const key of Object.keys(where)) {
    const condition = where[key];
    if (key === 'OR') {
      const subWheres = condition as WhereInput[];
      if (!subWheres.some((sub) => matchesWhere(item, sub))) return false;
      continue;
    }
    if (key === 'AND') {
      const subWheres = condition as WhereInput[];
      if (!subWheres.every((sub) => matchesWhere(item, sub))) return false;
      continue;
    }
    if (key === 'NOT') {
      const subWheres = condition as WhereInput[];
      if (subWheres.some((sub) => matchesWhere(item, sub))) return false;
      continue;
    }
    if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
      const op = condition as Record<string, unknown>;
      if ('contains' in op) {
        const fieldVal = String(item[key] ?? '').toLowerCase();
        const searchVal = String(op.contains).toLowerCase();
        if (!fieldVal.includes(searchVal)) return false;
        continue;
      }
      if ('equals' in op) {
        if (item[key] !== op.equals) return false;
        continue;
      }
      if ('in' in op) {
        const arr = op.in as unknown[];
        if (!arr.includes(item[key])) return false;
        continue;
      }
      if ('gt' in op) {
        if (!(Number(item[key]) > Number(op.gt))) return false;
        continue;
      }
      if ('gte' in op) {
        if (!(Number(item[key]) >= Number(op.gte))) return false;
        continue;
      }
      if ('lt' in op) {
        if (!(Number(item[key]) < Number(op.lt))) return false;
        continue;
      }
      if ('lte' in op) {
        if (!(Number(item[key]) <= Number(op.lte))) return false;
        continue;
      }
      // Unknown object operator — fall back to strict equality
      if (item[key] !== condition) return false;
      continue;
    }
    if (item[key] !== condition) return false;
  }
  return true;
}

function applySorting<T>(
  items: T[],
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, string>
): T[] {
  if (!orderBy || Object.keys(orderBy).length === 0) return items;
  const keys = Object.keys(orderBy);
  // For multi-key sort, sort by last key first (stable).
  const sorted = [...items];
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i];
    const dir = (orderBy as Record<string, string>)[key] === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return -1 * dir;
      if (as > bs) return 1 * dir;
      return 0;
    });
  }
  return sorted;
}

/** Apply Prisma-style atomic operations ({ decrement, increment }) and plain updates. */
function applyUpdate<T>(item: T, data: Record<string, unknown>): T {
  const updated: Record<string, unknown> = { ...(item as Record<string, unknown>) };
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const op = value as Record<string, unknown>;
      if ('decrement' in op) {
        updated[key] = (Number(updated[key]) || 0) - Number(op.decrement);
        continue;
      }
      if ('increment' in op) {
        updated[key] = (Number(updated[key]) || 0) + Number(op.increment);
        continue;
      }
      if ('multiply' in op) {
        updated[key] = (Number(updated[key]) || 0) * Number(op.multiply);
        continue;
      }
      if ('set' in op) {
        updated[key] = op.set;
        continue;
      }
      // Unknown object operator — assign directly
      updated[key] = value;
      continue;
    }
    updated[key] = value;
  }
  return updated as T;
}

// ============================================================================
// Include resolution
// ============================================================================

interface IncludeShape {
  category?: boolean;
  items?: boolean;
  products?: boolean;
  _count?: { select: { products?: boolean; items?: boolean } };
  [k: string]: unknown;
}

function resolveInclude<T>(
  item: T,
  include: IncludeShape | undefined,
  ctx: { categories: Category[]; products: Product[]; orderItems: OrderItem[] }
): Resolved<T> {
  if (!include) return item as unknown as Resolved<T>;
  const record = item as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = { ...record };
  const out = result as unknown as Resolved<T>;
  if (include.category) {
    const cat = ctx.categories.find((c) => c.id === record.categoryId);
    out.category = cat ?? null;
  }
  if (include.items) {
    out.items = ctx.orderItems.filter((oi) => oi.orderId === record.id);
  }
  if (include.products) {
    out.products = ctx.products.filter((p) => p.categoryId === record.id);
  }
  if (include._count?.select?.products) {
    const existing = (out._count ?? {}) as { products?: number; items?: number };
    out._count = {
      ...existing,
      products: ctx.products.filter((p) => p.categoryId === record.id).length,
    };
  }
  if (include._count?.select?.items) {
    const existing = (out._count ?? {}) as { products?: number; items?: number };
    out._count = {
      ...existing,
      items: ctx.orderItems.filter((oi) => oi.orderId === record.id).length,
    };
  }
  return out;
}

// ============================================================================
// Persistence layer
// ============================================================================
// Soporta dos backends:
// 1. JSON files (desarrollo, VPS, sandbox) — usa fs.readFile/writeFile
// 2. Cloudflare KV (producción serverless) — usa la API de KV bindings
//
// La detección es automática: si process.env.KV_NAMESPACE existe o
// si hay un binding global de Cloudflare, usa KV. Si no, usa JSON.

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_NAMES = {
  categories: 'categories.json',
  products: 'products.json',
  orders: 'orders.json',
  orderItems: 'order-items.json',
  admins: 'admins.json',
  siteconfig: 'siteconfig.json',
  deliveryZones: 'delivery-zones.json',
  customers: 'customers.json',
  reviews: 'reviews.json',
  variantGroups: 'variant-groups.json',
  variantOptions: 'variant-options.json',
  combinations: 'combinations.json',
  productExtras: 'product-extras.json',
  wholesaleTiers: 'wholesale-tiers.json',
} as const;

/** Detecta si estamos en Cloudflare Workers (sin fs disponible). */
const isCloudflare = typeof (globalThis as Record<string, unknown>).caches !== 'undefined'
  && typeof (globalThis as Record<string, unknown>).MINIFLARE !== 'undefined'
  || typeof (globalThis as Record<string, unknown>).CLOUDFLARE !== 'undefined';

/** Obtiene el binding de KV si está disponible. */
function getKV(): KVNamespace | null {
  try {
    // En Cloudflare Workers, el binding está disponible como global
    const env = (globalThis as Record<string, unknown>).process?.env || {};
    if (env.DB && typeof (env.DB as KVNamespace).get === 'function') {
      return env.DB as KVNamespace;
    }
    // También puede estar como global directamente
    const globalDB = (globalThis as Record<string, unknown>).DB;
    if (globalDB && typeof (globalDB as KVNamespace).get === 'function') {
      return globalDB as KVNamespace;
    }
  } catch { /* ignore */ }
  return null;
}

/** Lee una colección desde JSON o KV. */
async function readJson<T>(fileName: string): Promise<T | null> {
  // Intentar KV primero (si está disponible)
  const kv = getKV();
  if (kv) {
    try {
      const raw = await kv.get(fileName.replace('.json', ''));
      if (raw) return JSON.parse(raw) as T;
      return null;
    } catch {
      return null;
    }
  }
  // Fallback a JSON files
  try {
    const filePath = path.join(DATA_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Escribe una colección a JSON o KV. */
async function writeJson<T>(fileName: string, data: T): Promise<void> {
  // Intentar KV primero (si está disponible)
  const kv = getKV();
  if (kv) {
    try {
      await kv.put(fileName.replace('.json', ''), JSON.stringify(data));
      return;
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[store] could not persist to KV ${fileName}:`, (err as Error).message);
      }
    }
    return;
  }
  // Fallback a JSON files
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Best-effort persistence — read-only filesystems will silently ignore writes.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[store] could not persist ${fileName}:`, (err as Error).message);
    }
  }
}

// ============================================================================
// Seed data (matches prisma/seed.ts exactly — 9 categories, 41 products, site config, default admin)
// ============================================================================

const SEED_SITE_CONFIG: SiteConfig = {
  id: 'site',
  storeName: 'Díaz Premium Envíos',
  tagline: 'Calidad y confianza en cada envío.',
  logo: '/logo-real.webp',
  cover: '/products/cover-real.webp',
  phone: '+5363169968',
  whatsappNumber: '+5350782825',
  address: 'Ciego de Ávila, Cuba.',
  zelleEmail: 'pagos@diazpremium.com',
  zelleName: 'Diaz Premium Envios LLC',
  primaryColor: '#f59e0b',
  primaryColorDark: '#d97706',
  primaryColorLight: '#fef3c7',
  footerBgColor: '#111827',
  footerTextColor: '#d1d5db',
  footerAccentColor: '#f59e0b',
  themeId: 'diaz-premium',
  themeData: '',
  homeSectionsOrder: 'hero,benefits,offers,catalog,howItWorks,schedule,promoBanner,socialStats',
  homeSectionsEnabled: '{"hero":true,"benefits":true,"offers":true,"catalog":true,"howItWorks":true,"schedule":true,"scheduleDetailed":false,"promoBanner":true,"socialStats":true}',
  offersCarousel: '{"enabled":true,"title":"🔥 Ofertas Destacadas","subtitle":"Aprovecha los mejores precios por tiempo limitado","productIds":[],"backgroundColor":"","textColor":""}',
  savedThemes: '[]',
  zelleEnabled: true,
  freeShippingEnabled: true,
  customerRegistrationEnabled: true,
  customerLoginEnabled: true,
  tickerEnabled: true,
  catalogLayout: 'categories',
  freeShippingMin: 100,
  minOrderAmount: 10,
  shippingCost: 9.99,
  scheduleLunes: '15:00 - 18:00',
  scheduleMartes: '15:00 - 18:00',
  scheduleMiercoles: '15:00 - 18:00',
  scheduleJueves: '15:00 - 18:00',
  scheduleViernes: '15:00 - 18:00',
  scheduleSabado: '15:00 - 18:00',
  scheduleDomingo: '15:00 - 18:00',
  asapSurchargeType: 'fixed',
  asapSurchargeValue: 5,
  normalSchedule: '15:00 - 18:00',
  activeCountries: 'US,CU',
  tickerItems: JSON.stringify([
    '🕐 Pedidos 24/7',
    '🚚 Entregas diarias de 3:00 pm a 6:00 pm',
    '⚡ Envío rápido por costo adicional',
    '📍 Entrega rápida en Ciego de Ávila, Cuba',
  ]),
  horarioSectionTitle: 'Pide cuando quieras, recíbelo en casa',
  horarioSectionDesc: 'Tres cosas que debes saber sobre cómo trabajamos para que tu compra llegue siempre a tiempo.',
  horarioCards: JSON.stringify([
    { icon: '🕐', title: 'Pedidos 24/7', description: 'El sitio está disponible para recibir tus pedidos las **24 horas**, los **7 días** de la semana.', color: 'blue' },
    { icon: '🚚', title: 'Entregas de 3:00 pm a 6:00 pm', description: 'Horario normal de entrega en Cuba, todos los días. Recíbelo cómodamente en tu casa.', color: 'emerald' },
    { icon: '⚡', title: 'Envío rápido opcional', description: '¿Necesitas urgencia? Solicita entrega prioritaria por un costo adicional y recíbelo antes.', color: 'purple' },
  ]),
  socialLinks: JSON.stringify([
    { platform: 'WhatsApp', url: 'https://wa.me/5350782825', icon: 'whatsapp', visible: true },
    { platform: 'Facebook', url: '#', icon: 'facebook', visible: true },
    { platform: 'Instagram', url: '#', icon: 'instagram', visible: true },
    { platform: 'Telegram', url: '#', icon: 'telegram', visible: false },
    { platform: 'TikTok', url: '#', icon: 'tiktok', visible: false },
  ]),
  trustBadges: JSON.stringify([
    { icon: '🔒', text: 'Pago seguro con Zelle', visible: true },
    { icon: '🛡️', text: 'Datos protegidos', visible: true },
    { icon: '🚚', text: 'Entrega garantizada', visible: true },
    { icon: '🌎', text: 'Compra desde cualquier país', visible: true },
  ]),
  socialStats: JSON.stringify([
    { value: '2,500+', label: 'Pedidos entregados', visible: true },
    { value: '800+', label: 'Clientes satisfechos', visible: true },
    { value: 'Diarias', label: 'Entregas en Ciego de Ávila', visible: true },
    { value: '100%', label: 'Servicio confiable', visible: true },
  ]),
  testimonials: JSON.stringify([
    { name: 'María González', location: 'Miami, USA', text: 'Pude enviarle alimentos a mi mamá en Ciego de Ávila de forma rapidísima. El servicio es excelente y muy confiable.', rating: 5, visible: true },
    { name: 'Carlos Pérez', location: 'Madrid, España', text: 'La mejor opción para enviar a Cuba. Los productos llegaron en perfectas condiciones y el pago fue muy fácil.', rating: 5, visible: true },
    { name: 'Ana Rodríguez', location: 'Ciego de Ávila, Cuba', text: 'Recibí todo en la puerta de mi casa. La atención fue excelente y los productos de muy buena calidad.', rating: 5, visible: true },
  ]),
  homeBenefits: JSON.stringify([
    { icon: 'shield', title: 'Pago seguro', desc: 'Tus transacciones protegidas', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: 'truck', title: 'Entrega garantizada', desc: 'Llegamos a tu puerta', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: 'globe', title: 'Compra desde cualquier país', desc: 'Entregamos en Cuba', color: 'text-brand-dark', bg: 'bg-brand-light' },
    { icon: 'heart', title: 'Atención personalizada', desc: 'Estamos para ayudarte', color: 'text-rose-600', bg: 'bg-rose-50' },
  ]),
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const SEED_CATEGORIES: Category[] = [
  { name: 'Oferta Especial', slug: 'oferta-especial', icon: '🍱', image: '/categories/oferta-especial.webp', order: 0 },
  { name: 'Alimentos Elaborados y Repostería', slug: 'alimentos-reposteria', icon: '🍕', image: '/categories/alimentos-reposteria.webp', order: 1 },
  { name: 'Confituras', slug: 'confituras', icon: '🍪', image: '/categories/confituras.webp', order: 2 },
  { name: 'Productos Lácteos y Bebidas', slug: 'lacteos-bebidas', icon: '🍨', image: '/categories/lacteos-bebidas.webp', order: 3 },
  { name: 'Platos Fuertes y Cárnicos', slug: 'platos-fuertes', icon: '🥩', image: '/categories/platos-fuertes.webp', order: 4 },
  { name: 'Granos y Pastas', slug: 'granos-pastas', icon: '🍚', image: '/categories/granos-pastas.webp', order: 5 },
  { name: 'Enlatados y Conservas', slug: 'enlatados', icon: '🥫', image: '/categories/enlatados.webp', order: 6 },
  { name: 'Aseo Personal', slug: 'aseo-personal', icon: '🧼', image: '/categories/aseo-personal.webp', order: 7 },
  { name: 'Electrodomésticos', slug: 'electrodomesticos', icon: '🔋', image: '/categories/electrodomesticos.webp', order: 8 },
].map((c, i) => ({
  id: `seed-cat-${i}`,
  name: c.name,
  slug: c.slug,
  icon: c.icon,
  image: c.image,
  order: c.order,
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}));

interface SeedProduct {
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  order: number;
}

const SEED_PRODUCTS_RAW: SeedProduct[] = [
  // Oferta Especial
  { name: 'Oferta Especial Día de las Madres', description: 'Sorprende a mamá este 10 de mayo con nuestra oferta especial. Un paquete completo con los mejores productos para consentirla como se merece.', price: 39.00, image: '/products/prod-00.webp', categoryId: 'seed-cat-0', rating: 5, reviewCount: 12, stock: 20, featured: true, order: 0 },
  // Alimentos Elaborados y Repostería
  { name: 'Brazo Gitano', description: 'Déjate seducir por esta tentación irresistible: nuestro Brazo Gitano, un bizcocho esponjoso enrollado con un suave y cremoso relleno. Perfecto para cualquier ocasión.', price: 6.00, image: '/products/prod-01.webp', categoryId: 'seed-cat-1', rating: 4.8, reviewCount: 34, stock: 15, featured: true, order: 0 },
  { name: '🥔 Papas Prefritas 2.5 kg', description: 'Deliciosas papas prefritas congeladas de corte clásico, listas para freír o al horno. Formato de 2.5 kg ideal para la familia.', price: 8.00, image: '/products/prod-02.webp', categoryId: 'seed-cat-1', rating: 4.5, reviewCount: 22, stock: 18, featured: false, order: 1 },
  { name: 'Gaceñiga', description: 'Nuestra Gaceñiga, conocida también como panqué, es una delicia horneada con textura suave y esponjosa. Ideal para el desayuno o la merienda.', price: 8.00, image: '/products/prod-03.webp', categoryId: 'seed-cat-1', rating: 4.6, reviewCount: 18, stock: 12, featured: false, order: 2 },
  { name: '🍮 Flan de leche entera', description: 'Delicioso postre elaborado con leche entera, con una textura suave y cremosa que se deshace en la boca. El clásico flan casero.', price: 7.00, image: '/products/prod-04.webp', categoryId: 'seed-cat-1', rating: 4.7, reviewCount: 28, stock: 10, featured: false, order: 3 },
  { name: '🥖 Paquete de panes (12 unidades)', description: 'Pack de 12 unidades de pan fresco, ideal para desayunos, meriendas y acompañamiento de comidas. Pan suave y delicioso.', price: 3.00, image: '/products/prod-05.webp', categoryId: 'seed-cat-1', rating: 4.3, reviewCount: 45, stock: 25, featured: false, order: 4 },
  { name: '🍪 Galletas de sal', description: 'Crujientes galletas de sal, perfectas para consumir solas o acompañadas. Snack ideal para cualquier momento del día.', price: 6.00, image: '/products/prod-06.webp', categoryId: 'seed-cat-1', rating: 4.2, reviewCount: 15, stock: 20, featured: false, order: 5 },
  { name: 'Mayonesa Vima', description: 'Deliciosa opción para complementar tus desayunos o el de los más pequeños de la casa. Mayonesa de calidad premium.', price: 4.00, image: '/products/prod-07.webp', categoryId: 'seed-cat-1', rating: 4.4, reviewCount: 20, stock: 16, featured: false, order: 6 },
  // Confituras
  { name: '🐸🍫 Sapitos de chocolate (Paquete de 20)', description: 'Pack que contiene 20 unidades de chocolates en forma de sapito. Divertidos y deliciosos, perfectos para los más pequeños.', price: 5.00, image: '/products/prod-08.webp', categoryId: 'seed-cat-2', rating: 4.9, reviewCount: 38, stock: 14, featured: true, order: 0 },
  { name: '🧈🍪 Galleticas Butter (8 paquetes)', description: 'Galletas de mantequilla con sabor suave y textura delicada. Pack de 8 paquetes para disfrutar en familia.', price: 3.00, image: '/products/prod-09.webp', categoryId: 'seed-cat-2', rating: 4.3, reviewCount: 22, stock: 22, featured: false, order: 1 },
  { name: '🍫🍪 Galleticas de chocolate (12 paquetes)', description: 'Deliciosas galleticas con sabor a chocolate. El formato de 12 paquetes es perfecto para compartir o tener en la despensa.', price: 4.00, image: '/products/prod-10.webp', categoryId: 'seed-cat-2', rating: 4.5, reviewCount: 30, stock: 19, featured: false, order: 2 },
  // Productos Lácteos y Bebidas
  { name: 'Yogurt 2 lt', description: 'Envase sellado de 2 litros de yogurt probiótico azucarado, cremoso y refrescante. Ideal para toda la familia.', price: 7.00, image: '/products/prod-11.webp', categoryId: 'seed-cat-3', rating: 4.4, reviewCount: 25, stock: 11, featured: false, order: 0 },
  { name: 'Crema (Leche) Evaporada Nezka 354 ml', description: 'Añada una textura rica y cremosa a sus platos favoritos con esta leche evaporada Nezka de 354 ml. Versátil en la cocina.', price: 3.00, image: '/products/prod-12.webp', categoryId: 'seed-cat-3', rating: 4.2, reviewCount: 14, stock: 20, featured: false, order: 1 },
  { name: 'Queso Gouda 3.2 kg', description: 'Este delicioso queso Gouda de la marca Vima Foods destaca por su sabor suave y cremoso. Formato grande de 3.2 kg.', price: 35.00, image: '/products/prod-13.webp', categoryId: 'seed-cat-3', rating: 4.8, reviewCount: 42, stock: 5, featured: true, order: 2 },
  { name: '🥛 Leche en polvo (900 gr)', description: 'Bolsa de 900 gramos de leche en polvo de alta calidad, ideal para preparar leche fresca en cualquier momento.', price: 10.00, image: '/products/prod-14.webp', categoryId: 'seed-cat-3', rating: 4.7, reviewCount: 55, stock: 8, featured: true, order: 3 },
  { name: '🍨 Helado (4 litros)', description: 'Tina de helado cremoso de 4 litros. El postre perfecto para compartir en familia los días calurosos.', price: 10.00, image: '/products/prod-15.webp', categoryId: 'seed-cat-3', rating: 4.6, reviewCount: 33, stock: 7, featured: false, order: 4 },
  { name: 'Pack de Seis Jugos Marca Fresko', description: 'Este Pack de 6 Jugos Fresko es la medida perfecta para acompañar tus comidas o refrescarte en cualquier momento.', price: 6.00, image: '/products/prod-16.webp', categoryId: 'seed-cat-3', rating: 4.3, reviewCount: 19, stock: 24, featured: false, order: 5 },
  { name: 'Caja de Jugos Marca Fresko', description: 'Esta Caja de 24 Jugos Fresko es la opción ideal para compartir en reuniones, fiestas o simplemente tener en casa.', price: 22.00, image: '/products/prod-17.webp', categoryId: 'seed-cat-3', rating: 4.4, reviewCount: 27, stock: 10, featured: false, order: 6 },
  // Platos Fuertes y Cárnicos
  { name: 'Paquete de 3 Kg de Salchichas', description: 'Lleva a tu mesa la calidad y el sabor que tu familia merece con este paquete de 3 kg de salchichas premium.', price: 12.00, image: '/products/prod-18.webp', categoryId: 'seed-cat-4', rating: 4.5, reviewCount: 35, stock: 9, featured: true, order: 0 },
  { name: '🥚 Cartón de huevos', description: 'Cartón fresco de huevos, un alimento básico y versátil en cualquier cocina. Fuente de proteína de alta calidad.', price: 10.00, image: '/products/prod-19.webp', categoryId: 'seed-cat-4', rating: 4.6, reviewCount: 48, stock: 15, featured: false, order: 1 },
  { name: '🍗 Picadillo de pollo 400 Gramos', description: 'Este Picadillo de Pollo Multiuso de la marca Gui Bon es la opción práctica para preparar comidas rápidas y nutritivas.', price: 2.00, image: '/products/prod-20.webp', categoryId: 'seed-cat-4', rating: 4.1, reviewCount: 12, stock: 30, featured: false, order: 2 },
  { name: '🥓 Mortadela (1 kg)', description: 'Tubo de 1 kilogramo de mortadela fresca, ideal para sándwiches, meriendas y comidas rápidas.', price: 6.00, image: '/products/prod-21.webp', categoryId: 'seed-cat-4', rating: 4.3, reviewCount: 23, stock: 14, featured: false, order: 3 },
  { name: '🥫 Carne de res enlatada (400 gr)', description: 'Lata de 400 gramos de carne de res, conservada para mantener su frescura y sabor. Práctica y lista para consumir.', price: 3.00, image: '/products/prod-22.webp', categoryId: 'seed-cat-4', rating: 4.2, reviewCount: 16, stock: 25, featured: false, order: 4 },
  { name: '🥩 Lomo de cerdo deshuesado', description: 'Paquete de lomo de cerdo sin hueso, con un peso aproximado. Carne fresca y de calidad para preparar deliciosos platos.', price: 3.50, image: '/products/prod-23.webp', categoryId: 'seed-cat-4', rating: 4.4, reviewCount: 20, stock: 12, featured: false, order: 5 },
  // Granos y Pastas
  { name: 'Paquete de Azúcar Blanca 1 Kg Energy', description: 'Este paquete de 1 kg de azúcar blanca de la marca Energy es un producto esencial en toda cocina.', price: 3.00, image: '/products/prod-24.webp', categoryId: 'seed-cat-5', rating: 4.1, reviewCount: 18, stock: 35, featured: false, order: 0 },
  { name: 'Paquete de Sal 454 Gramos', description: 'Esta Sal Refinada Yodada de la marca Pahoy es un producto básico e indispensable para la preparación de alimentos.', price: 2.00, image: '/products/prod-25.webp', categoryId: 'seed-cat-5', rating: 4.0, reviewCount: 10, stock: 40, featured: false, order: 1 },
  { name: '🍚 Arroz importado (1 kg)', description: 'Paquete de 1 kilogramo de arroz importado de grano largo y suave. Un acompañamiento esencial en la mesa cubana.', price: 3.00, image: '/products/prod-26.webp', categoryId: 'seed-cat-5', rating: 4.5, reviewCount: 52, stock: 30, featured: true, order: 2 },
  { name: '🍲 Frijoles (1 kg)', description: 'Bolsa de 1 kilogramo de frijoles seleccionados, un alimento básico en la cocina cubana. Alta calidad y sabor.', price: 3.00, image: '/products/prod-27.webp', categoryId: 'seed-cat-5', rating: 4.4, reviewCount: 38, stock: 28, featured: false, order: 3 },
  { name: '🍝 Paquete de Espaguetis Lucy', description: 'Este Espagueti Lucy de calidad premium es la base perfecta para platos de pasta deliciosos y reconfortantes.', price: 2.00, image: '/products/prod-28.webp', categoryId: 'seed-cat-5', rating: 4.2, reviewCount: 15, stock: 32, featured: false, order: 4 },
  { name: '🍲 Coditos (500 gr)', description: 'Paquete de 500 gramos de pasta tipo coditos, excelente para sopas, ensaladas y platos tradicionales.', price: 2.00, image: '/products/prod-29.webp', categoryId: 'seed-cat-5', rating: 4.1, reviewCount: 11, stock: 26, featured: false, order: 5 },
  { name: '☕️ Café 250 gr', description: 'Café puro y de excelente aceptación al paladar, un producto que no puede faltar en tu hogar. 250 gramos de sabor intenso.', price: 6.00, image: '/products/prod-30.webp', categoryId: 'seed-cat-5', rating: 4.8, reviewCount: 65, stock: 18, featured: true, order: 6 },
  // Enlatados y Conservas
  { name: 'Aceite 900 ml', description: 'Aceite vegetal refinado, muy utilizado en la cocina para freír, guisar y preparar todo tipo de alimentos.', price: 4.00, image: '/products/prod-31.webp', categoryId: 'seed-cat-6', rating: 4.3, reviewCount: 22, stock: 20, featured: false, order: 0 },
  { name: '🍺 Malta Bucanero (Caja)', description: 'Caja de Malta Bucanero, reconocida por su sabor intenso y refrescante. La bebida preferida de los cubanos.', price: 24.00, image: '/products/prod-32.webp', categoryId: 'seed-cat-6', rating: 4.7, reviewCount: 44, stock: 6, featured: true, order: 1 },
  { name: 'Sardinas en tomate 155 gr', description: 'Sabor distinguido el de estas deliciosas sardinas en salsa de tomate. Lata de 155 gramos lista para disfrutar.', price: 2.00, image: '/products/prod-33.webp', categoryId: 'seed-cat-6', rating: 4.2, reviewCount: 14, stock: 30, featured: false, order: 2 },
  { name: '🥛 Leche condensada', description: 'Lata de leche condensada cremosa, el complemento ideal para postres, café y muchas recetas más.', price: 3.00, image: '/products/prod-34.webp', categoryId: 'seed-cat-6', rating: 4.5, reviewCount: 36, stock: 22, featured: false, order: 3 },
  { name: '🥫 Pasta de tomate Vima (3 kg)', description: 'Formato grande de 3 kilogramos de pasta de tomate Vima. Ideal para restaurantes o familias grandes.', price: 12.00, image: '/products/prod-35.webp', categoryId: 'seed-cat-6', rating: 4.6, reviewCount: 28, stock: 10, featured: false, order: 4 },
  { name: '🥫 Pasta de tomate (400 gr)', description: 'Lata de 400 gramos de pasta de tomate concentrada, base esencial para salsas, guisos y muchas recetas.', price: 3.00, image: '/products/prod-36.webp', categoryId: 'seed-cat-6', rating: 4.3, reviewCount: 19, stock: 25, featured: false, order: 5 },
  { name: '🥥 Coco rallado en almíbar (3.5 kg)', description: 'Lata de 3.5 kilogramos de dulce de coco rallado en almíbar. Un postre tradicional y delicioso.', price: 12.00, image: '/products/prod-37.webp', categoryId: 'seed-cat-6', rating: 4.4, reviewCount: 17, stock: 8, featured: false, order: 6 },
  // Aseo Personal
  { name: 'Pasta Dental Colgate', description: 'Esta pasta dental Colgate Triple Acción de 140 g ofrece protección completa para tus dientes y encías.', price: 2.00, image: '/products/prod-38.webp', categoryId: 'seed-cat-7', rating: 4.3, reviewCount: 24, stock: 35, featured: false, order: 0 },
  { name: 'Paquete de 12 Royos de Papel Sanitario', description: 'Una oferta especial para abastecer tu hogar de este producto indispensable. 12 rollos de papel sanitario suave y resistente.', price: 6.00, image: '/products/prod-39.webp', categoryId: 'seed-cat-7', rating: 4.2, reviewCount: 20, stock: 28, featured: false, order: 1 },
  // Electrodomésticos
  { name: '🌬️ Ventilador recargable 20,000 mAh', description: 'Ventilador de larga duración con batería de 20,000 mAh. Perfecto para los apagones, con múltiples velocidades y luz LED.', price: 65.00, image: '/products/prod-40.webp', categoryId: 'seed-cat-8', rating: 4.7, reviewCount: 56, stock: 4, featured: true, order: 0 },
];

const SEED_PRODUCTS: Product[] = SEED_PRODUCTS_RAW.map((p, i) => ({
  id: `seed-prod-${i}`,
  name: p.name,
  shortName: '',
  description: p.description,
  sku: `PROD-${String(i + 1).padStart(3, '0')}`,
  price: p.price,
  image: p.image,
  images: '[]',
  tags: '[]',
  categoryId: p.categoryId,
  rating: p.rating,
  reviewCount: p.reviewCount,
  stock: p.stock,
  featured: p.featured,
  order: p.order,
  // SIGECOS: unidad y código
  saleUnit: 'unidad',
  barcode: '',
  // SIGECOS: tipo y estado
  productType: 'elaborado',
  status: 'active',
  // SIGECOS: disponibilidad
  posAvailable: true,
  tiendaAvailable: true,
  // SIGECOS: anticipo
  advanceType: 'sin',
  advanceValue: 0,
  minHours: 24,
  minHoursUnit: 'horas',
  // SIGECOS: costos (admin only)
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
  // Earlier products get later createdAt so orderBy:desc preserves seed order
  createdAt: new Date(Date.UTC(2024, 0, 1) - i * 1000).toISOString(),
  updatedAt: '2024-01-01T00:00:00.000Z',
}));

const SEED_ADMINS: Admin[] = [
  {
    id: 'seed-admin-0',
    username: 'admin',
    password: 'diaz2024',
    name: 'Admin',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const SEED_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'seed-zone-ciego-avila',
    name: 'Ciego de Ávila (Ciudad)',
    description: 'Entrega dentro del casco urbano de Ciego de Ávila y municipios cercanos (Majagua, Ceballos, Punta Alegre).',
    price: 5.00,
    estimatedTime: 'Mismo día',
    active: true,
    order: 0,
    allowsPriorityDelivery: true,
    asapSurchargeOverride: false,
    asapSurchargeType: 'fixed',
    asapSurchargeValue: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-zone-provincia',
    name: 'Provincia Ciego de Ávila (Resto)',
    description: 'Demás municipios de la provincia: Morón, Chambas, Florencia, Primero de Enero, Venezuela, Baraguá, Bolivia.',
    price: 10.00,
    estimatedTime: '1-2 días',
    active: true,
    order: 1,
    allowsPriorityDelivery: false,
    asapSurchargeOverride: false,
    asapSurchargeType: 'fixed',
    asapSurchargeValue: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-zone-otras-provincias',
    name: 'Otras provincias (Camagüey, Sancti Spíritus, Villa Clara)',
    description: 'Envíos a provincias vecinas coordinados por vía terrestre.',
    price: 20.00,
    estimatedTime: '2-3 días',
    active: true,
    order: 2,
    allowsPriorityDelivery: false,
    asapSurchargeOverride: false,
    asapSurchargeType: 'fixed',
    asapSurchargeValue: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

// ============================================================================
// In-memory store state
// ============================================================================

interface StoreState {
  categories: Category[];
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  admins: Admin[];
  siteConfig: SiteConfig | null;
  deliveryZones: DeliveryZone[];
  customers: Customer[];
  reviews: Review[];
  variantGroups: VariantGroup[];
  variantOptions: VariantOption[];
  combinations: ProductCombination[];
  productExtras: ProductExtra[];
  wholesaleTiers: WholesaleTier[];
}

const state: StoreState = {
  categories: [],
  products: [],
  orders: [],
  orderItems: [],
  admins: [],
  siteConfig: null,
  deliveryZones: [],
  customers: [],
  reviews: [],
  variantGroups: [],
  variantOptions: [],
  combinations: [],
  productExtras: [],
  wholesaleTiers: [],
};

let initPromise: Promise<void> | null = null;
let initialized = false;

/**
 * En desarrollo, cada ruta de Next.js (Turbopack) tiene su propia instancia del
 * módulo store. Para que los writes de una ruta (ej. POST /api/admin/products)
 * sean visibles en otra (ej. GET /api/products/[id]), releemos del disco cuando
 * el mtime del archivo cambió. Esta tabla registra el último mtime leído por
 * archivo. En producción, todas las rutas comparten instancia y esto es un no-op.
 */
const lastReadByFile: Record<string, number> = {};

async function initialize(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      const [categories, products, orders, orderItems, admins, siteConfig, deliveryZones, customers, reviews, variantGroups, variantOptions, combinations, productExtras, wholesaleTiers] = await Promise.all([
        readJson<Category[]>(FILE_NAMES.categories),
        readJson<Product[]>(FILE_NAMES.products),
        readJson<Order[]>(FILE_NAMES.orders),
        readJson<OrderItem[]>(FILE_NAMES.orderItems),
        readJson<Admin[]>(FILE_NAMES.admins),
        readJson<SiteConfig>(FILE_NAMES.siteconfig),
        readJson<DeliveryZone[]>(FILE_NAMES.deliveryZones),
        readJson<Customer[]>(FILE_NAMES.customers),
        readJson<Review[]>(FILE_NAMES.reviews),
        readJson<VariantGroup[]>(FILE_NAMES.variantGroups),
        readJson<VariantOption[]>(FILE_NAMES.variantOptions),
        readJson<ProductCombination[]>(FILE_NAMES.combinations),
        readJson<ProductExtra[]>(FILE_NAMES.productExtras),
        readJson<WholesaleTier[]>(FILE_NAMES.wholesaleTiers),
      ]);

      state.categories = categories ?? SEED_CATEGORIES;
      state.products = products ?? SEED_PRODUCTS;
      state.orders = orders ?? [];
      state.orderItems = orderItems ?? [];
      state.admins = admins ?? SEED_ADMINS;
      state.siteConfig = siteConfig ?? SEED_SITE_CONFIG;
      state.deliveryZones = deliveryZones ?? SEED_DELIVERY_ZONES;
      state.customers = customers ?? [];
      state.reviews = reviews ?? [];
      state.variantGroups = variantGroups ?? [];
      state.variantOptions = variantOptions ?? [];
      state.combinations = combinations ?? [];
      state.productExtras = productExtras ?? [];
      state.wholesaleTiers = wholesaleTiers ?? [];

      // Best-effort: persist seed files if they didn't exist on disk.
      if (!categories) void writeJson(FILE_NAMES.categories, state.categories);
      if (!products) void writeJson(FILE_NAMES.products, state.products);
      if (!orders) void writeJson(FILE_NAMES.orders, state.orders);
      if (!orderItems) void writeJson(FILE_NAMES.orderItems, state.orderItems);
      if (!admins) void writeJson(FILE_NAMES.admins, state.admins);
      if (!siteConfig) void writeJson(FILE_NAMES.siteconfig, state.siteConfig);
      if (!deliveryZones) void writeJson(FILE_NAMES.deliveryZones, state.deliveryZones);
      if (!customers) void writeJson(FILE_NAMES.customers, state.customers);
      if (!reviews) void writeJson(FILE_NAMES.reviews, state.reviews);
      if (!variantGroups) void writeJson(FILE_NAMES.variantGroups, state.variantGroups);
      if (!variantOptions) void writeJson(FILE_NAMES.variantOptions, state.variantOptions);
      if (!combinations) void writeJson(FILE_NAMES.combinations, state.combinations);
      if (!productExtras) void writeJson(FILE_NAMES.productExtras, state.productExtras);
      if (!wholesaleTiers) void writeJson(FILE_NAMES.wholesaleTiers, state.wholesaleTiers);

      // Registrar mtimes actuales para evitar re-leer innecesariamente.
      for (const fname of Object.values(FILE_NAMES)) {
        try {
          const stat = await fs.stat(path.join(DATA_DIR, fname));
          lastReadByFile[fname] = stat.mtimeMs;
        } catch {
          /* file may not exist */
        }
      }

      initialized = true;
    })();
  }
  await initPromise;
}

// Ensure initialization happens on module load (best-effort, non-blocking).
void initialize();

// ============================================================================
// Repository implementation — supports the Prisma subset used by the routes
// ============================================================================

type ModelName = 'category' | 'product' | 'order' | 'orderItem' | 'admin' | 'siteConfig' | 'deliveryZone' | 'customer' | 'review' | 'variantGroup' | 'variantOption' | 'combination' | 'productExtra' | 'wholesaleTier';

interface FindManyArgs {
  where?: WhereInput;
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, string>;
  include?: IncludeShape;
  take?: number;
  skip?: number;
}

interface FindUniqueArgs {
  where: WhereInput;
  include?: IncludeShape;
}

interface FindFirstArgs {
  where?: WhereInput;
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, string>;
  include?: IncludeShape;
}

interface CreateArgs {
  data: Record<string, unknown>;
  include?: IncludeShape;
}

interface UpdateArgs {
  where: WhereInput;
  data: Record<string, unknown>;
  include?: IncludeShape;
}

interface DeleteArgs {
  where: WhereInput;
}

interface DeleteManyArgs {
  where?: WhereInput;
}

interface UpsertArgs {
  where: WhereInput;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
  include?: IncludeShape;
}

interface CountArgs {
  where?: WhereInput;
}

function createRepository<T>(
  model: ModelName,
  defaults: Partial<T>,
  idPrefix: string
) {
  const fileName = ({
    category: FILE_NAMES.categories,
    product: FILE_NAMES.products,
    order: FILE_NAMES.orders,
    orderItem: FILE_NAMES.orderItems,
    admin: FILE_NAMES.admins,
    siteConfig: FILE_NAMES.siteconfig,
    deliveryZone: FILE_NAMES.deliveryZones,
    customer: FILE_NAMES.customers,
    review: FILE_NAMES.reviews,
    variantGroup: FILE_NAMES.variantGroups,
    variantOption: FILE_NAMES.variantOptions,
    combination: FILE_NAMES.combinations,
    productExtra: FILE_NAMES.productExtras,
    wholesaleTier: FILE_NAMES.wholesaleTiers,
  } as const)[model];

  function getCollection(): T[] {
    switch (model) {
      case 'category':
        return state.categories as unknown as T[];
      case 'product':
        return state.products as unknown as T[];
      case 'order':
        return state.orders as unknown as T[];
      case 'orderItem':
        return state.orderItems as unknown as T[];
      case 'admin':
        return state.admins as unknown as T[];
      case 'siteConfig':
        return (state.siteConfig ? [state.siteConfig] : []) as unknown as T[];
      case 'deliveryZone':
        return state.deliveryZones as unknown as T[];
      case 'customer':
        return state.customers as unknown as T[];
      case 'review':
        return state.reviews as unknown as T[];
      case 'variantGroup':
        return state.variantGroups as unknown as T[];
      case 'variantOption':
        return state.variantOptions as unknown as T[];
      case 'combination':
        return state.combinations as unknown as T[];
      case 'productExtra':
        return state.productExtras as unknown as T[];
      case 'wholesaleTier':
        return state.wholesaleTiers as unknown as T[];
    }
  }

  function setCollection(items: T[]): void {
    switch (model) {
      case 'category':
        state.categories = items as unknown as Category[];
        break;
      case 'product':
        state.products = items as unknown as Product[];
        break;
      case 'order':
        state.orders = items as unknown as Order[];
        break;
      case 'orderItem':
        state.orderItems = items as unknown as OrderItem[];
        break;
      case 'admin':
        state.admins = items as unknown as Admin[];
        break;
      case 'siteConfig':
        // siteConfig se guarda como objeto único en disco, pero otros
        // callers pueden pasar un array. Aceptamos ambos.
        state.siteConfig = (Array.isArray(items)
          ? (items[0] as unknown as SiteConfig)
          : (items as unknown as SiteConfig)) ?? null;
        break;
      case 'deliveryZone':
        state.deliveryZones = items as unknown as DeliveryZone[];
        break;
      case 'customer':
        state.customers = items as unknown as Customer[];
        break;
      case 'review':
        state.reviews = items as unknown as Review[];
        break;
      case 'variantGroup':
        state.variantGroups = items as unknown as VariantGroup[];
        break;
      case 'variantOption':
        state.variantOptions = items as unknown as VariantOption[];
        break;
      case 'combination':
        state.combinations = items as unknown as ProductCombination[];
        break;
      case 'productExtra':
        state.productExtras = items as unknown as ProductExtra[];
        break;
      case 'wholesaleTier':
        state.wholesaleTiers = items as unknown as WholesaleTier[];
        break;
    }
  }

  async function ensureReady(): Promise<void> {
    if (!initialized) await initialize();
    await maybeRefreshFromDisk();
  }

  /**
   * En desarrollo (Turbopack bundlea cada ruta por separado y cada una tiene su
   * propia instancia del store), los writes de una ruta no se ven en otra hasta
   * que se recompila. Para mitigar esto, releemos del disco si el archivo fue
   * modificado después de la última lectura. En producción esto es un no-op
   * porque todas las rutas comparten la misma instancia.
   */
  async function maybeRefreshFromDisk(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const filePath = path.join(DATA_DIR, fileName);
        const stat = await fs.stat(filePath);
        const mtime = stat.mtimeMs;
        const lastRead = lastReadByFile[fileName] || 0;
        if (mtime > lastRead) {
          lastReadByFile[fileName] = mtime;
          // siteConfig se guarda como objeto único, no como array.
          // Los demás modelos sí son arrays.
          if (model === 'siteConfig') {
            const fresh = await readJson<SiteConfig>(fileName);
            if (fresh) {
              state.siteConfig = fresh;
            }
          } else {
            const fresh = await readJson<T[]>(fileName);
            if (fresh) {
              setCollection(fresh);
            }
          }
        }
      } catch {
        /* file may not exist yet — ignore */
      }
    }
  }

  function persist(): void {
    void writeJson(fileName, getCollection());
    // Marcar el archivo como "recién leído" para evitar re-leer del disco
    // nuestro propio write en el siguiente maybeRefreshFromDisk.
    lastReadByFile[fileName] = Date.now();
  }

  function getIncludeContext() {
    return {
      categories: state.categories,
      products: state.products,
      orderItems: state.orderItems,
    };
  }

  return {
    async findMany(args: FindManyArgs = {}): Promise<Resolved<T>[]> {
      await ensureReady();
      let items = getCollection();
      items = items.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, args.where));
      items = applySorting(items, args.orderBy as Record<string, string> | undefined);
      if (args.skip) items = items.slice(args.skip);
      if (args.take !== undefined) items = items.slice(0, args.take);
      return items.map((item) => resolveInclude(item, args.include, getIncludeContext()));
    },

    async findUnique(args: FindUniqueArgs): Promise<Resolved<T> | null> {
      await ensureReady();
      const items = getCollection();
      const found = items.find((item) => matchesWhere(item as unknown as Record<string, unknown>, args.where));
      if (!found) return null;
      return resolveInclude(found, args.include, getIncludeContext());
    },

    async findFirst(args: FindFirstArgs = {}): Promise<Resolved<T> | null> {
      await ensureReady();
      let items = getCollection();
      items = items.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, args.where));
      items = applySorting(items, args.orderBy as Record<string, string> | undefined);
      const found = items[0];
      if (!found) return null;
      return resolveInclude(found, args.include, getIncludeContext());
    },

    async create(args: CreateArgs): Promise<Resolved<T>> {
      await ensureReady();
      const now = nowISO();
      const data = args.data;
      const newItem: Record<string, unknown> = {
        ...defaults,
        ...data,
        id: data.id ?? generateId(idPrefix),
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };

      // Handle nested creates (e.g., order.items.create)
      if (model === 'order' && data.items && typeof data.items === 'object') {
        const itemsOp = (data.items as Record<string, unknown>).create;
        if (Array.isArray(itemsOp)) {
          const orderId = newItem.id as string;
          const newOrderItems: OrderItem[] = itemsOp.map((raw) => {
            const r = raw as Record<string, unknown>;
            return {
              id: generateId('oi'),
              orderId,
              productId: String(r.productId ?? ''),
              name: String(r.name ?? ''),
              price: Number(r.price ?? 0),
              quantity: Number(r.quantity ?? 1),
              image: String(r.image ?? ''),
            };
          });
          state.orderItems.push(...newOrderItems);
          void writeJson(FILE_NAMES.orderItems, state.orderItems);
        }
        // Don't store the relational directive on the order itself
        delete newItem.items;
      }

      if (model === 'siteConfig') {
        state.siteConfig = newItem as unknown as SiteConfig;
      } else {
        getCollection().push(newItem as T);
      }
      persist();
      return resolveInclude(newItem as T, args.include, getIncludeContext());
    },

    async update(args: UpdateArgs): Promise<Resolved<T>> {
      await ensureReady();
      if (model === 'siteConfig') {
        if (!state.siteConfig) {
          throw new Error('Record not found for update on siteConfig');
        }
        const updated = applyUpdate(state.siteConfig as unknown as Record<string, unknown>, {
          ...args.data,
          updatedAt: nowISO(),
        }) as unknown as SiteConfig;
        state.siteConfig = updated;
        void writeJson(FILE_NAMES.siteconfig, state.siteConfig);
        return resolveInclude(updated as unknown as T, args.include, getIncludeContext());
      }
      const collection = getCollection();
      const idx = collection.findIndex((item) => matchesWhere(item as unknown as Record<string, unknown>, args.where));
      if (idx === -1) {
        throw new Error(`Record not found for update on ${model}`);
      }
      const updated = applyUpdate(collection[idx] as unknown as Record<string, unknown>, {
        ...args.data,
        updatedAt: nowISO(),
      }) as T;
      collection[idx] = updated;
      persist();
      return resolveInclude(updated, args.include, getIncludeContext());
    },

    async upsert(args: UpsertArgs): Promise<Resolved<T>> {
      await ensureReady();
      if (model === 'siteConfig') {
        if (state.siteConfig) {
          const updated = applyUpdate(state.siteConfig as unknown as Record<string, unknown>, {
            ...args.update,
            updatedAt: nowISO(),
          }) as unknown as SiteConfig;
          state.siteConfig = updated;
          void writeJson(FILE_NAMES.siteconfig, state.siteConfig);
          return resolveInclude(updated as unknown as T, args.include, getIncludeContext());
        }
        const now = nowISO();
        const newItem: Record<string, unknown> = {
          ...defaults,
          ...args.create,
          id: args.create.id ?? generateId(idPrefix),
          createdAt: args.create.createdAt ?? now,
          updatedAt: args.create.updatedAt ?? now,
        };
        state.siteConfig = newItem as unknown as SiteConfig;
        void writeJson(FILE_NAMES.siteconfig, state.siteConfig);
        return resolveInclude(newItem as T, args.include, getIncludeContext());
      }
      const collection = getCollection();
      const idx = collection.findIndex((item) => matchesWhere(item as unknown as Record<string, unknown>, args.where));
      if (idx === -1) {
        const now = nowISO();
        const newItem: Record<string, unknown> = {
          ...defaults,
          ...args.create,
          id: args.create.id ?? generateId(idPrefix),
          createdAt: args.create.createdAt ?? now,
          updatedAt: args.create.updatedAt ?? now,
        };
        collection.push(newItem as T);
        persist();
        return resolveInclude(newItem as T, args.include, getIncludeContext());
      }
      const updated = applyUpdate(collection[idx] as unknown as Record<string, unknown>, {
        ...args.update,
        updatedAt: nowISO(),
      }) as T;
      collection[idx] = updated;
      persist();
      return resolveInclude(updated, args.include, getIncludeContext());
    },

    async delete(args: DeleteArgs): Promise<T> {
      await ensureReady();
      if (model === 'siteConfig') {
        const removed = state.siteConfig;
        state.siteConfig = null;
        void writeJson(FILE_NAMES.siteconfig, null);
        return removed as unknown as T;
      }
      const collection = getCollection();
      const idx = collection.findIndex((item) => matchesWhere(item as unknown as Record<string, unknown>, args.where));
      if (idx === -1) {
        throw new Error(`Record not found for delete on ${model}`);
      }
      const [removedItem] = collection.splice(idx, 1);
      setCollection(collection);
      persist();
      return removedItem;
    },

    async deleteMany(args: DeleteManyArgs = {}): Promise<{ count: number }> {
      await ensureReady();
      if (model === 'siteConfig') {
        if (matchesWhere(state.siteConfig as unknown as Record<string, unknown>, args.where)) {
          state.siteConfig = null;
          void writeJson(FILE_NAMES.siteconfig, null);
          return { count: 1 };
        }
        return { count: 0 };
      }
      const collection = getCollection();
      const toRemove = collection.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, args.where));
      const idsToRemove = new Set(toRemove.map((item) => (item as unknown as Record<string, unknown>).id));
      const remaining = collection.filter((item) => !idsToRemove.has((item as unknown as Record<string, unknown>).id));
      setCollection(remaining);
      persist();
      return { count: toRemove.length };
    },

    async count(args: CountArgs = {}): Promise<number> {
      await ensureReady();
      if (model === 'siteConfig') {
        const matches = matchesWhere(state.siteConfig as unknown as Record<string, unknown>, args.where);
        return matches ? 1 : 0;
      }
      const collection = getCollection();
      return collection.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, args.where)).length;
    },
  };
}

// ============================================================================
// Build the `db` object — matches Prisma Client surface used by routes
// ============================================================================

export const db = {
  category: createRepository<Category>('category', {
    icon: '📦',
    image: '',
    order: 0,
    active: true,
  } as Partial<Category>, 'cat'),
  product: createRepository<Product>('product', {
    shortName: '',
    sku: '',
    images: '[]',
    tags: '[]',
    rating: 0,
    reviewCount: 0,
    stock: 10,
    featured: false,
    order: 0,
    // SIGECOS
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
  } as Partial<Product>, 'prod'),
  order: createRepository<Order>('order', {
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    recipientCity: 'Ciego de Ávila',
    recipientNotes: '',
    deliveryZoneId: null,
    deliveryZoneName: null,
    deliveryZonePrice: 0,
    deliveryDate: null,
    deliveryTimeSlot: 'normal',
    deliverySurcharge: 0,
    shippingCost: 0,
    status: 'pending',
    isPaid: false,
  } as Partial<Order>, 'order'),
  orderItem: createRepository<OrderItem>('orderItem', {} as Partial<OrderItem>, 'oi'),
  admin: createRepository<Admin>('admin', {
    name: 'Admin',
  } as Partial<Admin>, 'admin'),
  siteConfig: createRepository<SiteConfig>('siteConfig', {
    id: 'site',
    storeName: 'Díaz Premium Envíos',
    tagline: 'Calidad y confianza en cada envío.',
    logo: '/logo-real.webp',
    cover: '/products/cover-real.webp',
    phone: '+5363169968',
    whatsappNumber: '+5350782825',
    address: 'Ciego de Ávila, Cuba.',
    zelleEmail: 'pagos@diazpremium.com',
    zelleName: 'Diaz Premium Envios LLC',
    primaryColor: '#f59e0b',
    primaryColorDark: '#d97706',
    primaryColorLight: '#fef3c7',
    footerBgColor: '#111827',
    footerTextColor: '#d1d5db',
    footerAccentColor: '#f59e0b',
    themeId: 'diaz-premium',
    themeData: '',
  homeSectionsOrder: 'hero,benefits,offers,catalog,howItWorks,schedule,promoBanner,socialStats',
  homeSectionsEnabled: '{"hero":true,"benefits":true,"offers":true,"catalog":true,"howItWorks":true,"schedule":true,"scheduleDetailed":false,"promoBanner":true,"socialStats":true}',
    freeShippingMin: 100,
    minOrderAmount: 10,
    shippingCost: 9.99,
    scheduleLunes: '15:00 - 18:00',
    scheduleMartes: '15:00 - 18:00',
    scheduleMiercoles: '15:00 - 18:00',
    scheduleJueves: '15:00 - 18:00',
    scheduleViernes: '15:00 - 18:00',
    scheduleSabado: '15:00 - 18:00',
    scheduleDomingo: '15:00 - 18:00',
    asapSurchargeType: 'fixed',
    asapSurchargeValue: 5,
    normalSchedule: '15:00 - 18:00',
    activeCountries: 'US,CU',
    tickerItems: JSON.stringify([
      '🕐 Pedidos 24/7',
      '🚚 Entregas diarias de 3:00 pm a 6:00 pm',
      '⚡ Envío rápido por costo adicional',
      '📍 Entrega rápida en Ciego de Ávila, Cuba',
    ]),
    horarioSectionTitle: 'Pide cuando quieras, recíbelo en casa',
    horarioSectionDesc: 'Tres cosas que debes saber sobre cómo trabajamos para que tu compra llegue siempre a tiempo.',
    horarioCards: JSON.stringify([
      { icon: '🕐', title: 'Pedidos 24/7', description: 'El sitio está disponible para recibir tus pedidos las **24 horas**, los **7 días** de la semana.', color: 'blue' },
      { icon: '🚚', title: 'Entregas de 3:00 pm a 6:00 pm', description: 'Horario normal de entrega en Cuba, todos los días. Recíbelo cómodamente en tu casa.', color: 'emerald' },
      { icon: '⚡', title: 'Envío rápido opcional', description: '¿Necesitas urgencia? Solicita entrega prioritaria por un costo adicional y recíbelo antes.', color: 'purple' },
    ]),
    socialLinks: JSON.stringify([
      { platform: 'WhatsApp', url: 'https://wa.me/5350782825', icon: 'whatsapp', visible: true },
      { platform: 'Facebook', url: '#', icon: 'facebook', visible: true },
      { platform: 'Instagram', url: '#', icon: 'instagram', visible: true },
    ]),
    trustBadges: JSON.stringify([
      { icon: '🔒', text: 'Pago seguro con Zelle', visible: true },
      { icon: '🛡️', text: 'Datos protegidos', visible: true },
      { icon: '🚚', text: 'Entrega garantizada', visible: true },
      { icon: '🌎', text: 'Compra desde cualquier país', visible: true },
    ]),
    socialStats: JSON.stringify([
      { value: '2,500+', label: 'Pedidos entregados' },
      { value: '800+', label: 'Clientes satisfechos' },
      { value: 'Diarias', label: 'Entregas en Ciego de Ávila' },
      { value: '100%', label: 'Servicio confiable' },
    ]),
    testimonials: JSON.stringify([
      { name: 'María González', location: 'Miami, USA', text: 'Pude enviarle alimentos a mi mamá en Ciego de Ávila de forma rapidísima. El servicio es excelente y muy confiable.', rating: 5 },
      { name: 'Carlos Pérez', location: 'Madrid, España', text: 'La mejor opción para enviar a Cuba. Los productos llegaron en perfectas condiciones y el pago fue muy fácil.', rating: 5 },
      { name: 'Ana Rodríguez', location: 'Ciego de Ávila, Cuba', text: 'Recibí todo en la puerta de mi casa. La atención fue excelente y los productos de muy buena calidad.', rating: 5 },
    ]),
    homeBenefits: JSON.stringify([
      { icon: 'shield', title: 'Pago seguro', desc: 'Tus transacciones protegidas', color: 'text-green-600', bg: 'bg-green-50' },
      { icon: 'truck', title: 'Entrega garantizada', desc: 'Llegamos a tu puerta', color: 'text-blue-600', bg: 'bg-blue-50' },
      { icon: 'globe', title: 'Compra desde cualquier país', desc: 'Entregamos en Cuba', color: 'text-brand-dark', bg: 'bg-brand-light' },
      { icon: 'heart', title: 'Atención personalizada', desc: 'Estamos para ayudarte', color: 'text-rose-600', bg: 'bg-rose-50' },
    ]),
  } as Partial<SiteConfig>, 'site'),
  deliveryZone: createRepository<DeliveryZone>('deliveryZone', {
    description: '',
    price: 0,
    estimatedTime: 'Mismo día',
    active: true,
    order: 0,
    allowsPriorityDelivery: false,
    asapSurchargeOverride: false,
    asapSurchargeType: 'fixed',
    asapSurchargeValue: 0,
  } as Partial<DeliveryZone>, 'zone'),
  customer: createRepository<Customer>('customer', {
    phone: '',
    passwordHash: '',
    country: 'US',
    address: '',
    deliveryZoneId: null,
    deliveryZoneName: null,
    savedRecipients: [],
  } as Partial<Customer>, 'cust'),
  review: createRepository<Review>('review', {
    productId: '',
    customerId: null,
    authorName: '',
    rating: 5,
    comment: '',
    status: 'pending',
    adminReply: '',
  } as Partial<Review>, 'rev'),
  variantGroup: createRepository<VariantGroup>('variantGroup', {
    productId: '',
    name: '',
    required: false,
    maxSelect: 1,
    isImageGroup: false,
    isDominant: false,
    sortOrder: 0,
  } as Partial<VariantGroup>, 'vg'),
  variantOption: createRepository<VariantOption>('variantOption', {
    groupId: '',
    name: '',
    priceMod: 0,
    image: '',
    stock: 0,
    available: true,
    sortOrder: 0,
  } as Partial<VariantOption>, 'vo'),
  combination: createRepository<ProductCombination>('combination', {
    productId: '',
    optionIds: '[]',
    sku: '',
    stock: 0,
    price: null,
    image: '',
    available: true,
    sortOrder: 0,
  } as Partial<ProductCombination>, 'cmb'),
  productExtra: createRepository<ProductExtra>('productExtra', {
    productId: '',
    name: '',
    description: '',
    priceMod: 0,
    required: false,
    sortOrder: 0,
  } as Partial<ProductExtra>, 'pex'),
  wholesaleTier: createRepository<WholesaleTier>('wholesaleTier', {
    productId: '',
    name: '',
    minQty: 0,
    maxQty: 0,
    price: 0,
    sortOrder: 0,
  } as Partial<WholesaleTier>, 'wt'),

  // Prisma disconnect is a no-op for the JSON store (kept for compatibility).
  async $disconnect(): Promise<void> {
    /* no-op */
  },
};

export type DB = typeof db;

