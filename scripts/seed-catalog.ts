/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SEMILLA — Catálogo real de Dulce Encanto (scraped de pedidoswhats.app)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Crea las categorías y productos reales del negocio:
 *   - Catálogo de Reservas: Tortas, Cake Bandeja, Pasteles 2 Pisos, Pasteles 3 Pisos, Sueños Sorpresa
 *   - Catálogo de Venta Directa: Dulces Finos y Buffet
 *
 *  Los productos se marcan con `featured` y `tiendaAvailable` para controlar en
 *  qué catálogo aparecen:
 *   - Reservas: featured=true (aparecen en catálogo de reservas)
 *   - Venta directa: tiendaAvailable=true, featured=false (aparecen en venta directa)
 *
 *  Uso: bun run scripts/seed-catalog.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const now = new Date().toISOString();
const USD_RATE = 700;

function cupToUsd(cup: number): number {
  return Math.round((cup / USD_RATE) * 100) / 100;
}

interface ScrapedProduct {
  category: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  local_image?: string;
}

// ─── CATEGORÍAS — Reservas (tortas/pasteles) ──────────────────────────────
const reservationCategories = [
  { id: 'cat-tortas', name: 'Tortas', slug: 'tortas', icon: '🎂', order: 0 },
  { id: 'cat-cake-bandeja', name: 'Cake Tamaño Bandeja', slug: 'cake-bandeja', icon: '🥮', order: 1 },
  { id: 'cat-pasteles-dos-pisos', name: 'Pasteles de Dos Pisos', slug: 'pasteles-dos-pisos', icon: '🥧', order: 2 },
  { id: 'cat-pasteles-tres-pisos', name: 'Pasteles de Tres Pisos', slug: 'pasteles-tres-pisos', icon: '🎂', order: 3 },
];

// ─── CATEGORÍAS — Venta Directa (dulces finos + buffet) ────────────────────
const immediateCategories = [
  { id: 'cat-dulces-finos', name: 'Dulces Finos y Buffet', slug: 'dulces-finos-buffet', icon: '🧁', order: 5 },
];

const allCategories = [...reservationCategories, ...immediateCategories];

// Map scraped category → our category ID + catalog type
// Sueños Sorpresa se mueve a SERVICIOS (no es un producto de catálogo)
const catMap: Record<string, { catId: string; catalog: 'reservation' | 'immediate' }> = {
  tortas: { catId: 'cat-tortas', catalog: 'reservation' },
  cake_bandeja: { catId: 'cat-cake-bandeja', catalog: 'reservation' },
  pasteles_dos_pisos: { catId: 'cat-pasteles-dos-pisos', catalog: 'reservation' },
  pasteles_tres_pisos: { catId: 'cat-pasteles-tres-pisos', catalog: 'reservation' },
  dulces_finos_buffet: { catId: 'cat-dulces-finos', catalog: 'immediate' },
};

// Placeholder images by category (we'll generate real ones separately)
const catImages: Record<string, string> = {
  'cat-tortas': '/products/cake-chocolate.webp',
  'cat-cake-bandeja': '/products/cake-chocolate.webp',
  'cat-pasteles-dos-pisos': '/products/cake-chocolate.webp',
  'cat-pasteles-tres-pisos': '/products/cake-chocolate.webp',
  'cat-suenos-sorpresa': '/products/combo-birthday.webp',
  'cat-dulces-finos': '/products/cupcakes-assorted.webp',
};

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧁 SEMILLA — Catálogo real Dulce Encanto');
  console.log('═══════════════════════════════════════════════════════\n');

  // Guard: si el catálogo real ya fue sembrado (productos de-prod-*), omitir.
  const existingCatalog = await prisma.product.count({ where: { id: { startsWith: 'de-prod-' } } });
  if (existingCatalog > 0 && process.env.FORCE_SEED !== '1') {
    console.log(`  ⏭️  El catálogo ya está sembrado (${existingCatalog} productos). Seed omitido.`);
    console.log('  ⏭️  Para forzar la resiembra: FORCE_SEED=1\n');
    return;
  }

  // Load scraped products
  const scrapedPath = path.join(process.cwd(), 'data', 'scraped-products.json');
  const scraped: ScrapedProduct[] = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'));
  console.log(`📂 ${scraped.length} productos scrapeados cargados`);

  // Limpiar productos y categorías existentes (NO tocar servicios ni pedidos).
  // deleteMany = compatible MySQL y SQLite. Orden: hijas antes que padres.
  // Los pedidos se conservan: OrderItem.productId es un string sin FK.
  console.log('🧹 Limpiando productos y categorías...');
  await prisma.review.deleteMany({}); // reseñas apuntan a productos que se borran
  await prisma.productExtra.deleteMany({});
  await prisma.productCombination.deleteMany({});
  await prisma.variantOption.deleteMany({});
  await prisma.variantGroup.deleteMany({});
  await prisma.wholesaleTier.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  // Solo eliminar servicios de sueños_sorpresa (los 10 originales se conservan)
  await prisma.service.deleteMany({ where: { category: 'suenos_sorpresa' } });
  console.log('  ✓ Limpiado (servicios originales conservados)\n');

  // Crear categorías
  console.log('📁 Creando categorías...');
  for (const c of allCategories) {
    await prisma.category.create({
      data: { ...c, image: '', active: true, createdAt: now, updatedAt: now },
    });
  }
  console.log(`  ✓ ${allCategories.length} categorías (${reservationCategories.length} reservas + ${immediateCategories.length} venta directa)\n`);

  // ── Crear Sueños Sorpresa como SERVICIOS (no productos) ──
  console.log('🙀 Creando Sueños Sorpresa como servicios...');
  const suenosProducts = scraped.filter((p) => p.category === 'suenos_sorpresa');
  for (let i = 0; i < suenosProducts.length; i++) {
    const p = suenosProducts[i];
    await prisma.service.create({
      data: {
        id: `srv-sueno-${i}`,
        name: p.name.replace(/^\d+\.\s*/, ''),
        description: p.description || 'Sueño sorpresa personalizado para tu evento especial.',
        icon: '🙀',
        image: p.local_image || '',
        price: p.price,
        priceUsd: cupToUsd(p.price),
        category: 'suenos_sorpresa',
        active: true,
        order: 10 + i, // después de los 10 servicios existentes
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  console.log(`  ✓ ${suenosProducts.length} sueños sorpresa como servicios\n`);

  // Crear productos (excluyendo sueños_sorpresa que ya son servicios)
  console.log('📦 Creando productos...');
  let reservationCount = 0;
  let immediateCount = 0;
  let idx = 0;
  for (const p of scraped) {
    const mapping = catMap[p.category];
    if (!mapping) continue; // suenos_sorpresa saltado (ya creado como servicio)
    const isReservation = mapping.catalog === 'reservation';
    // Generate a unique ID
    const id = `de-prod-${idx++}`;
    await prisma.product.create({
      data: {
        id,
        name: p.name,
        shortName: '',
        description: p.description || '',
        sku: `DE-${String(idx).padStart(3, '0')}`,
        price: p.price,
        image: p.local_image || catImages[mapping.catId] || '/products/placeholder.svg',
        images: '[]',
        tags: JSON.stringify([isReservation ? 'reserva' : 'venta-directa']),
        categoryId: mapping.catId,
        rating: 4.8,
        reviewCount: Math.floor(Math.random() * 30) + 1,
        stock: isReservation ? 5 : 50,
        featured: isReservation, // Reservas aparecen como destacadas
        order: idx,
        saleUnit: isReservation ? 'unidad' : 'unidad',
        barcode: '',
        productType: 'elaborado',
        status: 'active',
        posAvailable: true,
        tiendaAvailable: true,
        advanceType: isReservation ? 'porcentaje' : 'sin',
        advanceValue: isReservation ? 30 : 0,
        minHours: isReservation ? 48 : 24,
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
        wholesaleMinQty: 0,
        reservationEnabled: isReservation,
        maxReservations: isReservation ? 10 : 0,
        reservationDays: isReservation ? 30 : 0,
        reservationDeposit: 0,
        promoEnabled: false,
        promoType: 'discount',
        promoValue: 0,
        promoBuyQty: 0,
        promoGetQty: 0,
        promoStart: null,
        promoEnd: null,
        createdAt: now,
        updatedAt: now,
      },
    });
    if (isReservation) reservationCount++; else immediateCount++;
  }
  console.log(`  ✓ ${scraped.length} productos (${reservationCount} reservas + ${immediateCount} venta directa)\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ CATÁLOGO REAL SEMBRADO');
  console.log(`  Reservas: ${reservationCount} productos (tortas, pasteles, sueños)`);
  console.log(`  Venta Directa: ${immediateCount} productos (dulces finos + buffet)`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch((err) => { console.error('❌ Error:', err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
