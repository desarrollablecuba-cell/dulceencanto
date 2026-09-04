import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * /api/admin/backup — Copia de seguridad de la CONFIGURACIÓN de la tienda.
 *
 *  GET  → exporta un JSON con: siteConfig (todas las prefs: hero, fechas
 *         especiales + combos, orden de secciones, colores, horarios…),
 *         servicios, promociones, zonas de delivery, categorías (solo
 *         configuración) y galería. NO incluye productos, pedidos ni
 *         clientes (esos viven en la BD y no se pierden al re-desplegar
 *         el código).
 *         Con ?download=1 añade Content-Disposition para bajar como archivo.
 *
 *  POST → importa un backup previamente exportado (mismo formato).
 *         Body: el JSON del backup. Query:
 *          - mode=upsert (default): crea/actualiza por id, NO borra nada.
 *          - mode=replace: además ELIMINA servicios/promos/zonas/galería
 *            locales que no estén en el backup (restauración completa).
 *            Las categorías NUNCA se borran (los productos las referencian).
 *
 *  El formato es versionado (meta.format=1) para poder evolucionarlo.
 */

const BACKUP_FORMAT = 1;

// Campos string de SiteConfig que se restauran en el import (mismo whitelist
// conceptual que PUT /api/siteconfig + campos JSON de la V52).
const SITECONFIG_FIELDS = [
  'storeName', 'tagline', 'logo', 'cover', 'heroTitle', 'heroSubtitle',
  'promoBannerTitle', 'promoBannerSubtitle', 'promoBannerButtonText',
  'reservableDeliverySchedule', 'priorityDeliveryInfo1', 'priorityDeliveryInfo2', 'priorityDeliveryInfo3',
  'phone', 'whatsappNumber', 'address', 'zelleEmail', 'zelleName',
  'primaryColor', 'primaryColorDark', 'primaryColorLight',
  'footerBgColor', 'footerTextColor', 'footerAccentColor',
  'themeId', 'themeData',
  'homeSectionsOrder', 'homeSectionsEnabled',
  'offersCarousel', 'savedThemes', 'heroSlides', 'sectionImages',
  'navSections', 'hamburgerItems',
  'zelleEnabled', 'freeShippingEnabled',
  'customerRegistrationEnabled', 'customerLoginEnabled',
  'tickerEnabled', 'catalogLayout',
  'freeShippingMin', 'shippingCost', 'minOrderAmount',
  'scheduleLunes', 'scheduleMartes', 'scheduleMiercoles', 'scheduleJueves',
  'scheduleViernes', 'scheduleSabado', 'scheduleDomingo',
  'asapSurchargeType', 'asapSurchargeValue', 'asapStartHour', 'asapEndHour',
  'normalSchedule', 'maxOrderHour', 'asapMinLeadTime', 'asapMaxPerHour',
  'asapExcludeNormalHours', 'activeCountries',
  'tickerItems', 'horarioSectionTitle', 'horarioSectionDesc', 'horarioCards',
  'specialDates', 'socialLinks', 'trustBadges', 'socialStats', 'testimonials',
  'homeBenefits', 'howItWorksSteps',
] as const;

const SITECONFIG_FLOAT_FIELDS = new Set(['freeShippingMin', 'shippingCost', 'minOrderAmount', 'asapSurchargeValue']);
const SITECONFIG_INT_FIELDS = new Set(['asapMinLeadTime', 'asapMaxPerHour']);
const SITECONFIG_BOOL_FIELDS = new Set([
  'zelleEnabled', 'freeShippingEnabled', 'customerRegistrationEnabled',
  'customerLoginEnabled', 'tickerEnabled', 'asapExcludeNormalHours',
]);

// ─── EXPORT ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const [siteConfig, services, promotions, deliveryZones, categories, galleryCategories, galleryPhotos] =
      await Promise.all([
        db.siteConfig.findUnique({ where: { id: 'site' } }),
        db.service.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
        db.promotion.findMany({ orderBy: [{ order: 'asc' }] }),
        db.deliveryZone.findMany({ orderBy: [{ order: 'asc' }] }),
        db.category.findMany({ orderBy: [{ order: 'asc' }] }),
        db.galleryCategory.findMany({ orderBy: [{ order: 'asc' }] }),
        db.galleryPhoto.findMany({ orderBy: [{ order: 'asc' }] }),
      ]);

    // siteConfig sin id ni timestamps (se restauran sobre la fila 'site')
    const siteConfigClean: Record<string, unknown> = {};
    if (siteConfig) {
      for (const [k, v] of Object.entries(siteConfig)) {
        if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
        siteConfigClean[k] = v;
      }
    }

    const backup = {
      meta: {
        app: 'dulce-encanto',
        format: BACKUP_FORMAT,
        appVersion: '52.4',
        exportedAt: new Date().toISOString(),
        storeName: siteConfig?.storeName || 'Dulce Encanto',
      },
      siteConfig: siteConfigClean,
      services,
      promotions,
      deliveryZones,
      categories: (categories || []).map((c) => ({
        id: c.id, name: c.name, slug: c.slug, icon: c.icon,
        image: c.image, order: c.order, active: c.active, section: c.section,
      })),
      gallery: {
        categories: galleryCategories || [],
        photos: galleryPhotos || [],
      },
    };

    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (request.nextUrl.searchParams.get('download') === '1') {
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      headers['Content-Disposition'] = `attachment; filename="dulce-encanto-backup-${stamp}.json"`;
    }
    return NextResponse.json(backup, { headers });
  } catch (err) {
    console.error('[/api/admin/backup GET]', err);
    return NextResponse.json({ error: 'No se pudo generar la copia de seguridad.' }, { status: 500 });
  }
}

// ─── IMPORT ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const body = await request.json();
    const mode = request.nextUrl.searchParams.get('mode') === 'replace' ? 'replace' : 'upsert';

    // ── Validación del formato ──
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'JSON inválido: no es un objeto.' }, { status: 400 });
    }
    if (body.meta?.app !== 'dulce-encanto') {
      return NextResponse.json(
        { error: 'Este archivo no parece una copia de seguridad de Dulce Encanto (falta la marca de la app).' },
        { status: 400 }
      );
    }
    if (Number(body.meta?.format) !== BACKUP_FORMAT) {
      return NextResponse.json(
        { error: `Formato de backup incompatible (recibido ${body.meta?.format ?? '?'}, esperado ${BACKUP_FORMAT}).` },
        { status: 400 }
      );
    }
    if (!body.siteConfig || typeof body.siteConfig !== 'object') {
      return NextResponse.json({ error: 'El backup no contiene la configuración del sitio (siteConfig).' }, { status: 400 });
    }

    const summary = {
      siteConfigFields: 0,
      servicesUpserted: 0,
      servicesDeleted: 0,
      promotionsUpserted: 0,
      promotionsDeleted: 0,
      zonesUpserted: 0,
      zonesDeleted: 0,
      categoriesUpserted: 0,
      galleryCategoriesUpserted: 0,
      galleryPhotosUpserted: 0,
      galleryDeleted: 0,
      mode,
    };

    // ── 1) siteConfig: restaurar solo campos del whitelist ──
    const data: Record<string, unknown> = {};
    for (const key of SITECONFIG_FIELDS) {
      if (key in body.siteConfig) {
        const v = body.siteConfig[key];
        if (SITECONFIG_FLOAT_FIELDS.has(key)) data[key] = Number(v) || 0;
        else if (SITECONFIG_INT_FIELDS.has(key)) data[key] = parseInt(String(v)) || 0;
        else if (SITECONFIG_BOOL_FIELDS.has(key)) data[key] = v === true || v === 'true';
        else data[key] = v === null || v === undefined ? '' : String(v);
      }
    }
    if (Object.keys(data).length > 0) {
      await db.siteConfig.update({ where: { id: 'site' }, data });
      summary.siteConfigFields = Object.keys(data).length;
    }

    // ── 2) Servicios (upsert por id) ──
    if (Array.isArray(body.services)) {
      for (const s of body.services) {
        if (!s || !s.id || !s.name) continue;
        const svc = {
          name: String(s.name), description: String(s.description || ''),
          icon: String(s.icon || '✨'), image: String(s.image || ''),
          price: Number(s.price) || 0, priceUsd: Number(s.priceUsd) || 0,
          category: String(s.category || 'decoracion'),
          active: s.active !== false, order: Number.isFinite(Number(s.order)) ? Number(s.order) : 100,
          createdAt: String(s.createdAt || ''), updatedAt: new Date().toISOString(),
        };
        await db.service.upsert({ where: { id: s.id }, create: { id: s.id, ...svc }, update: svc });
        summary.servicesUpserted++;
      }
      if (mode === 'replace' && body.services.length > 0) {
        const ids = body.services.map((s: { id?: string }) => s.id).filter(Boolean);
        const del = await db.service.deleteMany({ where: { id: { notIn: ids } } });
        summary.servicesDeleted = del.count;
      }
    }

    // ── 3) Promociones clásicas (upsert por id) ──
    if (Array.isArray(body.promotions)) {
      for (const p of body.promotions) {
        if (!p || !p.id || !p.title) continue;
        const promo = {
          title: String(p.title), description: String(p.description || ''),
          image: String(p.image || ''), occasion: String(p.occasion || ''),
          discountPct: Number(p.discountPct) || 0,
          startDate: String(p.startDate || ''), endDate: String(p.endDate || ''),
          active: p.active !== false, order: Number.isFinite(Number(p.order)) ? Number(p.order) : 0,
          createdAt: String(p.createdAt || ''), updatedAt: new Date().toISOString(),
        };
        await db.promotion.upsert({ where: { id: p.id }, create: { id: p.id, ...promo }, update: promo });
        summary.promotionsUpserted++;
      }
      if (mode === 'replace' && body.promotions.length > 0) {
        const ids = body.promotions.map((p: { id?: string }) => p.id).filter(Boolean);
        const del = await db.promotion.deleteMany({ where: { id: { notIn: ids } } });
        summary.promotionsDeleted = del.count;
      }
    }

    // ── 4) Zonas de delivery (upsert por id) ──
    if (Array.isArray(body.deliveryZones)) {
      for (const z of body.deliveryZones) {
        if (!z || !z.id) continue;
        const zone: Record<string, unknown> = {
          name: String(z.name || ''), description: String(z.description || ''),
          price: Number(z.price) || 0, estimatedTime: String(z.estimatedTime || ''),
          active: z.active !== false, order: Number.isFinite(Number(z.order)) ? Number(z.order) : 0,
          allowsPriorityDelivery: Boolean(z.allowsPriorityDelivery),
          asapSurchargeOverride: Boolean(z.asapSurchargeOverride),
          asapSurchargeType: String(z.asapSurchargeType || 'fixed'),
          asapSurchargeValue: Number(z.asapSurchargeValue) || 0,
          asapExcludeNormalHoursOverride: Boolean(z.asapExcludeNormalHoursOverride),
        };
        if (z.asapMinLeadTimeOverride !== undefined && z.asapMinLeadTimeOverride !== null) {
          zone.asapMinLeadTimeOverride = Number(z.asapMinLeadTimeOverride) || 0;
        }
        if (z.asapMaxPerHourOverride !== undefined && z.asapMaxPerHourOverride !== null) {
          zone.asapMaxPerHourOverride = Number(z.asapMaxPerHourOverride) || 0;
        }
        await db.deliveryZone.upsert({ where: { id: z.id }, create: { id: z.id, ...zone }, update: zone });
        summary.zonesUpserted++;
      }
      if (mode === 'replace' && body.deliveryZones.length > 0) {
        const ids = body.deliveryZones.map((z: { id?: string }) => z.id).filter(Boolean);
        const del = await db.deliveryZone.deleteMany({ where: { id: { notIn: ids } } });
        summary.zonesDeleted = del.count;
      }
    }

    // ── 5) Categorías (solo configuración; NUNCA se borran — los productos
    //        las referencian por FK) ──
    if (Array.isArray(body.categories)) {
      for (const c of body.categories) {
        if (!c || !c.id || !c.name || !c.slug) continue;
        const cat = {
          name: String(c.name), slug: String(c.slug), icon: String(c.icon || ''),
          image: String(c.image || ''), order: Number.isFinite(Number(c.order)) ? Number(c.order) : 0,
          active: c.active !== false, section: String(c.section || 'ambas'),
          updatedAt: new Date().toISOString(),
        };
        await db.category.upsert({ where: { id: c.id }, create: { id: c.id, createdAt: '', ...cat }, update: cat });
        summary.categoriesUpserted++;
      }
    }

    // ── 6) Galería (categorías + fotos; en replace se borra la galería que
    //        no venga en el backup — las fotos cascadean con su categoría) ──
    if (body.gallery && typeof body.gallery === 'object') {
      const cats = Array.isArray(body.gallery.categories) ? body.gallery.categories : [];
      const photos = Array.isArray(body.gallery.photos) ? body.gallery.photos : [];
      for (const gc of cats) {
        if (!gc || !gc.id || !gc.name || !gc.slug) continue;
        const gcat = {
          name: String(gc.name), slug: String(gc.slug),
          description: String(gc.description || ''), cover: String(gc.cover || ''),
          icon: String(gc.icon || '🖼️'), order: Number.isFinite(Number(gc.order)) ? Number(gc.order) : 0,
          active: gc.active !== false, createdAt: String(gc.createdAt || ''),
          updatedAt: new Date().toISOString(),
        };
        await db.galleryCategory.upsert({ where: { id: gc.id }, create: { id: gc.id, ...gcat }, update: gcat });
        summary.galleryCategoriesUpserted++;
      }
      for (const gp of photos) {
        if (!gp || !gp.id || !gp.categoryId || !gp.image) continue;
        const gphoto = {
          categoryId: String(gp.categoryId), image: String(gp.image),
          title: String(gp.title || ''), description: String(gp.description || ''),
          order: Number.isFinite(Number(gp.order)) ? Number(gp.order) : 0,
          active: gp.active !== false, createdAt: String(gp.createdAt || ''),
          updatedAt: new Date().toISOString(),
        };
        await db.galleryPhoto.upsert({ where: { id: gp.id }, create: { id: gp.id, ...gphoto }, update: gphoto });
        summary.galleryPhotosUpserted++;
      }
      if (mode === 'replace' && cats.length > 0) {
        const ids = cats.map((c: { id?: string }) => c.id).filter(Boolean);
        const del = await db.galleryCategory.deleteMany({ where: { id: { notIn: ids } } });
        summary.galleryDeleted = del.count;
      }
    }

    return NextResponse.json({ ok: true, summary, importedAt: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'No se pudo importar la copia de seguridad.';
    console.error('[/api/admin/backup POST]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
