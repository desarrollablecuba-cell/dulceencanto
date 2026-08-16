/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SEMILLA — Dulce Encanto (repostería artesanal boutique)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Reemplaza todos los datos de la tienda por los de Dulce Encanto:
 *  - 6 categorías reposteras (Tartas, Cupcakes, Mini Cakes, Postres Fríos, Galletas, Combos)
 *  - 12 productos con imágenes reales (cake-chocolate.png, tres-leches.png, etc.)
 *  - 2 zonas de delivery en Ciego de Ávila (precios en CUP)
 *  - Admin: admin@dulceencanto.com / DulceAdmin2026!
 *  - SiteConfig con identidad Dulce Encanto, colores morado #A855F7 + rosado #EC4899
 *
 *  Mantiene TODA la lógica de negocio de Díaz Premium (pedidos, carrito, checkout,
 *  reservas, variantes, zonas, admin) — solo cambia el contenido/branding.
 *
 *  Uso: bun run scripts/seed-dulce.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const now = new Date().toISOString();

// ─── CATEGORÍAS (6 reposteras) ─────────────────────────────────────────────
const categories = [
  { id: 'cat-tartas',    name: 'Tartas',         slug: 'tartas',         icon: '🎂', order: 0 },
  { id: 'cat-cupcakes',  name: 'Cupcakes',        slug: 'cupcakes',       icon: '🧁', order: 1 },
  { id: 'cat-minicakes', name: 'Mini Cakes',      slug: 'mini-cakes',     icon: '🍰', order: 2 },
  { id: 'cat-postres',   name: 'Postres Fríos',   slug: 'postres-frios',  icon: '🍮', order: 3 },
  { id: 'cat-galletas',  name: 'Galletas',        slug: 'galletas',       icon: '🍪', order: 4 },
  { id: 'cat-combos',    name: 'Combos',          slug: 'combos',         icon: '🎁', order: 5 },
];

// ─── PRODUCTOS (12) ────────────────────────────────────────────────────────
// Precios en CUP (Peso Cubano). Imágenes ya copiadas a public/products/.
type SeedProduct = {
  id: string; name: string; description: string; sku: string; price: number;
  image: string; categoryId: string; stock: number; featured: boolean; order: number;
  saleUnit: string; minHours: number; offerEnabled?: boolean; offerPrice?: number;
  rating?: number; reviewCount?: number;
};

const products: SeedProduct[] = [
  {
    id: 'de-tarta-chocolate', name: 'Torta de Chocolate Premium',
    description: 'Torta de chocolate belga con ganache sedoso y frutos rojos frescos. 12 porciones. La favorita de nuestros clientes para celebraciones especiales.',
    sku: 'DE-001', price: 2500, image: '/products/cake-chocolate.webp', categoryId: 'cat-tartas',
    stock: 5, featured: true, order: 0, saleUnit: 'unidad', minHours: 48,
    rating: 5.0, reviewCount: 28,
  },
  {
    id: 'de-tarta-tresleches', name: 'Tarta Tres Leches Especial',
    description: 'Tarta tres leches bañada en crema suiza, decorada con fresas frescas y merengue italiano. 10 porciones de pura indulgencia.',
    sku: 'DE-002', price: 1800, image: '/products/tres-leches.webp', categoryId: 'cat-tartas',
    stock: 3, featured: true, order: 1, saleUnit: 'unidad', minHours: 48,
    rating: 5.0, reviewCount: 45,
  },
  {
    id: 'de-cupcakes-surtidos', name: 'Cupcakes Surtidos (6 und)',
    description: 'Seis cupcakes de vainilla con buttercream surtido: chocolate, fresa, vainilla, frutos rojos. Caja lista para regalar.',
    sku: 'DE-003', price: 800, image: '/products/cupcakes-assorted.webp', categoryId: 'cat-cupcakes',
    stock: 20, featured: true, order: 2, saleUnit: 'caja', minHours: 24,
    offerEnabled: true, offerPrice: 720, rating: 4.8, reviewCount: 15,
  },
  {
    id: 'de-minicake-fresa', name: 'Mini Cake de Fresa',
    description: 'Mini cake individual de fresa con crema suiza. Perfecta para un detalle personal o regalo sorpresa.',
    sku: 'DE-004', price: 350, image: '/products/mini-cake-strawberry.webp', categoryId: 'cat-minicakes',
    stock: 15, featured: true, order: 3, saleUnit: 'unidad', minHours: 24,
    rating: 4.9, reviewCount: 32,
  },
  {
    id: 'de-postres-frios', name: 'Postres Fríos Variados (caja 8 und)',
    description: 'Selección de postres fríos: pudín, flan, mousse de chocolate, tiramisú y panna cotta. Ocho porciones individuales.',
    sku: 'DE-005', price: 1200, image: '/products/cold-desserts.webp', categoryId: 'cat-postres',
    stock: 12, featured: true, order: 4, saleUnit: 'caja', minHours: 24,
    rating: 4.9, reviewCount: 18,
  },
  {
    id: 'de-galletas-decoradas', name: 'Galletas Decoradas (12 und)',
    description: 'Doce galletas de mantequilla decoradas a mano con glaseado real. Diseños personalizados según tu evento.',
    sku: 'DE-006', price: 600, image: '/products/cookies-decorated.webp', categoryId: 'cat-galletas',
    stock: 30, featured: true, order: 5, saleUnit: 'caja', minHours: 24,
    offerEnabled: true, offerPrice: 480, rating: 4.7, reviewCount: 20,
  },
  {
    id: 'de-combo-cumple', name: 'Combo Cumpleaños Premium',
    description: 'Todo lo que necesitas para un cumpleaños inolvidable: tarta personalizada + 12 cupcakes + 12 galletas decoradas con el tema que elijas.',
    sku: 'DE-007', price: 3500, image: '/products/combo-birthday.webp', categoryId: 'cat-combos',
    stock: 10, featured: true, order: 6, saleUnit: 'combo', minHours: 48,
    rating: 5.0, reviewCount: 12,
  },
  {
    id: 'de-tarta-red-velvet', name: 'Tarta Red Velvet',
    description: 'Clásica tarta de terciopelo rojo con capas de crema de queso. Visualmente impactante y deliciosamente suave. 12 porciones.',
    sku: 'DE-008', price: 2200, image: '/products/cake-chocolate.webp', categoryId: 'cat-tartas',
    stock: 4, featured: false, order: 2, saleUnit: 'unidad', minHours: 48,
    rating: 4.9, reviewCount: 22,
  },
  {
    id: 'de-cupcakes-choco', name: 'Cupcakes de Chocolate (6 und)',
    description: 'Seis cupcakes de chocolate intenso con buttercream de chocolate belga y virutas de cacao. Para los amantes del chocolate.',
    sku: 'DE-009', price: 850, image: '/products/cupcakes-assorted.webp', categoryId: 'cat-cupcakes',
    stock: 18, featured: false, order: 3, saleUnit: 'caja', minHours: 24,
    rating: 4.8, reviewCount: 11,
  },
  {
    id: 'de-minicake-choco', name: 'Mini Cake de Chocolate',
    description: 'Mini cake individual de chocolate con ganache. Ideal como detalle dulce para esa persona especial.',
    sku: 'DE-010', price: 380, image: '/products/mini-cake-strawberry.webp', categoryId: 'cat-minicakes',
    stock: 14, featured: false, order: 4, saleUnit: 'unidad', minHours: 24,
    rating: 4.9, reviewCount: 9,
  },
  {
    id: 'de-galletas-vainilla', name: 'Galletas de Vainilla (12 und)',
    description: 'Doce galletas crujientes de vainilla con mantequilla. Sabor clásico que encanta a toda la familia.',
    sku: 'DE-011', price: 500, image: '/products/cookies-decorated.webp', categoryId: 'cat-galletas',
    stock: 25, featured: false, order: 6, saleUnit: 'caja', minHours: 24,
    rating: 4.6, reviewCount: 14,
  },
  {
    id: 'de-combo-romantico', name: 'Combo Romántico',
    description: 'Mini cake de fresa + 6 cupcakes + 6 galletas en forma de corazón. Perfecto para aniversarios y San Valentín.',
    sku: 'DE-012', price: 1800, image: '/products/combo-birthday.webp', categoryId: 'cat-combos',
    stock: 8, featured: false, order: 7, saleUnit: 'combo', minHours: 48,
    rating: 5.0, reviewCount: 7,
  },
];

// ─── ZONAS DE DELIVERY (Ciego de Ávila, CUP) ───────────────────────────────
const zones = [
  {
    id: 'zone-de-ciudad', name: 'Ciego de Ávila (Ciudad)',
    description: 'Entrega directa a domicilio dentro del casco urbano de Ciego de Ávila.',
    price: 200, estimatedTime: 'Mismo día (si se pide antes de las 12:00)', order: 0,
    allowsPriorityDelivery: true,
  },
  {
    id: 'zone-de-periferia', name: 'Ciego de Ávila (Periferia)',
    description: 'Entrega en zonas periféricas y municipios cercanos (Majagua, Ciro Redondo, etc.).',
    price: 300, estimatedTime: '24 a 48 horas', order: 1,
    allowsPriorityDelivery: false,
  },
];

// ─── SITECONFIG (identidad Dulce Encanto) ──────────────────────────────────
const siteConfig = {
  id: 'site',
  storeName: 'Dulce Encanto',
  tagline: 'Sabor y elegancia para tus momentos especiales',
  logo: '/logo-dulce-encanto.webp',
  cover: '/hero-slide-1.webp',
  heroTitle: 'Sabor y elegancia para tus **momentos especiales**',
  heroSubtitle: 'Pasteles personalizados, cupcakes y postres fríos elaborados con los mejores ingredientes y mucho amor. Horneado el mismo día de tu evento.',
  heroSlides: JSON.stringify([
    {
      image: '/hero-slide-1.webp',
      title: 'Sabor y elegancia para tus **momentos especiales**',
      subtitle: 'Pasteles personalizados, cupcakes y postres fríos elaborados con los mejores ingredientes y mucho amor. Horneado el mismo día de tu evento.',
      cta: '🧁 Ver catálogo',
      link: 'catalog',
    },
    {
      image: '/hero-slide-2.webp',
      title: 'Dulces finos y buffet listos para llevar',
      subtitle: 'Empanadillas, cupcakes, brownies, tequeños y mucho más. Pídelo hoy y recíbelo fresco en Ciego de Ávila.',
      cta: '🛒 Venta directa',
      link: 'catalog',
      category: 'immediate',
    },
    {
      image: '/hero-slide-3.webp',
      title: 'Tartas y pasteles para reservar',
      subtitle: 'Tortas personalizadas, pasteles de dos y tres pisos, cakes de bandeja. Reserva con 48h de anticipación para tu evento.',
      cta: '📅 Reservar',
      link: 'catalog',
      category: 'reservations',
    },
    {
      image: '/hero-slide-4.webp',
      title: 'Promociones por fechas especiales',
      subtitle: 'Ofertas para Día de las Madres, San Valentín, Fin de Año y más. Combos especiales con descuento.',
      cta: '💝 Ver promociones',
      link: 'catalog',
      category: 'promotions',
    },
    {
      image: '/hero-slide-5.webp',
      title: 'Galería de eventos inolvidables',
      subtitle: 'Inspírate con nuestros trabajos: cumpleaños infantiles, 15 años, bodas y celebraciones únicas.',
      cta: '🖼️ Ver galería',
      link: 'catalog',
      category: 'gallery',
    },
  ]),
  phone: '+5351111111',
  whatsappNumber: '+5351111111',
  address: 'Calle Maceo 54, Ciego de Ávila, Cuba',
  zelleEmail: '',
  zelleName: '',
  primaryColor: '#A855F7',
  primaryColorDark: '#7E22CE',
  primaryColorLight: '#F3E8FF',
  footerBgColor: '#1E112A',
  footerTextColor: '#E9D5FF',
  footerAccentColor: '#EC4899',
  themeId: 'dulce-encanto',
  themeData: '',
  homeSectionsOrder: 'hero,topSelling,featuredCategories,specialDate,buyFrom,benefits,offers,immediateSale,reservationCatalog,services,promotions,gallery,schedule,deliveryZones,storeReviews,quickContact,promoBanner,socialStats',
  homeSectionsEnabled: '{}',
  navSections: JSON.stringify([
    { id: 'immediate', label: 'Venta Directa', icon: '🛒', visible: true },
    { id: 'reservations', label: 'Reservas', icon: '📅', visible: true },
    { id: 'services', label: 'Servicios', icon: '🎨', visible: true },
    { id: 'promotions', label: 'Promociones', icon: '💝', visible: true },
    { id: 'gallery', label: 'Galería', icon: '🖼️', visible: true },
  ]),
  hamburgerItems: JSON.stringify([
    { id: 'schedules', label: 'Horarios de Entrega', icon: '🕐', visible: true },
    { id: 'delivery-zones', label: 'Zonas de Entrega', icon: '🚚', visible: true },
    { id: 'orders', label: 'Mis Pedidos', icon: '📦', visible: true },
    { id: 'account', label: 'Mi Cuenta', icon: '👤', visible: true },
  ]),
  offersCarousel: JSON.stringify({
    enabled: true,
    title: 'Ofertas Dulces',
    subtitle: 'Antójate con estos precios especiales',
    productIds: [],
    backgroundColor: '#F3E8FF',
    textColor: '#7E22CE',
  }),
  savedThemes: '[]',
  zelleEnabled: false,
  freeShippingEnabled: true,
  customerRegistrationEnabled: true,
  customerLoginEnabled: true,
  tickerEnabled: true,
  catalogLayout: 'categories',
  freeShippingMin: 500,
  shippingCost: 100,
  minOrderAmount: 200,
  scheduleLunes: '09:00 - 18:00',
  scheduleMartes: '09:00 - 18:00',
  scheduleMiercoles: '09:00 - 18:00',
  scheduleJueves: '09:00 - 18:00',
  scheduleViernes: '09:00 - 18:00',
  scheduleSabado: '10:00 - 16:00',
  scheduleDomingo: 'Cerrado',
  asapSurchargeType: 'fixed',
  asapSurchargeValue: 100,
  asapStartHour: '09:00',
  asapEndHour: '18:00',
  maxOrderHour: '15:00',
  asapMinLeadTime: 1440,
  asapMaxPerHour: 3,
  asapExcludeNormalHours: false,
  normalSchedule: '09:00 - 18:00',
  activeCountries: 'CU',
  tickerItems: JSON.stringify([
    '🧁 ¡Endulza tus momentos especiales! Pedidos con 24h de anticipación.',
    '🎂 Tartas personalizadas para cumpleaños, bodas y eventos.',
    '🚚 Entregas a domicilio en Ciego de Ávila.',
    '✨ Horneado fresco el mismo día de tu evento.',
  ]),
  horarioSectionTitle: 'Pide con tiempo, recíbelo fresco',
  horarioSectionDesc: 'Tres cosas que debes saber sobre cómo trabajamos para que tu pedido llegue siempre perfecto a tu evento.',
  horarioCards: JSON.stringify([
    { icon: '🕐', title: 'Pedidos 24/7', description: 'El sitio está disponible para recibir tus pedidos las **24 horas**, los **7 días** de la semana.', color: 'purple' },
    { icon: '🧁', title: 'Horneado el mismo día', description: 'Preparamos tu pedido fresco el **mismo día** de tu evento para garantizar la mejor calidad.', color: 'rose' },
    { icon: '🚚', title: 'Entrega en Ciego de Ávila', description: 'Entregamos directamente en tu domicilio dentro de Ciego de Ávila y zonas cercanas.', color: 'amber' },
  ]),
  socialLinks: JSON.stringify([
    { platform: 'Instagram', url: 'https://instagram.com/dulceencanto', icon: 'instagram', visible: true },
    { platform: 'Facebook', url: 'https://facebook.com/dulceencanto', icon: 'facebook', visible: true },
    { platform: 'WhatsApp', url: 'https://wa.me/5351111111', icon: 'whatsapp', visible: true },
  ]),
  trustBadges: JSON.stringify([
    { icon: '🧁', text: 'Repostería artesanal', visible: true },
    { icon: '✨', text: '100% fresco, horneado al momento', visible: true },
    { icon: '💖', text: 'Diseños personalizados', visible: true },
    { icon: '🚚', text: 'Entrega a domicilio', visible: true },
  ]),
  socialStats: JSON.stringify([
    { value: '500+', label: 'Pedidos felices' },
    { value: '4.9★', label: 'Valoración media' },
    { value: '24h', label: 'Anticipación de pedidos' },
    { value: '100%', label: 'Horneado fresco' },
  ]),
  testimonials: JSON.stringify([
    { name: 'Yanet Suárez', location: 'Ciego de Ávila', text: 'La tarta de chocolate de mi cumpleaños fue espectacular. Súper húmeda y con un sabor increíble. Todos quedaron encantados.', rating: 5 },
    { name: 'Roberto Méndez', location: 'Ciego de Ávila', text: 'Pedí los cupcakes surtidos para un baby shower y fueron un éxito. Hermosa presentación y deliciosos.', rating: 5 },
    { name: 'Lianet Pacheco', location: 'Majagua', text: 'El combo de cumpleaños salvó mi evento. Tarta, cupcakes y galletas, todo coordinado y a tiempo. ¡Recomendadísimo!', rating: 5 },
  ]),
  homeBenefits: JSON.stringify([
    { icon: 'truck',   title: 'Entrega a domicilio',   desc: 'En Ciego de Ávila y alrededores', color: 'text-purple-600',  bg: 'bg-purple-50' },
    { icon: 'sparkles',title: '100% Fresco',           desc: 'Horneado el mismo día de tu evento', color: 'text-pink-600', bg: 'bg-pink-50' },
    { icon: 'heart',   title: 'Diseños únicos',        desc: 'Personalizamos tu tarta a la medida', color: 'text-rose-600',  bg: 'bg-rose-50' },
    { icon: 'shield',  title: 'Atención directa',      desc: 'Asesoría inmediata por WhatsApp', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
  ]),
  howItWorksSteps: JSON.stringify([
    { icon: 'package',    title: 'Elige tus dulces',     desc: 'Explora nuestro catálogo de tartas, cupcakes y postres.' },
    { icon: 'send',       title: 'Haz tu pedido',         desc: 'Completa el formulario con los datos de tu evento.' },
    { icon: 'check',      title: 'Confirmamos tu diseño', desc: 'Validamos detalles, decoración y fecha de entrega.' },
    { icon: 'creditcard', title: 'Realiza el pago',       desc: 'Paga en efectivo o por transferencia (CUP).' },
    { icon: 'truck',      title: 'Entregamos fresco',     desc: 'Tu pedido llega el día del evento, recién horneado.' },
  ]),
};

// ─── ADMIN ──────────────────────────────────────────────────────────────────
const admin = {
  id: 'admin-dulce',
  username: 'admin@dulceencanto.com',
  password: 'DulceAdmin2026!',
  name: 'Administrador Dulce Encanto',
};

// ─── EJECUCIÓN ──────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧁 SEMILLA — Dulce Encanto (repostería boutique)');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Limpiar tablas (respetando FKs)
  console.log('🧹 Limpiando tablas...');
  const tables = [
    'OrderItem', 'Order',
    'ProductExtra', 'ProductCombination', 'VariantOption', 'VariantGroup',
    'WholesaleTier', 'Product',
    'Review', 'Customer', 'DeliveryZone',
    'Category', 'SiteConfig', 'Admin',
  ];
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
  for (const t of tables) {
    try { await prisma.$executeRawUnsafe(`DELETE FROM "${t}";`); } catch { /* tabla no existe */ }
  }
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
  console.log('  ✓ Tablas limpiadas\n');

  // 2. Categorías
  console.log('📂 Categorías...');
  for (const c of categories) {
    await prisma.category.create({
      data: { ...c, image: '', active: true, createdAt: now, updatedAt: now },
    });
  }
  console.log(`  ✓ ${categories.length} categorías`);

  // 3. Productos
  console.log('📦 Productos...');
  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id, name: p.name, shortName: '', description: p.description, sku: p.sku,
        price: p.price, image: p.image, images: '[]', tags: '[]', categoryId: p.categoryId,
        rating: p.rating ?? 0, reviewCount: p.reviewCount ?? 0, stock: p.stock,
        featured: p.featured, order: p.order,
        saleUnit: p.saleUnit, barcode: '', productType: 'elaborado', status: 'active',
        posAvailable: true, tiendaAvailable: true,
        advanceType: 'sin', advanceValue: 0, minHours: p.minHours, minHoursUnit: 'horas',
        costPrice: 0, marginPercent: 0,
        offerEnabled: p.offerEnabled || false, offerType: 'permanente',
        offerPrice: p.offerPrice || 0, offerStart: null, offerEnd: null,
        wholesaleEnabled: false, wholesalePrice: 0, wholesaleMinQty: 0,
        reservationEnabled: false, maxReservations: 0, reservationDays: 0, reservationDeposit: 0,
        promoEnabled: false, promoType: 'discount', promoValue: 0, promoBuyQty: 0, promoGetQty: 0,
        promoStart: null, promoEnd: null,
        createdAt: now, updatedAt: now,
      },
    });
  }
  console.log(`  ✓ ${products.length} productos`);

  // 4. Zonas
  console.log('🚚 Zonas de delivery...');
  for (const z of zones) {
    await prisma.deliveryZone.create({
      data: {
        ...z, active: true,
        asapSurchargeOverride: false, asapSurchargeType: 'fixed', asapSurchargeValue: 0,
        asapMinLeadTimeOverride: null, asapMaxPerHourOverride: null,
        asapExcludeNormalHoursOverride: false,
        createdAt: now, updatedAt: now,
      },
    });
  }
  console.log(`  ✓ ${zones.length} zonas`);

  // 5. Admin
  console.log('🔐 Admin...');
  const hashed = await bcrypt.hash(admin.password, 10);
  await prisma.admin.create({
    data: {
      id: admin.id, username: admin.username, password: hashed,
      name: admin.name, createdAt: now, updatedAt: now,
    },
  });
  console.log(`  ✓ Admin: ${admin.username} / ${admin.password}`);

  // 6. SiteConfig
  console.log('⚙️ Configuración del sitio...');
  await prisma.siteConfig.create({ data: { ...siteConfig, createdAt: now, updatedAt: now } as any });
  console.log('  ✓ SiteConfig (Dulce Encanto, morado + rosado)');

  // 7. Reseña demo
  console.log('⭐ Reseña demo...');
  await prisma.review.create({
    data: {
      id: 'review-demo-1', productId: 'de-tarta-tresleches', customerId: null,
      authorName: 'Yanet Suárez', rating: 5,
      comment: 'La tarta tres leches superó todas mis expectativas. Súper cremosa y las fresas frescas. ¡Pediré más seguro!',
      status: 'approved', adminReply: '¡Gracias Yanet! Nos alegra que hayas disfrutado tu tarta. 🧁',
      createdAt: now, updatedAt: now,
    },
  });
  console.log('  ✓ 1 reseña demo');

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ SEMILLA DULCE ENCANTO COMPLETADA');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Tienda: Dulce Encanto`);
  console.log(`  Colores: morado #A855F7 + rosado #EC4899`);
  console.log(`  Catálogo: ${categories.length} categorías, ${products.length} productos`);
  console.log(`  Admin: /admin → ${admin.username}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('❌ Error en semilla Dulce Encanto:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
