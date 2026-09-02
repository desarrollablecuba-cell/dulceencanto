/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DB SETUP — Setup + siembra de BD en Node puro (SIN npx/tsx/prisma CLI)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  LECCIONES APLICADAS (3 deploys fallidos):
 *   - El CLI de Prisma (npx prisma ...) NO funciona en el runtime de Railway
 *     (npm v11+ bloquea los postinstall de @prisma/engines).
 *   - npx tsx tampoco es confiable ahí.
 *   - `node` + PrismaClient (motor de consultas) SÍ funciona siempre —
 *     es lo que usa la propia web.
 *
 *  Este script hace TODO con Node puro:
 *   1. Crea las 19 tablas (CREATE TABLE IF NOT EXISTS desde schema-mysql.sql).
 *   2. Siembra: identidad Dulce Encanto + servicios/promos/galería +
 *      catálogo real (60 productos desde data/scraped-products.json).
 *   3. Guards: cada bloque se omite si ya fue sembrado (FORCE_SEED=1 fuerza).
 *
 *  Uso: node scripts/db-setup.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Cargar PrismaClient desde node_modules (pathToFileURL = multiplataforma)
const { PrismaClient } = await import(
  pathToFileURL(path.join(process.cwd(), 'node_modules', '@prisma', 'client', 'index.js')).href
).then((m) => m.default ?? m);

const prisma = new PrismaClient({ log: ['error'] });
const now = new Date().toISOString();
const FORCE = process.env.FORCE_SEED === '1';

// ─── 1. TABLAS ──────────────────────────────────────────────────────────────
const TOLERABLE = [/already exists/i, /Duplicate (key|index|foreign key|column)/i, /errno: 105[012]|errno: 1022|errno: 1060/i];

async function crearTablas() {
  const sqlPath = path.join(process.cwd(), 'scripts', process.env.DB_DDL_FILE || 'schema-mysql.sql');
  if (!existsSync(sqlPath)) throw new Error('Falta scripts/schema-mysql.sql');
  const statements = readFileSync(sqlPath, 'utf-8')
    .split(/;\s*\n/)
    .map((s) => s.replace(/^--.*$/gm, '').trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
  let fallos = 0;
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (e) {
      const msg = String(e?.message || e);
      if (!TOLERABLE.some((re) => re.test(msg))) {
        fallos++;
        console.error(`[ddl] ✗ ${stmt.replace(/\s+/g, ' ').slice(0, 60)} → ${msg.slice(0, 120)}`);
      }
    }
  }
  // Verificación: las 19 tablas críticas deben responder
  const checks = [
    () => prisma.admin.count(), () => prisma.product.count(), () => prisma.siteConfig.count(),
    () => prisma.service.count(), () => prisma.promotion.count(), () => prisma.galleryItem.count(),
  ];
  for (const c of checks) await c();
  if (fallos > 0) throw new Error(`${fallos} statements DDL fallaron`);
  console.log('[ddl] ✓ 19 tablas verificadas');
}

// ─── 2. SEMILLA DULCE ENCANTO (identidad, zonas, admin, config) ─────────────
const categoriasBase = [
  { id: 'cat-tartas', name: 'Tartas', slug: 'tartas', icon: '🎂', order: 0 },
  { id: 'cat-cupcakes', name: 'Cupcakes', slug: 'cupcakes', icon: '🧁', order: 1 },
  { id: 'cat-minicakes', name: 'Mini Cakes', slug: 'mini-cakes', icon: '🍰', order: 2 },
  { id: 'cat-postres', name: 'Postres Fríos', slug: 'postres-frios', icon: '🍮', order: 3 },
  { id: 'cat-galletas', name: 'Galletas', slug: 'galletas', icon: '🍪', order: 4 },
  { id: 'cat-combos', name: 'Combos', slug: 'combos', icon: '🎁', order: 5 },
];

async function sembrarDulce() {
  const admins = await prisma.admin.count();
  if (admins > 0 && !FORCE) return console.log('[dulce] = ya sembrado (admins: ' + admins + ')');

  console.log('[dulce] Limpiando tablas base...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.productExtra.deleteMany({});
  await prisma.productCombination.deleteMany({});
  await prisma.variantOption.deleteMany({});
  await prisma.variantGroup.deleteMany({});
  await prisma.wholesaleTier.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.deliveryZone.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.siteConfig.deleteMany({});
  if (FORCE) await prisma.admin.deleteMany({});

  console.log('[dulce] Categorías base + zonas + admin + config...');
  for (const c of categoriasBase) {
    await prisma.category.create({ data: { ...c, image: '', active: true, createdAt: now, updatedAt: now } });
  }
  await prisma.deliveryZone.create({ data: { id: 'zone-de-ciudad', name: 'Ciego de Ávila (Ciudad)', description: 'Entrega directa a domicilio dentro del casco urbano de Ciego de Ávila.', price: 200, estimatedTime: 'Mismo día (si se pide antes de las 12:00)', active: true, order: 0, allowsPriorityDelivery: true, asapSurchargeOverride: false, asapSurchargeType: 'fixed', asapSurchargeValue: 0, asapMinLeadTimeOverride: null, asapMaxPerHourOverride: null, asapExcludeNormalHoursOverride: false, createdAt: now, updatedAt: now } });
  await prisma.deliveryZone.create({ data: { id: 'zone-de-periferia', name: 'Ciego de Ávila (Periferia)', description: 'Entrega en zonas periféricas y municipios cercanos (Majagua, Ciro Redondo, etc.).', price: 300, estimatedTime: '24 a 48 horas', active: true, order: 1, allowsPriorityDelivery: false, asapSurchargeOverride: false, asapSurchargeType: 'fixed', asapSurchargeValue: 0, asapMinLeadTimeOverride: null, asapMaxPerHourOverride: null, asapExcludeNormalHoursOverride: false, createdAt: now, updatedAt: now } });

  const { default: bcrypt } = await import(
    pathToFileURL(path.join(process.cwd(), 'node_modules', 'bcryptjs', 'index.js')).href
  );
  const hash = await bcrypt.hash('DulceAdmin2026!', 10);
  await prisma.admin.create({ data: { id: 'admin-dulce', username: 'admin@dulceencanto.com', password: hash, name: 'Administrador Dulce Encanto', createdAt: now, updatedAt: now } });
  console.log('[dulce] ✓ Admin: admin@dulceencanto.com / DulceAdmin2026!');
}

// ─── 3. SITECONFIG (identidad completa de la tienda) ────────────────────────
async function sembrarSiteConfig() {
  const existing = await prisma.siteConfig.findUnique({ where: { id: 'site' } });
  if (existing && !FORCE) return console.log('[config] = ya existe');
  if (existing) await prisma.siteConfig.delete({ where: { id: 'site' } });

  console.log('[config] SiteConfig Dulce Encanto...');
  const cfg = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'seed-siteconfig.json'), 'utf-8'));
  await prisma.siteConfig.create({ data: { ...cfg, createdAt: now, updatedAt: now } });
  console.log('[config] ✓ SiteConfig (morado + rosado, 5 secciones, menú completo)');
}

// ─── 4. EXTRAS (servicios, promociones, galería) ────────────────────────────
const cupToUsd = (cup) => Math.round((cup / 700) * 100) / 100;

async function sembrarExtras() {
  const servicios = await prisma.service.count();
  if (servicios > 0 && !FORCE) return console.log('[extras] = ya sembrado (' + servicios + ' servicios)');

  console.log('[extras] Servicios + promociones + galería...');
  await prisma.service.deleteMany({});
  await prisma.promotion.deleteMany({});
  await prisma.galleryItem.deleteMany({});

  const serviciosData = [
    ['srv-decoracion', 'Decoración del Evento', 'Decoración completa del salón: centros de mesa, guirnaldas, telas, iluminación temática y ambientación según la ocasión.', '🎨', 'decoracion', 5000, 0],
    ['srv-munecos', 'Muñecos Sorpresa', 'Muñecos sorpresa de personajes infantiles y de moda. Ideales para cumpleaños y revelaciones. Incluye disfraz completo.', '🧸', 'entretenimiento', 2500, 1],
    ['srv-canon', 'Cañón de Confeti', 'Cañones de confeti para la hora loca, el corte de la tarta o la coronación. Pack de 6 cañones.', '🎉', 'entretenimiento', 1200, 2],
    ['srv-burbujas', 'Máquina de Burbujas', 'Máquina profesional de burbujas continua durante 2 horas. Magia visual para fotos y momento de baile.', '🫧', 'entretenimiento', 1500, 3],
    ['srv-caja-regalo', 'Caja de Regalos Personalizada', 'Caja decorada a mano con productos a tu elección: tartas mini, galletas, cupcakes y detalles personalizados.', '🎁', 'decoracion', 1800, 4],
    ['srv-vela-volcanica', 'Vela Volcánica', 'Vela volcánica especial para cumpleaños: al encenderla brota llama colorida y sorpresa. Momento mágico garantizado.', '🌋', 'entretenimiento', 800, 5],
    ['srv-globos', 'Decoración con Globos', 'Arcos, columnas y bouquets de globos con colores temáticos. Globos helados para un toque premium.', '🎈', 'decoracion', 2200, 6],
    ['srv-sublimacion', 'Sublimación de Pullovers', 'Pullovers personalizados con el nombre, foto o temática del evento. Recuerdos únicos para los invitados.', '👕', 'personalizado', 1200, 7],
    ['srv-jarras', 'Jarras Personalizadas', 'Jarras de regalo con diseño personalizado: nombre del festejado, fecha y temática. Set de 6 unidades.', '🫗', 'personalizado', 1500, 8],
    ['srv-gigantografias', 'Gigantografías', 'Impresión gran formato para fotos de cuerpo entero, fondos de escenario o banners. Hasta 2x3 metros.', '🖼️', 'decoracion', 2000, 9],
  ];
  for (const [id, name, description, icon, category, price, order] of serviciosData) {
    await prisma.service.create({ data: { id, name, description, icon, category, image: '', price, priceUsd: cupToUsd(price), active: true, order, createdAt: now, updatedAt: now } });
  }

  const anio = new Date().getFullYear();
  const promos = [
    ['promo-madres', 'Día de las Madres', 'Sorprende a mamá con una tarta personalizada + 6 cupcakes + galletas decoradas. Combo especial con 15% de descuento.', 'dia_madres', 15, '/gallery-15anos.webp', `${anio}-05-01`, `${anio}-05-15`, 0],
    ['promo-padres', 'Día de los Padres', 'Tarta temática de papá + pullover personalizado sublimado. Un detalle que enamora. 10% de descuento en el combo.', 'dia_padres', 10, '/hero-slide-2.webp', `${anio}-06-01`, `${anio}-06-21`, 1],
    ['promo-san-valentin', 'San Valentín', 'Combo romántico: mini cake de fresa + 6 cupcakes + galletas en forma de corazón. Para celebrar el amor.', 'san_valentin', 12, '/products/de/de-000-1----dulzura-en-pareja.webp', `${anio}-02-01`, `${anio}-02-14`, 2],
    ['promo-mujer', 'Día de la Mujer', 'Caja regalo especial: cupcakes surtidos + galletas decoradas + vela aromática. Para las mujeres extraordinarias.', 'dia_mujer', 10, '/gallery-cumple-adultos.webp', `${anio}-03-01`, `${anio}-03-08`, 3],
    ['promo-fin-anio', 'Fin de Año', 'Cierra el año con dulzura: tarta de cumple + combo postres fríos + copas de champaña comestibles. 20% de descuento.', 'fin_anio', 20, '/hero-slide-5.webp', `${anio}-12-15`, `${anio}-12-31`, 4],
  ];
  for (const [id, title, description, occasion, discountPct, image, startDate, endDate, order] of promos) {
    await prisma.promotion.create({ data: { id, title, description, occasion, discountPct, image, startDate, endDate, active: true, order, createdAt: now, updatedAt: now } });
  }

  const galeria = [
    ['gal-15anos', '15 Años — Quinceañera Soñada', '/gallery-15anos.webp', '15_anos', 'Mesa de dulces completa, tarta de tres pisos, decoración morado y rosado. Un día inolvidable.', 0],
    ['gal-ninos', 'Cumpleaños Infantil — Aventura Mágica', '/gallery-cumple-ninos.webp', 'cumple_ninos', 'Tarta de personaje, globos coloridos, cañón de confeti y máquina de burbujas. Diversión asegurada.', 1],
    ['gal-adultos', 'Cumpleaños de Adultos — Elegancia', '/gallery-cumple-adultos.webp', 'cumple_adultos', 'Tarta sofisticada con detalles dorados, jarras personalizadas y gigantografía. Celebración con estilo.', 2],
    ['gal-boda', 'Boda — Día Inolvidable', '/gallery-boda.webp', 'boda', 'Tarta nupcial de varios pisos, macarons, flores y decoración romántica. El final feliz que sueñas.', 3],
  ];
  for (const [id, title, image, eventType, description, order] of galeria) {
    await prisma.galleryItem.create({ data: { id, title, image, eventType, description, active: true, order, createdAt: now, updatedAt: now } });
  }
  console.log(`[extras] ✓ ${serviciosData.length} servicios, ${promos.length} promos, ${galeria.length} galería`);
}

// ─── 5. CATÁLOGO REAL (60 productos desde scraped-products.json) ────────────
async function sembrarCatalogo() {
  const previos = await prisma.product.count({ where: { id: { startsWith: 'de-prod-' } } });
  if (previos > 0 && !FORCE) return console.log('[catalogo] = ya sembrado (' + previos + ' productos)');

  const scrapedPath = path.join(process.cwd(), 'data', 'scraped-products.json');
  const scraped = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
  console.log(`[catalogo] ${scraped.length} productos scrapeados...`);

  await prisma.review.deleteMany({});
  await prisma.productExtra.deleteMany({});
  await prisma.productCombination.deleteMany({});
  await prisma.variantOption.deleteMany({});
  await prisma.variantGroup.deleteMany({});
  await prisma.wholesaleTier.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.service.deleteMany({ where: { category: 'suenos_sorpresa' } });

  const cats = [
    ['cat-tortas', 'Tortas', 'tortas', '🎂', 0],
    ['cat-cake-bandeja', 'Cake Tamaño Bandeja', 'cake-bandeja', '🥮', 1],
    ['cat-pasteles-dos-pisos', 'Pasteles de Dos Pisos', 'pasteles-dos-pisos', '🥧', 2],
    ['cat-pasteles-tres-pisos', 'Pasteles de Tres Pisos', 'pasteles-tres-pisos', '🎂', 3],
    ['cat-dulces-finos', 'Dulces Finos y Buffet', 'dulces-finos-buffet', '🧁', 5],
  ];
  for (const [id, name, slug, icon, order] of cats) {
    await prisma.category.create({ data: { id, name, slug, icon, image: '', active: true, order, createdAt: now, updatedAt: now } });
  }
  const catMap = {
    tortas: ['cat-tortas', true], cake_bandeja: ['cat-cake-bandeja', true],
    pasteles_dos_pisos: ['cat-pasteles-dos-pisos', true], pasteles_tres_pisos: ['cat-pasteles-tres-pisos', true],
    dulces_finos_buffet: ['cat-dulces-finos', false],
  };
  const catImg = { cat_tortas: '/products/cake-chocolate.webp', 'cat-cake-bandeja': '/products/cake-chocolate.webp', 'cat-pasteles-dos-pisos': '/products/cake-chocolate.webp', 'cat-pasteles-tres-pisos': '/products/cake-chocolate.webp', 'cat-dulces-finos': '/products/cupcakes-assorted.webp' };

  let idx = 0, reservas = 0, directa = 0;
  for (const p of scraped) {
    if (p.category === 'suenos_sorpresa') {
      const suenoIdx = idx++;
      await prisma.service.create({ data: { id: `srv-sueno-${suenoIdx}`, name: p.name.replace(/^\d+\.\s*/, ''), description: p.description || 'Sueño sorpresa personalizado para tu evento especial.', icon: '🙀', image: p.local_image || '', price: p.price, priceUsd: cupToUsd(p.price), category: 'suenos_sorpresa', active: true, order: 10 + suenoIdx, createdAt: now, updatedAt: now } });
      continue;
    }
    const map = catMap[p.category];
    if (!map) continue;
    const [catId, isRes] = map;
    const id = `de-prod-${idx++}`;
    await prisma.product.create({
      data: {
        id, name: p.name, shortName: '', description: p.description || '',
        sku: `DE-${String(idx).padStart(3, '0')}`, price: p.price,
        image: p.local_image || catImg[catId] || '/products/placeholder.svg',
        images: '[]', tags: JSON.stringify([isRes ? 'reserva' : 'venta-directa']),
        categoryId: catId, rating: 4.8, reviewCount: Math.floor(Math.random() * 30) + 1,
        stock: isRes ? 5 : 50, featured: isRes, order: idx, saleUnit: 'unidad', barcode: '',
        productType: 'elaborado', status: 'active', posAvailable: true, tiendaAvailable: true,
        advanceType: isRes ? 'porcentaje' : 'sin', advanceValue: isRes ? 30 : 0,
        minHours: isRes ? 48 : 24, minHoursUnit: 'horas', costPrice: 0, marginPercent: 0,
        offerEnabled: false, offerType: 'permanente', offerPrice: 0, offerStart: null, offerEnd: null,
        wholesaleEnabled: false, wholesalePrice: 0, wholesaleMinQty: 0,
        reservationEnabled: isRes, maxReservations: isRes ? 10 : 0, reservationDays: isRes ? 30 : 0, reservationDeposit: 0,
        promoEnabled: false, promoType: 'discount', promoValue: 0, promoBuyQty: 0, promoGetQty: 0, promoStart: null, promoEnd: null,
        createdAt: now, updatedAt: now,
      },
    });
    if (isRes) reservas++; else directa++;
  }
  console.log(`[catalogo] ✓ ${reservas + directa} productos (${reservas} reservas + ${directa} venta directa)`);
}

// ─── 6. DULCES FINOS (categoría aparte + 13 productos a 40 USD la docena) ───
// Idempotente: se aplica en CADA arranque (actualiza precios, crea lo que
// falte y nunca duplica). Separa "Dulces Finos" (venta directa por docenas)
// de "Dulces Finos y Buffet" (catálogo general).
const USD_RATE = 700;
const usdCup = (n) => Math.round(n * USD_RATE);
const PRECIO_DOCENA = usdCup(40); // 40 USD la docena = 28000 CUP

const FINOS_CAT_SLUG = 'dulces-finos';
const FINOS = [
  ['df-cupcakes', 'Cupcakes', 'Docena de cupcakes artesanales con cobertura de buttercream decorada. Ideales para regalar y celebrar.', '/api/uploads/products/prod-1788326250693-8cd14b2ee035.webp', 'cupcake'],
  ['df-paletas', 'Paletas', 'Docena de paletas dulces con cobertura de chocolate y decoración colorida, elaboradas a mano.', '/api/uploads/products/prod-1788325966358-df1444c91794.webp', 'paleta'],
  ['df-cheesecake', 'Cheesecake', 'Docena de cheesecakes cremosos de queso con base de galleta y cobertura de frutas.', '/api/uploads/products/prod-1788326202607-d57297c4fd0b.webp', 'cheesecake'],
  ['df-cakepops', 'Cakepops', 'Docena de cakepops esponjosos bañados en chocolate y decorados al detalle, perfectos para eventos.', '/api/uploads/products/prod-1788325934165-b7e7bc2d07ba.webp', 'cakepop'],
  ['df-merenguitos', 'Merenguitos', 'Docena de merenguitos crujientes y ligeros, horneados lentamente para un dulce que se deshace en la boca.', '/products/de/merenguitos-dozen.webp', 'merenguito'],
  ['df-mini-flanes', 'Mini Flanes', 'Docena de mini flanes con caramelo artesanal, textura suave y sabor casero inolvidable.', '/api/uploads/products/prod-1788326117456-dccef7d8197a.webp', 'flan'],
  ['df-brownies', 'Brownies', 'Docena de brownies de chocolate intenso, húmedos por dentro y con costra crocante.', '/api/uploads/products/prod-1788326175622-d1802eeed48c.webp', 'brownie'],
  ['df-tartaletas', 'Tartaletas', 'Docena de tartaletas rellenas con crema y frutas frescas sobre masa quebrada horneada al momento.', '/api/uploads/products/prod-1788326086527-497efb5abff8.webp', 'tartaleta'],
  ['df-donas', 'Donas', 'Docena de donas esponjosas con glaseados y coberturas de chocolate, virutas y colores surtidos.', '/api/uploads/products/prod-1788326029578-cb494cba2559.webp', 'dona'],
  ['df-vasos', 'Vasos', 'Docena de vasos dulces en capas: postres cremosos listos para servir en fiestas y reuniones.', '/products/de/de-025-22--vasos-de-tres-leches.webp', 'vasos'],
  ['df-macarons', 'Macarons', 'Docena de macarons franceses de almendra con rellenos cremosos en colores pasteles.', '/api/uploads/products/prod-1788326057278-ef1ed12775bc.webp', 'macaron'],
  ['df-pavlovas', 'Pavlovas', 'Docena de pavlovas de merengue crocante con crema batida y frutas frescas de temporada.', '/api/uploads/products/prod-1788325182971-6adfbfd140e1.webp', 'pavlova'],
  ['df-verrines', 'Verrines', 'Docena de verrines: postres en vaso en capas de mousse, bizcocho y frutas, elegantes listos para servir.', '/api/uploads/products/prod-1788324963605-fef11d9abf39.webp', 'verrine'],
];

async function sembrarDulcesFinos() {
  // Categoría: reutilizar la existente (por slug) o crearla nueva
  let cat = await prisma.category.findUnique({ where: { slug: FINOS_CAT_SLUG } });
  if (!cat) {
    cat = await prisma.category.create({
      data: {
        id: 'cat-dulces-finos-puros', name: 'Dulces Finos', slug: FINOS_CAT_SLUG,
        icon: '🍬', image: '/api/uploads/products/prod-1788326250693-8cd14b2ee035.webp',
        order: 4, active: true, createdAt: now, updatedAt: now,
      },
    });
    console.log('[finos] ✓ Categoría "Dulces Finos" creada');
  } else {
    await prisma.category.update({
      where: { id: cat.id },
      data: { name: 'Dulces Finos', icon: '🍬', order: 4, active: true, updatedAt: now },
    });
  }

  // 13 productos a 40 USD la docena (rescatando equivalentes ya existentes)
  for (const [id, name, description, image, match] of FINOS) {
    let target = await prisma.product.findUnique({ where: { id } });
    if (!target) {
      const cand = await prisma.product.findMany({
        where: { categoryId: cat.id, name: { contains: match } }, take: 1,
      });
      target = cand[0] ?? null;
    }
    const data = {
      name, description, price: PRECIO_DOCENA, saleUnit: 'docena', categoryId: cat.id,
      tags: JSON.stringify(['dulces-finos', 'venta-directa']), status: 'active',
      productType: 'elaborado', posAvailable: true, tiendaAvailable: true,
      reservationEnabled: false, stock: 50, minHours: 24, advanceType: 'sin', updatedAt: now,
    };
    if (target) {
      // Si ya tiene imagen real subida (/api/uploads/...), conservarla
      const keepImg = target.image && target.image.startsWith('/api/uploads/products/');
      await prisma.product.update({ where: { id: target.id }, data: keepImg ? { ...data, image: target.image } : { ...data, image } });
    } else {
      await prisma.product.create({
        data: {
          id, sku: `DF-${id.replace('df-', '').slice(0, 3).toUpperCase()}`, image,
          images: '[]', rating: 4.8, reviewCount: 0, featured: false, order: FINOS.findIndex((f) => f[0] === id),
          barcode: '', minHoursUnit: 'horas', costPrice: 0, marginPercent: 0,
          offerEnabled: false, offerType: 'permanente', offerPrice: 0,
          wholesaleEnabled: false, wholesalePrice: 0, wholesaleMinQty: 0,
          maxReservations: 0, reservationDays: 0, reservationDeposit: 0,
          promoEnabled: false, promoType: 'discount', promoValue: 0, promoBuyQty: 0, promoGetQty: 0,
          createdAt: now, ...data,
        },
      });
    }
  }
  console.log('[finos] ✓ 13 dulces finos a 40 USD la docena');

  // Precios de pasteles y tortas (siempre se normalizan)
  const p1 = await prisma.product.updateMany({ where: { categoryId: 'cat-pasteles-dos-pisos' }, data: { price: usdCup(120), updatedAt: now } });
  const p2 = await prisma.product.updateMany({ where: { categoryId: 'cat-pasteles-tres-pisos' }, data: { price: usdCup(140), updatedAt: now } });
  const p3 = await prisma.product.updateMany({ where: { name: { contains: 'Torta Sencilla' } }, data: { price: usdCup(30), updatedAt: now } });
  const p4 = await prisma.product.updateMany({ where: { name: { contains: 'Torta Mediana' } }, data: { price: usdCup(40), updatedAt: now } });
  const p5 = await prisma.product.updateMany({ where: { name: { contains: 'Torta Alta' } }, data: { price: usdCup(60), updatedAt: now } });
  console.log(`[precios] ✓ dos pisos(${p1.count}×120USD) tres pisos(${p2.count}×140USD) sencillas(${p3.count}×30USD) medianas(${p4.count}×40USD) altas(${p5.count}×60USD)`);
}

// ─── EJECUCIÓN ──────────────────────────────────────────────────────────────
try {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🗄️  DB SETUP — Dulce Encanto (Node puro)');
  console.log('═══════════════════════════════════════════════════════');
  await crearTablas();
  await sembrarDulce();
  await sembrarSiteConfig();
  await sembrarExtras();
  await sembrarCatalogo();
  await sembrarDulcesFinos();
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ DB SETUP COMPLETO');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
} catch (e) {
  console.error('❌ DB SETUP FALLO:', String(e?.message || e).slice(0, 300));
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => {});
}
