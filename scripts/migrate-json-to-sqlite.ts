/**
 * Script de migración: JSON → SQLite (Prisma)
 *
 * Lee todos los archivos JSON de /data/ y los inserta en la base de datos
 * SQLite usando Prisma Client. Preserva todos los IDs y datos existentes.
 *
 * Uso: npx tsx scripts/migrate-json-to-sqlite.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), 'data');

function readJson<T>(filename: string): T | null {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    console.log(`  ⚠ ${filename} no encontrado o inválido, saltando...`);
    return null;
  }
}

async function migrate() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MIGRACIÓN: JSON → MySQL (Prisma)');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Limpiar BD antes de migrar (idempotente: se puede correr varias veces)
  const shouldReset = process.argv.includes('--reset') || process.argv.includes('--fresh');

  if (shouldReset) {
    console.log('🧹 Limpiando tablas existentes (--reset)...');
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      const isSQLite = dbUrl.startsWith('file:');
      const tables = [
        'OrderItem', 'Order',
        'ProductExtra', 'ProductCombination', 'VariantOption', 'VariantGroup',
        'WholesaleTier', 'Product',
        'Review', 'Customer', 'DeliveryZone',
        'Category', 'SiteConfig', 'Admin',
      ];
      if (!isSQLite) {
        // MySQL
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
        for (const t of tables) {
          try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\`;`); } catch { /* tabla no existe */ }
        }
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

        // ── FIX CRÍTICO: asegurar que columnas `image` sean LONGTEXT ──
        // En migraciones anteriores se crearon como VARCHAR(191), pero las
        // imágenes base64 tienen 6-9KB. ALTER TABLE MODIFY COLUMN es seguro
        // de correr múltiples veces (MySQL ignora si ya es LONGTEXT).
        console.log('🔧 Asegurando columnas image como LONGTEXT...');
        const imageTables = ['Category', 'Product', 'VariantOption', 'ProductCombination', 'OrderItem'];
        for (const t of imageTables) {
          try {
            await prisma.$executeRawUnsafe(`ALTER TABLE \`${t}\` MODIFY COLUMN \`image\` LONGTEXT NOT NULL;`);
          } catch {
            /* tabla no existe o ya es LONGTEXT, ignorar */
          }
        }
        console.log('  ✓ Columnas image verificadas como LONGTEXT');
      } else {
        // SQLite
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
        for (const t of tables) {
          try { await prisma.$executeRawUnsafe(`DELETE FROM \`${t}\`;`); } catch { /* tabla no existe */ }
        }
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
      }
      console.log('  ✓ Tablas limpiadas\n');
    } catch (err: any) {
      console.log(`  ⚠ No se pudo limpiar: ${err.message}\n`);
    }
  }

  let totalErrors = 0;

  // Helper para procesar items en lote y no abortar si uno falla.
  async function processBatch<T>(
    label: string,
    items: T[],
    fn: (item: T, index: number) => Promise<void>
  ) {
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i++) {
      try {
        await fn(items[i], i);
        ok++;
      } catch (err: any) {
        failed++;
        totalErrors++;
        const item = items[i] as any;
        // Extraer la razón útil del error Prisma:
        // err.code: P2000 (too long), P2002 (unique), P2003 (FK), etc.
        // err.meta: detalles del campo problemático
        let reason = '';
        if (err.code) {
          const codeMap: Record<string, string> = {
            P2000: 'Valor demasiado largo para la columna',
            P2002: 'Unique constraint (duplicado)',
            P2003: 'Foreign key (referencia inexistente)',
            P2001: 'Record no encontrado',
            P2025: 'Record no encontrado',
          };
          reason = codeMap[err.code] || err.code;
          if (err.meta?.column_name) reason += ` → columna: ${err.meta.column_name}`;
          if (err.meta?.target) reason += ` → ${JSON.stringify(err.meta.target)}`;
          if (err.meta?.cause) reason += ` → ${err.meta.cause}`;
        } else if (err.message) {
          // Última línea útil del mensaje
          const lines = err.message.split('\n').map((l: string) => l.trim()).filter(Boolean);
          reason = lines[lines.length - 1].slice(0, 300);
        } else {
          reason = String(err);
        }
        const idPart = item?.id ? ` id=${item.id}` : '';
        console.log(`  ⚠ ${label}[${i}]${idPart}: ${reason}`);
      }
    }
    console.log(`  ✓ ${ok}/${items.length} ${label} migrados${failed ? ` (${failed} fallaron)` : ''}`);
  }

  // 1. Categories
  console.log('📂 Categorías...');
  const categories = readJson<any[]>('categories.json') || [];
  await processBatch('categorías', categories, async (c) => {
    await prisma.category.create({
      data: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon || '',
        image: c.image || '',
        order: c.order || 0,
        active: c.active !== false,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 2. Products
  console.log('📦 Productos...');
  const products = readJson<any[]>('products.json') || [];
  await processBatch('productos', products, async (p) => {
    await prisma.product.create({
      data: {
        id: p.id,
        name: p.name,
        shortName: p.shortName || '',
        description: p.description || '',
        sku: p.sku || '',
        price: Number(p.price) || 0,
        image: p.image || '',
        images: p.images || '[]',
        tags: p.tags || '[]',
        categoryId: p.categoryId || '',
        rating: Number(p.rating) || 0,
        reviewCount: Number(p.reviewCount) || 0,
        stock: Number(p.stock) || 0,
        featured: p.featured || false,
        order: Number(p.order) || 0,
        saleUnit: p.saleUnit || 'unidad',
        barcode: p.barcode || '',
        productType: p.productType || 'elaborado',
        status: p.status || 'active',
        posAvailable: p.posAvailable !== false,
        tiendaAvailable: p.tiendaAvailable !== false,
        advanceType: p.advanceType || 'sin',
        advanceValue: Number(p.advanceValue) || 0,
        minHours: Number(p.minHours) || 24,
        minHoursUnit: p.minHoursUnit || 'horas',
        costPrice: Number(p.costPrice) || 0,
        marginPercent: Number(p.marginPercent) || 0,
        offerEnabled: p.offerEnabled || false,
        offerType: p.offerType || 'permanente',
        offerPrice: Number(p.offerPrice) || 0,
        offerStart: p.offerStart || null,
        offerEnd: p.offerEnd || null,
        wholesaleEnabled: p.wholesaleEnabled || false,
        wholesalePrice: Number(p.wholesalePrice) || 0,
        wholesaleMinQty: Number(p.wholesaleMinQty) || 0,
        reservationEnabled: p.reservationEnabled || false,
        maxReservations: Number(p.maxReservations) || 0,
        reservationDays: Number(p.reservationDays) || 0,
        reservationDeposit: Number(p.reservationDeposit) || 0,
        promoEnabled: p.promoEnabled || false,
        promoType: p.promoType || 'discount',
        promoValue: Number(p.promoValue) || 0,
        promoBuyQty: Number(p.promoBuyQty) || 0,
        promoGetQty: Number(p.promoGetQty) || 0,
        promoStart: p.promoStart || null,
        promoEnd: p.promoEnd || null,
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 3. Wholesale Tiers
  console.log('💰 Wholesale Tiers...');
  const tiers = readJson<any[]>('wholesale-tiers.json') || [];
  const validProductIds = new Set(products.map((p: any) => p.id));
  await processBatch('wholesale-tiers', tiers.filter((t: any) => validProductIds.has(t.productId)), async (t) => {
    await prisma.wholesaleTier.create({
      data: {
        id: t.id,
        productId: t.productId,
        name: t.name || '',
        minQty: Number(t.minQty) || 0,
        maxQty: Number(t.maxQty) || 0,
        price: Number(t.price) || 0,
        sortOrder: Number(t.sortOrder) || 0,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 4. Variant Groups
  console.log('🎨 Variant Groups...');
  const vGroups = readJson<any[]>('variant-groups.json') || [];
  const vGroupsValid = vGroups.filter((vg: any) => validProductIds.has(vg.productId));
  await processBatch('variant-groups', vGroupsValid, async (vg) => {
    await prisma.variantGroup.create({
      data: {
        id: vg.id,
        productId: vg.productId,
        name: vg.name || '',
        required: vg.required || false,
        maxSelect: Number(vg.maxSelect) || 1,
        isImageGroup: vg.isImageGroup || false,
        isDominant: vg.isDominant || false,
        sortOrder: Number(vg.sortOrder) || 0,
        createdAt: vg.createdAt || new Date().toISOString(),
        updatedAt: vg.updatedAt || new Date().toISOString(),
      },
    });
  });
  const validGroupIds = new Set(vGroupsValid.map((g: any) => g.id));

  // 5. Variant Options (saltar los que referencian grupos inexistentes)
  console.log('🎨 Variant Options...');
  const vOptions = readJson<any[]>('variant-options.json') || [];
  const vOptionsValid = vOptions.filter((vo: any) => validGroupIds.has(vo.groupId));
  await processBatch('variant-options', vOptionsValid, async (vo) => {
    await prisma.variantOption.create({
      data: {
        id: vo.id,
        groupId: vo.groupId,
        name: vo.name || '',
        priceMod: Number(vo.priceMod) || 0,
        image: vo.image || '',
        stock: Number(vo.stock) || 0,
        available: vo.available !== false,
        sortOrder: Number(vo.sortOrder) || 0,
        createdAt: vo.createdAt || new Date().toISOString(),
        updatedAt: vo.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 6. Combinations (saltar huérfanos)
  console.log('🎨 Combinations...');
  const combos = readJson<any[]>('combinations.json') || [];
  await processBatch('combinations', combos.filter((c: any) => validProductIds.has(c.productId)), async (c) => {
    await prisma.productCombination.create({
      data: {
        id: c.id,
        productId: c.productId,
        optionIds: c.optionIds || '[]',
        sku: c.sku || '',
        stock: Number(c.stock) || 0,
        price: c.price != null ? Number(c.price) : null,
        image: c.image || '',
        available: c.available !== false,
        sortOrder: Number(c.sortOrder) || 0,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 7. Product Extras (saltar huérfanos)
  console.log('➕ Product Extras...');
  const extras = readJson<any[]>('product-extras.json') || [];
  await processBatch('product-extras', extras.filter((e: any) => validProductIds.has(e.productId)), async (e) => {
    await prisma.productExtra.create({
      data: {
        id: e.id,
        productId: e.productId,
        name: e.name || '',
        description: e.description || '',
        priceMod: Number(e.priceMod) || 0,
        required: e.required || false,
        sortOrder: Number(e.sortOrder) || 0,
        createdAt: e.createdAt || new Date().toISOString(),
        updatedAt: e.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 8. Orders — NO migrar pedidos (el usuario lo pidió expresamente)
  console.log('📋 Pedidos... (OMITIDOS por configuración)');

  // 9. Order Items — también omitidos (dependen de orders)
  console.log('📋 Order Items... (OMITIDOS)');

  // 10. Admins — hashear passwords con bcrypt si no lo están ya.
  // La API /api/admin/auth usa verifyPassword (bcrypt), así que los
  // passwords deben estar hasheados. Si el JSON tiene texto plano,
  // lo hasheamos antes de guardar.
  console.log('🔐 Admins...');
  const bcrypt = await import('bcryptjs');
  const admins = readJson<any[]>('admins.json') || [];
  await processBatch('admins', admins, async (a) => {
    const rawPwd = String(a.password || '');
    const isBcrypt = rawPwd.startsWith('$2a$') || rawPwd.startsWith('$2b$') || rawPwd.startsWith('$2y$');
    const finalPwd = isBcrypt ? rawPwd : await bcrypt.default.hash(rawPwd, 10);
    await prisma.admin.create({
      data: {
        id: a.id,
        username: a.username,
        password: finalPwd,
        name: a.name || '',
        createdAt: a.createdAt || new Date().toISOString(),
        updatedAt: a.updatedAt || new Date().toISOString(),
      },
    });
  });
  // Si no había admins en el JSON, crear superadmin por defecto
  if (admins.length === 0) {
    try {
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'desarrollablecuba@gmail.com';
      const defaultPass = process.env.DEFAULT_ADMIN_PASSWORD || 'Ma/*87.Sa';
      const hashed = await bcrypt.default.hash(defaultPass, 10);
      await prisma.admin.create({
        data: {
          id: 'seed-admin-0',
          username: defaultEmail,
          password: hashed,
          name: 'Super Administrador',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      console.log(`  ✓ Superadmin creado (${defaultEmail})`);
    } catch (e: any) {
      console.log(`  ⚠ No se pudo crear superadmin default: ${e.message}`);
    }
  }

  // 11. Customers
  console.log('👤 Clientes...');
  const customers = readJson<any[]>('customers.json') || [];
  await processBatch('clientes', customers, async (c) => {
    await prisma.customer.create({
      data: {
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        email: c.email,
        passwordHash: c.passwordHash || '',
        country: c.country || 'US',
        address: c.address || '',
        deliveryZoneId: c.deliveryZoneId || null,
        deliveryZoneName: c.deliveryZoneName || null,
        savedRecipients: JSON.stringify(c.savedRecipients || []),
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 12. Reviews
  console.log('⭐ Reseñas...');
  const reviews = readJson<any[]>('reviews.json') || [];
  await processBatch('reseñas', reviews, async (r) => {
    await prisma.review.create({
      data: {
        id: r.id,
        productId: r.productId || '',
        customerId: r.customerId || null,
        authorName: r.authorName || '',
        rating: Number(r.rating) || 5,
        comment: r.comment || '',
        status: r.status || 'pending',
        adminReply: r.adminReply || '',
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 13. Delivery Zones
  console.log('🚚 Zonas de Delivery...');
  const zones = readJson<any[]>('delivery-zones.json') || [];
  await processBatch('zonas', zones, async (z) => {
    await prisma.deliveryZone.create({
      data: {
        id: z.id,
        name: z.name || '',
        description: z.description || '',
        price: Number(z.price) || 0,
        estimatedTime: z.estimatedTime || '',
        active: z.active !== false,
        order: Number(z.order) || 0,
        allowsPriorityDelivery: z.allowsPriorityDelivery || false,
        asapSurchargeOverride: z.asapSurchargeOverride || false,
        asapSurchargeType: z.asapSurchargeType || 'fixed',
        asapSurchargeValue: Number(z.asapSurchargeValue) || 0,
        createdAt: z.createdAt || new Date().toISOString(),
        updatedAt: z.updatedAt || new Date().toISOString(),
      },
    });
  });

  // 14. SiteConfig
  console.log('⚙️ Configuración del sitio...');
  const config = readJson<any>('siteconfig.json');
  if (config) {
    await prisma.siteConfig.create({
      data: {
        id: config.id || 'site',
        storeName: config.storeName || 'Mi Tienda',
        tagline: config.tagline || '',
        logo: config.logo || '',
        cover: config.cover || '',
        phone: config.phone || '',
        whatsappNumber: config.whatsappNumber || '',
        address: config.address || '',
        zelleEmail: config.zelleEmail || '',
        zelleName: config.zelleName || '',
        primaryColor: config.primaryColor || '#f59e0b',
        primaryColorDark: config.primaryColorDark || '#d97706',
        primaryColorLight: config.primaryColorLight || '#fef3c7',
        footerBgColor: config.footerBgColor || '#111827',
        footerTextColor: config.footerTextColor || '#d1d5db',
        footerAccentColor: config.footerAccentColor || '#f59e0b',
        themeId: config.themeId || 'diaz-premium',
        themeData: config.themeData || '',
        homeSectionsOrder: config.homeSectionsOrder || '',
        homeSectionsEnabled: config.homeSectionsEnabled || '',
        offersCarousel: config.offersCarousel || '',
        savedThemes: config.savedThemes || '[]',
        zelleEnabled: config.zelleEnabled !== false,
        freeShippingEnabled: config.freeShippingEnabled !== false,
        customerRegistrationEnabled: config.customerRegistrationEnabled !== false,
        customerLoginEnabled: config.customerLoginEnabled !== false,
        tickerEnabled: config.tickerEnabled !== false,
        catalogLayout: config.catalogLayout || 'categories',
        freeShippingMin: Number(config.freeShippingMin) || 100,
        shippingCost: Number(config.shippingCost) || 9.99,
        scheduleLunes: config.scheduleLunes || '15:00 - 18:00',
        scheduleMartes: config.scheduleMartes || '15:00 - 18:00',
        scheduleMiercoles: config.scheduleMiercoles || '15:00 - 18:00',
        scheduleJueves: config.scheduleJueves || '15:00 - 18:00',
        scheduleViernes: config.scheduleViernes || '15:00 - 18:00',
        scheduleSabado: config.scheduleSabado || '15:00 - 18:00',
        scheduleDomingo: config.scheduleDomingo || '15:00 - 18:00',
        asapSurchargeType: config.asapSurchargeType || 'fixed',
        asapSurchargeValue: Number(config.asapSurchargeValue) || 5,
        normalSchedule: config.normalSchedule || '15:00 - 18:00',
        activeCountries: config.activeCountries || 'US,CU',
        tickerItems: config.tickerItems || '[]',
        horarioSectionTitle: config.horarioSectionTitle || '',
        horarioSectionDesc: config.horarioSectionDesc || '',
        horarioCards: config.horarioCards || '[]',
        socialLinks: config.socialLinks || '[]',
        trustBadges: config.trustBadges || '[]',
        socialStats: config.socialStats || '[]',
        testimonials: config.testimonials || '[]',
        homeBenefits: config.homeBenefits || '[]',
        howItWorksSteps: config.howItWorksSteps || '',
        asapStartHour: config.asapStartHour || '06:00',
        asapEndHour: config.asapEndHour || '22:00',
        maxOrderHour: config.maxOrderHour || '14:00',
        asapMinLeadTime: Number(config.asapMinLeadTime) || 60,
        asapMaxPerHour: Number(config.asapMaxPerHour) || 5,
        asapExcludeNormalHours: config.asapExcludeNormalHours === true,
        createdAt: config.createdAt || new Date().toISOString(),
        updatedAt: config.updatedAt || new Date().toISOString(),
      },
    });
    console.log('  ✓ Configuración migrada');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  if (totalErrors === 0) {
    console.log('  ✅ MIGRACIÓN COMPLETADA (sin errores)');
  } else {
    console.log(`  ⚠️  MIGRACIÓN COMPLETADA con ${totalErrors} errores (algunos items se saltaron)`);
    console.log('     La app funcionará con los datos que sí se migraron.');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

migrate()
  .catch((err) => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
