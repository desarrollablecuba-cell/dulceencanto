/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SEMILLA — Servicios, Promociones y Galería (Dulce Encanto)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  - 10 servicios para eventos (Decoración, Muñecos Sorpresa, Cañón Confeti,
 *    Máquina de Burbujas, Caja de Regalos, Vela Volcánica, Globos,
 *    Sublimación de Pullovers, Jarras, Gigantografías)
 *  - 5 promociones para fechas importantes (Día Madres, Día Padres,
 *    San Valentín, Día de la Mujer, Fin de Año)
 *  - 4 galería por tipo de evento (15 años, cumple niños, cumple adultos, boda)
 *
 *  Precios en CUP (base) + USD (rate ~700 para Zelle desde el exterior).
 *  Uso: bun run scripts/seed-extras.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const now = new Date().toISOString();
const USD_RATE = 700;

function cupToUsd(cup: number): number {
  return Math.round((cup / USD_RATE) * 100) / 100;
}

// ─── SERVICIOS (10) ────────────────────────────────────────────────────────
const services = [
  {
    id: 'srv-decoracion', name: 'Decoración del Evento',
    description: 'Decoración completa del salón: centros de mesa, guirnaldas, telas, iluminación temática y ambientación según la ocasión.',
    icon: '🎨', category: 'decoracion', price: 5000, order: 0,
  },
  {
    id: 'srv-munecos', name: 'Muñecos Sorpresa',
    description: 'Muñecos sorpresa de personajes infantiles y de moda. Ideales para cumpleaños y revelaciones. Incluye disfraz completo.',
    icon: '🧸', category: 'entretenimiento', price: 2500, order: 1,
  },
  {
    id: 'srv-canon', name: 'Cañón de Confeti',
    description: 'Cañones de confeti para el momento culminante: la hora loca, el corte de la tarta o la coronación. Pack de 6 cañones.',
    icon: '🎉', category: 'entretenimiento', price: 1200, order: 2,
  },
  {
    id: 'srv-burbujas', name: 'Máquina de Burbujas',
    description: 'Máquina profesional de burbujas continua durante 2 horas. Magia visual para fotos y momento de baile.',
    icon: '🫧', category: 'entretenimiento', price: 1500, order: 3,
  },
  {
    id: 'srv-caja-regalo', name: 'Caja de Regalos Personalizada',
    description: 'Caja decorada a mano con productos a tu elección: tartas mini, galletas, cupcakes y detalles personalizados.',
    icon: '🎁', category: 'decoracion', price: 1800, order: 4,
  },
  {
    id: 'srv-vela-volcanica', name: 'Vela Volcánica',
    description: 'Vela volcánica especial para cumpleaños: al encenderla brota llama colorida y sorpresa. Momento mágico garantizado.',
    icon: '🌋', category: 'entretenimiento', price: 800, order: 5,
  },
  {
    id: 'srv-globos', name: 'Decoración con Globos',
    description: 'Arcos, columnas y bouquets de globos con colores temáticos. Globos helados para un toque premium.',
    icon: '🎈', category: 'decoracion', price: 2200, order: 6,
  },
  {
    id: 'srv-sublimacion', name: 'Sublimación de Pullovers',
    description: 'Pullovers personalizados con el nombre, foto o temática del evento. Recuerdos únicos para los invitados.',
    icon: '👕', category: 'personalizado', price: 1200, order: 7,
  },
  {
    id: 'srv-jarras', name: 'Jarras Personalizadas',
    description: 'Jarras de regalo con diseño personalizado: nombre del festejado, fecha y temática. Set de 6 unidades.',
    icon: '🫗', category: 'personalizado', price: 1500, order: 8,
  },
  {
    id: 'srv-gigantografias', name: 'Gigantografías',
    description: 'Impresión gran formato para fotos de cuerpo entero, fondos de escenario o banners de bienvenida. Hasta 2x3 metros.',
    icon: '🖼️', category: 'decoracion', price: 2000, order: 9,
  },
];

// ─── PROMOCIONES (5) ───────────────────────────────────────────────────────
const promotions = [
  {
    id: 'promo-madres', title: 'Día de las Madres',
    description: 'Sorprende a mamá con una tarta personalizada + 6 cupcakes + galletas decoradas. Combo especial con 15% de descuento.',
    occasion: 'dia_madres', discountPct: 15,
    image: '/gallery-15anos.webp',
    startDate: `${new Date().getFullYear()}-05-01`, endDate: `${new Date().getFullYear()}-05-15`, order: 0,
  },
  {
    id: 'promo-padres', title: 'Día de los Padres',
    description: 'Tarta temática de papá + pullover personalizado sublimado. Un detalle que enamora. 10% de descuento en el combo.',
    occasion: 'dia_padres', discountPct: 10,
    image: '/hero-slide-2.webp',
    startDate: `${new Date().getFullYear()}-06-01`, endDate: `${new Date().getFullYear()}-06-21`, order: 1,
  },
  {
    id: 'promo-san-valentin', title: 'San Valentín',
    description: 'Combo romántico: mini cake de fresa + 6 cupcakes + galletas en forma de corazón. Para celebrar el amor.',
    occasion: 'san_valentin', discountPct: 12,
    image: '/products/de/de-000-1----dulzura-en-pareja.webp',
    startDate: `${new Date().getFullYear()}-02-01`, endDate: `${new Date().getFullYear()}-02-14`, order: 2,
  },
  {
    id: 'promo-mujer', title: 'Día de la Mujer',
    description: 'Caja regalo especial: cupcakes surtidos + galletas decoradas + vela aromática. Para las mujeres extraordinarias.',
    occasion: 'dia_mujer', discountPct: 10,
    image: '/gallery-cumple-adultos.webp',
    startDate: `${new Date().getFullYear()}-03-01`, endDate: `${new Date().getFullYear()}-03-08`, order: 3,
  },
  {
    id: 'promo-fin-anio', title: 'Fin de Año',
    description: 'Cierra el año con dulzura: tarta de cumple + combo postres fríos + copas de champaña comestibles. 20% de descuento.',
    occasion: 'fin_anio', discountPct: 20,
    image: '/hero-slide-5.webp',
    startDate: `${new Date().getFullYear()}-12-15`, endDate: `${new Date().getFullYear()}-12-31`, order: 4,
  },
];

// ─── GALERÍA (4) ───────────────────────────────────────────────────────────
const gallery = [
  {
    id: 'gal-15anos', title: '15 Años — Quinceañera Soñada',
    image: '/gallery-15anos.webp', eventType: '15_anos', order: 0,
    description: 'Mesa de dulces completa, tarta de tres pisos, decoración morado y rosado. Un día inolvidable.',
  },
  {
    id: 'gal-ninos', title: 'Cumpleaños Infantil — Aventura Mágica',
    image: '/gallery-cumple-ninos.webp', eventType: 'cumple_ninos', order: 1,
    description: 'Tarta de personaje, globos coloridos, cañón de confeti y máquina de burbujas. Diversión asegurada.',
  },
  {
    id: 'gal-adultos', title: 'Cumpleaños de Adultos — Elegancia',
    image: '/gallery-cumple-adultos.webp', eventType: 'cumple_adultos', order: 2,
    description: 'Tarta sofisticada con detalles dorados, jarras personalizadas y gigantografía. Celebración con estilo.',
  },
  {
    id: 'gal-boda', title: 'Boda — Día Inolvidable',
    image: '/gallery-boda.webp', eventType: 'boda', order: 3,
    description: 'Tarta nupcial de varios pisos, macarons, flores y decoración romántica. El final feliz que sueñas.',
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🎉 SEMILLA — Servicios, Promociones y Galería');
  console.log('═══════════════════════════════════════════════════════\n');

  // Guard: si ya hay servicios, omitir (protege datos reales en redeploys).
  const existingServices = await prisma.service.count();
  if (existingServices > 0 && process.env.FORCE_SEED !== '1') {
    console.log(`  ⏭️  La BD ya contiene ${existingServices} servicios. Seed omitido.`);
    console.log('  ⏭️  Para forzar la resiembra: FORCE_SEED=1\n');
    return;
  }

  // Limpiar (deleteMany = compatible MySQL y SQLite).
  // NO se tocan EventReservation/EventReservationItem: son datos reales.
  console.log('🧹 Limpiando tablas...');
  await prisma.service.deleteMany({});
  await prisma.promotion.deleteMany({});
  await prisma.galleryItem.deleteMany({});
  console.log('  ✓ Limpiado\n');

  // Servicios
  console.log('🎨 Servicios...');
  for (const s of services) {
    await prisma.service.create({
      data: { ...s, priceUsd: cupToUsd(s.price), active: true, createdAt: now, updatedAt: now },
    });
  }
  console.log(`  ✓ ${services.length} servicios`);

  // Promociones
  console.log('💝 Promociones...');
  for (const p of promotions) {
    await prisma.promotion.create({
      data: { ...p, active: true, createdAt: now, updatedAt: now } as any,
    });
  }
  console.log(`  ✓ ${promotions.length} promociones`);

  // Galería
  console.log('🖼️ Galería...');
  for (const g of gallery) {
    await prisma.galleryItem.create({
      data: { ...g, active: true, createdAt: now, updatedAt: now } as any,
    });
  }
  console.log(`  ✓ ${gallery.length} items de galería`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ SEMILLA EXTRAS COMPLETADA');
  console.log(`  Servicios: ${services.length} (CUP + USD para Zelle)`);
  console.log(`  Promociones: ${promotions.length} fechas importantes`);
  console.log(`  Galería: ${gallery.length} tipos de evento`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch((err) => { console.error('❌ Error:', err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
