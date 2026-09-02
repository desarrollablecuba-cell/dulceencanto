/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SEED DULCES FINOS — Categoría aparte + 13 productos a 40 USD la docena
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ¿Qué hace?
 *   1. Crea/actualiza la categoría "Dulces Finos" (slug: dulces-finos),
 *      SEPARADA de "Dulces Finos y Buffet" (slug: dulces-finos-buffet).
 *      → order 4, icono 🍬 e imagen real (una de las subidas por el admin).
 *   2. Crea/actualiza 13 productos de dulces finos con precio 40 USD la
 *      docena (28000 CUP a tasa 700) e imágenes reales subidas por el
 *      admin desde el sandbox.
 *   3. Actualiza precios de pasteles y tortas:
 *      → Pasteles de Dos Pisos:  120 USD (84000 CUP)
 *      → Pasteles de Tres Pisos: 140 USD (98000 CUP)
 *      → Torta Sencilla: 30 USD (21000 CUP)
 *      → Torta Mediana:  40 USD (28000 CUP)
 *      → Torta Alta:     60 USD (42000 CUP)
 *
 *  Idempotente: puede ejecutarse N veces sin duplicar datos.
 *  Funciona con SQLite (sandbox) y MySQL (Railway / Hostinger) porque usa
 *  PrismaClient: DATABASE_URL decide el proveedor.
 *
 *  Uso:
 *    npx tsx scripts/seed-dulces-finos.ts        (sandbox / local)
 *    bun run scripts/seed-dulces-finos.ts        (con bun)
 *    (Railway lo ejecuta vía db-setup.mjs — ver paso 6 allí)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const now = new Date().toISOString();

/** Tasa USD→CUP usada en toda la tienda (currency-store.ts: USD_RATE=700). */
const USD_RATE = 700;
const usd = (n: number) => Math.round(n * USD_RATE);

// ─── 1. CATEGORÍA DULCES FINOS ──────────────────────────────────────────────

const CAT_ID = 'cat-dulces-finos-puros'; // usado SOLO si la categoría aún no existe
const CAT = {
  name: 'Dulces Finos',
  slug: 'dulces-finos',
  icon: '🍬',
  // Imagen real subida por el admin (cupcakes) — servida por /api/uploads
  image: '/api/uploads/products/prod-1788326250693-8cd14b2ee035.webp',
  order: 4, // entre Pasteles de Tres Pisos (3) y Dulces Finos y Buffet (5)
  active: true,
};

// ─── 2. LOS 13 DULCES FINOS — 40 USD la docena ─────────────────────────────

interface FinosProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  /** true → actualizar por slug de categoría aunque cambie el id local */
  matchName: string;
}

const FINOS: FinosProduct[] = [
  {
    id: 'df-cupcakes', name: 'Cupcakes',
    description: 'Docena de cupcakes artesanales con cobertura de buttercream decorada. Ideales para regalar y celebrar.',
    image: '/api/uploads/products/prod-1788326250693-8cd14b2ee035.webp',
    matchName: 'cupcakes',
  },
  {
    id: 'df-paletas', name: 'Paletas',
    description: 'Docena de paletas dulces con cobertura de chocolate y decoración colorida, elaboradas a mano.',
    image: '/api/uploads/products/prod-1788325966358-df1444c91794.webp',
    matchName: 'paletas',
  },
  {
    id: 'df-cheesecake', name: 'Cheesecake',
    description: 'Docena de cheesecakes cremosos de queso con base de galleta y cobertura de frutas.',
    image: '/api/uploads/products/prod-1788326202607-d57297c4fd0b.webp',
    matchName: 'cheesecake',
  },
  {
    id: 'df-cakepops', name: 'Cakepops',
    description: 'Docena de cakepops esponjosos bañados en chocolate y decorados al detalle, perfectos para eventos.',
    image: '/api/uploads/products/prod-1788325934165-b7e7bc2d07ba.webp',
    matchName: 'cakepops',
  },
  {
    id: 'df-merenguitos', name: 'Merenguitos',
    description: 'Docena de merenguitos crujientes y ligeros, horneados lentamente para un dulce que se deshace en la boca.',
    image: '/products/de/merenguitos-dozen.webp',
    matchName: 'merenguito',
  },
  {
    id: 'df-mini-flanes', name: 'Mini Flanes',
    description: 'Docena de mini flanes con caramelo artesanal, textura suave y sabor casero inolvidable.',
    image: '/api/uploads/products/prod-1788326117456-dccef7d8197a.webp',
    matchName: 'flan',
  },
  {
    id: 'df-brownies', name: 'Brownies',
    description: 'Docena de brownies de chocolate intenso, húmedos por dentro y con costra crocante.',
    image: '/api/uploads/products/prod-1788326175622-d1802eeed48c.webp',
    matchName: 'brownie',
  },
  {
    id: 'df-tartaletas', name: 'Tartaletas',
    description: 'Docena de tartaletas rellenas con crema y frutas frescas sobre masa quebrada horneada al momento.',
    image: '/api/uploads/products/prod-1788326086527-497efb5abff8.webp',
    matchName: 'tartaleta',
  },
  {
    id: 'df-donas', name: 'Donas',
    description: 'Docena de donas esponjosas con glaseados y coberturas de chocolate, virutas y colores surtidos.',
    image: '/api/uploads/products/prod-1788326029578-cb494cba2559.webp',
    matchName: 'dona',
  },
  {
    id: 'df-vasos', name: 'Vasos',
    description: 'Docena de vasos dulces en capas: postres cremosos listos para servir en fiestas y reuniones.',
    image: '/products/de/de-025-22--vasos-de-tres-leches.webp',
    matchName: 'vasos',
  },
  {
    id: 'df-macarons', name: 'Macarons',
    description: 'Docena de macarons franceses de almendra con rellenos cremosos en colores pasteles.',
    image: '/api/uploads/products/prod-1788326057278-ef1ed12775bc.webp',
    matchName: 'macaron',
  },
  {
    id: 'df-pavlovas', name: 'Pavlovas',
    description: 'Docena de pavlovas de merengue crocante con crema batida y frutas frescas de temporada.',
    image: '/api/uploads/products/prod-1788325182971-6adfbfd140e1.webp',
    matchName: 'pavlova',
  },
  {
    id: 'df-verrines', name: 'Verrines',
    description: 'Docena de verrines: postres en vaso en capas de mousse, bizcocho y frutas, elegantes listos para servir.',
    image: '/api/uploads/products/prod-1788324963605-fef11d9abf39.webp',
    matchName: 'verrine',
  },
];

const PRECIO_DOCENA = usd(40); // 28000 CUP = 40 USD

// ─── 3. ACTUALIZACIÓN DE PRECIOS (pasteles y tortas) ───────────────────────

async function actualizarPrecios() {
  // Pasteles de Dos Pisos → 120 USD
  const r1 = await prisma.product.updateMany({
    where: { categoryId: 'cat-pasteles-dos-pisos' },
    data: { price: usd(120), updatedAt: now },
  });

  // Pasteles de Tres Pisos → 140 USD
  const r2 = await prisma.product.updateMany({
    where: { categoryId: 'cat-pasteles-tres-pisos' },
    data: { price: usd(140), updatedAt: now },
  });

  // Tortas: Sencilla 30 / Mediana 40 / Alta 60 USD
  const r3 = await prisma.product.updateMany({
    where: { name: { contains: 'Torta Sencilla' } },
    data: { price: usd(30), updatedAt: now },
  });
  const r4 = await prisma.product.updateMany({
    where: { name: { contains: 'Torta Mediana' } },
    data: { price: usd(40), updatedAt: now },
  });
  const r5 = await prisma.product.updateMany({
    where: { name: { contains: 'Torta Alta' } },
    data: { price: usd(60), updatedAt: now },
  });

  console.log(
    `  ✓ Precios actualizados: dos pisos(${r1.count}×120USD) tres pisos(${r2.count}×140USD) ` +
      `sencillas(${r3.count}×30USD) medianas(${r4.count}×40USD) altas(${r5.count}×60USD)`
  );
}

// ─── EJECUCIÓN ──────────────────────────────────────────────────────────────

async function main() {
  console.log('🍬 SEED DULCES FINOS + PRECIOS — Dulce Encanto');

  // 1. Categoría — reutilizar la existente (creada desde el admin) si existe
  let cat =
    (await prisma.category.findUnique({ where: { slug: CAT.slug } })) ??
    (await prisma.category.findUnique({ where: { id: CAT_ID } }));
  if (cat) {
    await prisma.category.update({ where: { id: cat.id }, data: { ...CAT, updatedAt: now } });
    console.log(`  ✓ Categoría "Dulces Finos" actualizada (id: ${cat.id})`);
  } else {
    cat = await prisma.category.create({
      data: { id: CAT_ID, ...CAT, createdAt: now, updatedAt: now },
    });
    console.log(`  ✓ Categoría "Dulces Finos" creada (id: ${cat.id})`);
  }
  const catId = cat.id;

  // 2. Productos (upsert por id + rescate de los creados manualmente por el
  //    admin con otros ids, para no duplicar)
  for (const p of FINOS) {
    let target = await prisma.product.findUnique({ where: { id: p.id } });
    if (!target) {
      // Buscar producto equivalente creado a mano en la categoría dulces-finos
      const candidatos = await prisma.product.findMany({
        where: {
          categoryId: catId,
          name: { contains: p.matchName },
        },
        take: 1,
      });
      target = candidatos[0] ?? null;
    }
    const data = {
      name: p.name,
      description: p.description,
      price: PRECIO_DOCENA,
      image: p.image,
      saleUnit: 'docena',
      categoryId: catId,
      tags: JSON.stringify(['dulces-finos', 'venta-directa']),
      status: 'active',
      productType: 'elaborado',
      posAvailable: true,
      tiendaAvailable: true,
      reservationEnabled: false,
      stock: 50,
      minHours: 24,
      advanceType: 'sin',
      updatedAt: now,
    };
    if (target) {
      // Conservar imagen subida si el producto ya tenía una real
      const keepImage =
        target.image && target.image.startsWith('/api/uploads/products/') ? undefined : p.image;
      await prisma.product.update({
        where: { id: target.id },
        data: { ...data, image: keepImage ?? data.image },
      });
      console.log(`  ✓ ${p.name}: 40 USD/docena (id: ${target.id})`);
    } else {
      const newId = p.id;
      await prisma.product.create({
        data: {
          id: newId,
          sku: `DF-${p.id.replace('df-', '').slice(0, 3).toUpperCase()}`,
          images: '[]',
          rating: 4.8,
          reviewCount: 0,
          featured: false,
          order: FINOS.findIndex((f) => f.id === p.id),
          barcode: '',
          minHoursUnit: 'horas',
          costPrice: 0,
          marginPercent: 0,
          offerEnabled: false,
          offerType: 'permanente',
          offerPrice: 0,
          wholesaleEnabled: false,
          wholesalePrice: 0,
          wholesaleMinQty: 0,
          maxReservations: 0,
          reservationDays: 0,
          reservationDeposit: 0,
          promoEnabled: false,
          promoType: 'discount',
          promoValue: 0,
          promoBuyQty: 0,
          promoGetQty: 0,
          createdAt: now,
          ...data,
        } as Parameters<typeof prisma.product.create>[0]['data'],
      });
      console.log(`  ✓ ${p.name}: creado con 40 USD/docena`);
    }
  }

  // 3. Precios de pasteles y tortas
  await actualizarPrecios();

  // Resumen
  const total = await prisma.product.count({ where: { categoryId: catId } });
  console.log(`✅ Listo: ${total} dulces finos a 40 USD la docena en "Dulces Finos".`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed-dulces-finos:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
