import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson<T>(filename: string): T | null {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * GET /api/setup-db
 *
 * Inicializa la base de datos (MySQL o SQLite según DATABASE_URL):
 *  1. Limpia todas las tablas (orden por dependencias).
 *  2. Siembra los datos desde /data/*.json (productos, categorías, admin, etc.).
 *
 * Es idempotente: se puede llamar varias veces.
 */
export async function GET() {
  const results: string[] = [];

  try {
    // ── PASO 1: limpiar tablas (orden por dependencias, deleteMany
    //    funciona tanto en MySQL como en SQLite) ──
    await db.orderItem.deleteMany({});
    await db.order.deleteMany({});
    await db.productExtra.deleteMany({});
    await db.productCombination.deleteMany({});
    await db.variantOption.deleteMany({});
    await db.variantGroup.deleteMany({});
    await db.wholesaleTier.deleteMany({});
    await db.review.deleteMany({});
    await db.product.deleteMany({});
    await db.customer.deleteMany({});
    await db.deliveryZone.deleteMany({});
    await db.category.deleteMany({});
    await db.siteConfig.deleteMany({});
    await db.admin.deleteMany({});
    results.push('Tablas limpiadas');

    // ── PASO 2: sembrar desde JSON ──
    const now = new Date().toISOString();

    // Categories
    const categories = readJson<any[]>('categories.json') || [];
    for (const c of categories) {
      await db.category.create({
        data: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon || '',
          image: c.image || '',
          order: Number(c.order) || 0,
          active: c.active !== false,
          createdAt: c.createdAt || now,
          updatedAt: c.updatedAt || now,
        },
      });
    }
    results.push(`${categories.length} categorías`);

    // Products
    const products = readJson<any[]>('products.json') || [];
    const validProductIds = new Set(products.map((p: any) => p.id));
    let pOk = 0;
    for (const p of products) {
      try {
        await db.product.create({
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
            createdAt: p.createdAt || now,
            updatedAt: p.updatedAt || now,
          },
        });
        pOk++;
      } catch (e: any) {
        // saltar duplicados / errores puntuales
      }
    }
    results.push(`${pOk}/${products.length} productos`);

    // Wholesale tiers
    const tiers = readJson<any[]>('wholesale-tiers.json') || [];
    for (const t of tiers.filter((t: any) => validProductIds.has(t.productId))) {
      try {
        await db.wholesaleTier.create({
          data: {
            id: t.id, productId: t.productId, name: t.name || '',
            minQty: Number(t.minQty) || 0, maxQty: Number(t.maxQty) || 0,
            price: Number(t.price) || 0, sortOrder: Number(t.sortOrder) || 0,
            createdAt: t.createdAt || now, updatedAt: t.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }

    // Variant groups
    const vGroups = readJson<any[]>('variant-groups.json') || [];
    const vGroupsValid = vGroups.filter((vg: any) => validProductIds.has(vg.productId));
    for (const vg of vGroupsValid) {
      try {
        await db.variantGroup.create({
          data: {
            id: vg.id, productId: vg.productId, name: vg.name || '',
            required: vg.required || false, maxSelect: Number(vg.maxSelect) || 1,
            isImageGroup: vg.isImageGroup || false, isDominant: vg.isDominant || false,
            sortOrder: Number(vg.sortOrder) || 0,
            createdAt: vg.createdAt || now, updatedAt: vg.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }
    const validGroupIds = new Set(vGroupsValid.map((g: any) => g.id));

    // Variant options
    const vOptions = readJson<any[]>('variant-options.json') || [];
    for (const vo of vOptions.filter((vo: any) => validGroupIds.has(vo.groupId))) {
      try {
        await db.variantOption.create({
          data: {
            id: vo.id, groupId: vo.groupId, name: vo.name || '',
            priceMod: Number(vo.priceMod) || 0, image: vo.image || '',
            stock: Number(vo.stock) || 0, available: vo.available !== false,
            sortOrder: Number(vo.sortOrder) || 0,
            createdAt: vo.createdAt || now, updatedAt: vo.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }

    // Combinations
    const combos = readJson<any[]>('combinations.json') || [];
    for (const c of combos.filter((c: any) => validProductIds.has(c.productId))) {
      try {
        await db.productCombination.create({
          data: {
            id: c.id, productId: c.productId, optionIds: c.optionIds || '[]',
            sku: c.sku || '', stock: Number(c.stock) || 0,
            price: c.price != null ? Number(c.price) : null,
            image: c.image || '', available: c.available !== false,
            sortOrder: Number(c.sortOrder) || 0,
            createdAt: c.createdAt || now, updatedAt: c.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }

    // Product extras
    const extras = readJson<any[]>('product-extras.json') || [];
    for (const e of extras.filter((e: any) => validProductIds.has(e.productId))) {
      try {
        await db.productExtra.create({
          data: {
            id: e.id, productId: e.productId, name: e.name || '',
            description: e.description || '', priceMod: Number(e.priceMod) || 0,
            required: e.required || false, sortOrder: Number(e.sortOrder) || 0,
            createdAt: e.createdAt || now, updatedAt: e.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }

    // Admins
    const admins = readJson<any[]>('admins.json') || [];
    for (const a of admins) {
      const rawPwd = String(a.password || '');
      const isBcrypt = rawPwd.startsWith('$2a$') || rawPwd.startsWith('$2b$') || rawPwd.startsWith('$2y$');
      const finalPwd = isBcrypt ? rawPwd : await bcrypt.hash(rawPwd, 10);
      try {
        await db.admin.create({
          data: {
            id: a.id, username: a.username, password: finalPwd,
            name: a.name || '', createdAt: a.createdAt || now, updatedAt: a.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }
    if (admins.length === 0) {
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'desarrollablecuba@gmail.com';
      const defaultPass = process.env.DEFAULT_ADMIN_PASSWORD || 'Ma/*87.Sa';
      const hashed = await bcrypt.hash(defaultPass, 10);
      await db.admin.create({
        data: {
          id: 'seed-admin-0', username: defaultEmail, password: hashed,
          name: 'Super Administrador', createdAt: now, updatedAt: now,
        },
      });
      results.push('Admin por defecto creado');
    } else {
      results.push(`${admins.length} admins`);
    }

    // Customers
    const customers = readJson<any[]>('customers.json') || [];
    for (const c of customers) {
      try {
        await db.customer.create({
          data: {
            id: c.id, name: c.name || '', phone: c.phone || '',
            email: c.email, passwordHash: c.passwordHash || '',
            country: c.country || 'US', address: c.address || '',
            deliveryZoneId: c.deliveryZoneId || null,
            deliveryZoneName: c.deliveryZoneName || null,
            savedRecipients: JSON.stringify(c.savedRecipients || []),
            createdAt: c.createdAt || now, updatedAt: c.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }
    results.push(`${customers.length} clientes`);

    // Reviews
    const reviews = readJson<any[]>('reviews.json') || [];
    for (const r of reviews) {
      try {
        await db.review.create({
          data: {
            id: r.id, productId: r.productId || '', customerId: r.customerId || null,
            authorName: r.authorName || '', rating: Number(r.rating) || 5,
            comment: r.comment || '', status: r.status || 'pending',
            adminReply: r.adminReply || '',
            createdAt: r.createdAt || now, updatedAt: r.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }

    // Delivery zones
    const zones = readJson<any[]>('delivery-zones.json') || [];
    for (const z of zones) {
      try {
        await db.deliveryZone.create({
          data: {
            id: z.id, name: z.name || '', description: z.description || '',
            price: Number(z.price) || 0, estimatedTime: z.estimatedTime || '',
            active: z.active !== false, order: Number(z.order) || 0,
            allowsPriorityDelivery: z.allowsPriorityDelivery || false,
            asapSurchargeOverride: z.asapSurchargeOverride || false,
            asapSurchargeType: z.asapSurchargeType || 'fixed',
            asapSurchargeValue: Number(z.asapSurchargeValue) || 0,
            asapMinLeadTimeOverride: z.asapMinLeadTimeOverride != null ? Number(z.asapMinLeadTimeOverride) : null,
            asapMaxPerHourOverride: z.asapMaxPerHourOverride != null ? Number(z.asapMaxPerHourOverride) : null,
            asapExcludeNormalHoursOverride: z.asapExcludeNormalHoursOverride || false,
            createdAt: z.createdAt || now, updatedAt: z.updatedAt || now,
          },
        });
      } catch { /* skip */ }
    }
    results.push(`${zones.length} zonas`);

    // SiteConfig
    const config = readJson<any>('siteconfig.json');
    if (config) {
      await db.siteConfig.create({
        data: {
          id: config.id || 'site',
          storeName: config.storeName || 'Mi Tienda',
          tagline: config.tagline || '',
          logo: config.logo || '',
          cover: config.cover || '',
          heroTitle: config.heroTitle || '',
          heroSubtitle: config.heroSubtitle || '',
          promoBannerTitle: config.promoBannerTitle || '',
          promoBannerSubtitle: config.promoBannerSubtitle || '',
          promoBannerButtonText: config.promoBannerButtonText || '',
          reservableDeliverySchedule: config.reservableDeliverySchedule || '',
          priorityDeliveryInfo1: config.priorityDeliveryInfo1 || '',
          priorityDeliveryInfo2: config.priorityDeliveryInfo2 || '',
          priorityDeliveryInfo3: config.priorityDeliveryInfo3 || '',
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
          minOrderAmount: Number(config.minOrderAmount) || 10,
          scheduleLunes: config.scheduleLunes || '15:00 - 18:00',
          scheduleMartes: config.scheduleMartes || '15:00 - 18:00',
          scheduleMiercoles: config.scheduleMiercoles || '15:00 - 18:00',
          scheduleJueves: config.scheduleJueves || '15:00 - 18:00',
          scheduleViernes: config.scheduleViernes || '15:00 - 18:00',
          scheduleSabado: config.scheduleSabado || '15:00 - 18:00',
          scheduleDomingo: config.scheduleDomingo || '15:00 - 18:00',
          asapSurchargeType: config.asapSurchargeType || 'fixed',
          asapSurchargeValue: Number(config.asapSurchargeValue) || 5,
          asapStartHour: config.asapStartHour || '06:00',
          asapEndHour: config.asapEndHour || '22:00',
          maxOrderHour: config.maxOrderHour || '14:00',
          asapMinLeadTime: Number(config.asapMinLeadTime) || 60,
          asapMaxPerHour: Number(config.asapMaxPerHour) || 5,
          asapExcludeNormalHours: config.asapExcludeNormalHours === true,
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
          createdAt: config.createdAt || now,
          updatedAt: config.updatedAt || now,
        },
      });
      results.push('Configuración del sitio');
    }

    return NextResponse.json({
      status: 'success',
      message: 'Base de datos creada y sembrada correctamente',
      results,
    });
  } catch (error: any) {
    console.error('Error en setup-db:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Error' },
      { status: 500 }
    );
  }
}
