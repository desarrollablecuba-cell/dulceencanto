import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

/** Genera un SKU aleatorio con formato PROD-XXXXXX. */
function generateSKU(): string {
  return 'PROD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Convierte cualquier valor a un JSON string válido para tags. */
function normalizeTags(value: unknown): string {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      /* not JSON, ignore */
    }
    return '[]';
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  return '[]';
}

/** Recalcula el % de margen a partir del precio de venta y el de costo. */
function calcMargin(salePrice: number, costPrice: number): number {
  if (!salePrice || salePrice <= 0) return 0;
  return Math.round(((salePrice - costPrice) / salePrice) * 10000) / 100;
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const body = await request.json();

    // Extraer campos relacionales que no van directamente al Product
    const {
      variantGroups,
      combinations,
      productExtras,
      wholesaleTiers,
      tags: rawTags,
      sku: rawSku,
      ...productFields
    } = body;

    // Validar nombre obligatorio
    if (!productFields.name || typeof productFields.name !== 'string' || !productFields.name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del producto es obligatorio.' },
        { status: 400 }
      );
    }

    // SKU auto-generado si está vacío
    const sku = typeof rawSku === 'string' && rawSku.trim() ? rawSku.trim() : generateSKU();

    // Tags como JSON string
    const tags = normalizeTags(rawTags);

    // SIGECOS: costos y margen
    const salePrice = Number(productFields.price ?? 0);
    const costPrice = Number(productFields.costPrice ?? 0);
    const marginPercent = productFields.marginPercent !== undefined
      ? Number(productFields.marginPercent)
      : calcMargin(salePrice, costPrice);

    // Crear el producto (sin relaciones)
    const product = await db.product.create({
      data: {
        ...productFields,
        sku,
        tags,
        // Asegurar campos numéricos
        price: salePrice,
        stock: Number(productFields.stock ?? 0),
        order: Number(productFields.order ?? 0),
        rating: Number(productFields.rating ?? 0),
        reviewCount: Number(productFields.reviewCount ?? 0),
        featured: Boolean(productFields.featured),
        // SIGECOS: unidad y código
        saleUnit: productFields.saleUnit || 'unidad',
        barcode: String(productFields.barcode ?? ''),
        // SIGECOS: tipo y estado
        productType: productFields.productType || 'elaborado',
        status: productFields.status || 'active',
        // SIGECOS: disponibilidad
        posAvailable: productFields.posAvailable !== undefined ? Boolean(productFields.posAvailable) : true,
        tiendaAvailable: productFields.tiendaAvailable !== undefined ? Boolean(productFields.tiendaAvailable) : true,
        // V52.6 — canales de venta (Venta Directa / Buffet para Repartir)
        directSaleEnabled: productFields.directSaleEnabled !== undefined ? Boolean(productFields.directSaleEnabled) : true,
        buffetEnabled: Boolean(productFields.buffetEnabled ?? false),
        // V52.8 — precio del buffet por docena en USD (30 por defecto)
        buffetPriceUsd: Number(productFields.buffetPriceUsd ?? 30) || 30,
        // SIGECOS: anticipo
        advanceType: productFields.advanceType || 'sin',
        advanceValue: Number(productFields.advanceValue ?? 0),
        minHours: Number(productFields.minHours ?? 24),
        minHoursUnit: productFields.minHoursUnit === 'dias' ? 'dias' : 'horas',
        // SIGECOS: costos
        costPrice,
        marginPercent,
        // Oferta
        offerEnabled: Boolean(productFields.offerEnabled ?? false),
        offerType: productFields.offerType || 'permanente',
        offerPrice: Number(productFields.offerPrice ?? 0),
        // Convertir null → '' para compatibilidad con MySQL NOT NULL columns
        // (Hostinger puede tener offerStart/offerEnd como NOT NULL si la BD
        // se creó con una migración antigua). '' es falsy, así que
        // isOfferActive lo trata igual que null.
        offerStart: productFields.offerStart ?? '',
        offerEnd: productFields.offerEnd ?? '',
        // Wholesale (legacy fields kept for backward compat)
        wholesaleEnabled: Boolean(productFields.wholesaleEnabled ?? false),
        wholesalePrice: Number(productFields.wholesalePrice ?? 0),
        wholesaleMinQty: Number(productFields.wholesaleMinQty ?? 10),
        // Reservation: NO permitir reservas en mercancías
        reservationEnabled: productFields.productType === 'mercancia'
          ? false
          : Boolean(productFields.reservationEnabled ?? false),
        maxReservations: Number(productFields.maxReservations ?? 50),
        reservationDays: Number(productFields.reservationDays ?? 7),
        reservationDeposit: Number(productFields.reservationDeposit ?? 0),
        // Promo
        promoEnabled: Boolean(productFields.promoEnabled ?? false),
        promoType: productFields.promoType || 'discount',
        promoValue: Number(productFields.promoValue ?? 0),
        promoBuyQty: Number(productFields.promoBuyQty ?? 0),
        promoGetQty: Number(productFields.promoGetQty ?? 0),
        promoStart: productFields.promoStart ?? '',
        promoEnd: productFields.promoEnd ?? '',
        images: productFields.images ?? '[]',
        shortName: productFields.shortName ?? '',
      },
    });

    const productId = product.id;

    // Crear wholesale tiers si vienen
    if (Array.isArray(wholesaleTiers)) {
      for (let ti = 0; ti < wholesaleTiers.length; ti++) {
        const t = wholesaleTiers[ti] || {};
        await db.wholesaleTier.create({
          data: {
            productId,
            name: String(t.name ?? ''),
            minQty: Number(t.minQty ?? 0),
            maxQty: Number(t.maxQty ?? 0),
            price: Number(t.price ?? 0),
            sortOrder: Number(t.sortOrder ?? ti),
          },
        });
      }
    }

    // Crear variant groups + options si vienen
    if (Array.isArray(variantGroups) && variantGroups.length > 0) {
      const optIdMap: Record<string, string> = {}; // oldOptionId -> newOptionId
      for (let gi = 0; gi < variantGroups.length; gi++) {
        const g = variantGroups[gi] || {};
        const oldGroupId = String(g.id ?? '');
        const group = await db.variantGroup.create({
          data: {
            productId,
            name: String(g.name ?? ''),
            required: Boolean(g.required ?? false),
            maxSelect: Number(g.maxSelect ?? 1),
            isImageGroup: Boolean(g.isImageGroup ?? false),
            isDominant: Boolean(g.isDominant ?? false),
            sortOrder: Number(g.sortOrder ?? gi),
          },
        });
        const groupId = group.id;
        const opts = Array.isArray(g.options) ? g.options : [];
        for (let oi = 0; oi < opts.length; oi++) {
          const o = opts[oi] || {};
          const oldOptId = String(o.id ?? '');
          const newOpt = await db.variantOption.create({
            data: {
              groupId,
              name: String(o.name ?? ''),
              priceMod: Number(o.priceMod ?? 0),
              image: String(o.image ?? ''),
              stock: Number(o.stock ?? 0),
              available: o.available !== false,
              sortOrder: Number(o.sortOrder ?? oi),
            },
          });
          if (oldOptId) optIdMap[oldOptId] = newOpt.id;
          void oldGroupId; // group IDs no se usan en combinations directamente
        }
      }

      // Crear combinations si vienen
      if (Array.isArray(combinations)) {
        for (let ci = 0; ci < combinations.length; ci++) {
          const c = combinations[ci] || {};
          let optionIds: string[] = [];
          try {
            const parsed = JSON.parse(c.optionIds || '[]');
            if (Array.isArray(parsed)) optionIds = parsed.filter((id: unknown) => typeof id === 'string');
          } catch {
            /* ignore */
          }
          // Mapear old → new. Si no está en el mapa, conservar el ID original
          // (podría ser un ID ya existente si el admin está editando).
          const mappedIds = optionIds.map((oldId) => optIdMap[oldId] || oldId);
          await db.productCombination.create({
            data: {
              productId,
              optionIds: JSON.stringify(mappedIds),
              sku: String(c.sku ?? ''),
              stock: Number(c.stock ?? 0),
              price: c.price === null || c.price === undefined || c.price === '' ? null : Number(c.price),
              image: String(c.image ?? ''),
              available: c.available !== false,
              sortOrder: Number(c.sortOrder ?? ci),
            },
          });
        }

        // Si no se enviaron combinaciones pero hay 2+ grupos con opciones, generar cartesianas automáticamente
        if (combinations.length === 0) {
          const freshGroups = await db.variantGroup.findMany({
            where: { productId },
            orderBy: { sortOrder: 'asc' },
          });
          if (freshGroups.length >= 2) {
            const groupsWithOptions: { opts: { id: string }[] }[] = [];
            for (const fg of freshGroups) {
              const opts = await db.variantOption.findMany({
                where: { groupId: fg.id },
                orderBy: { sortOrder: 'asc' },
              });
              if (opts.length > 0) groupsWithOptions.push({ opts });
            }
            if (groupsWithOptions.length >= 2) {
              function cross(idx: number, acc: string[]) {
                if (idx >= groupsWithOptions.length) {
                  void db.productCombination.create({
                    data: {
                      productId,
                      optionIds: JSON.stringify(acc),
                      sku: '',
                      stock: 0,
                      price: null,
                      image: '',
                      available: true,
                      sortOrder: 0,
                    },
                  });
                  return;
                }
                for (const opt of groupsWithOptions[idx].opts) {
                  cross(idx + 1, [...acc, opt.id]);
                }
              }
              cross(0, []);
            }
          }
        }
      }
    }

    // Crear extras si vienen
    if (Array.isArray(productExtras)) {
      for (let ei = 0; ei < productExtras.length; ei++) {
        const e = productExtras[ei] || {};
        await db.productExtra.create({
          data: {
            productId,
            name: String(e.name ?? ''),
            description: String(e.description ?? ''),
            priceMod: Number(e.priceMod ?? 0),
            required: Boolean(e.required ?? false),
            sortOrder: Number(e.sortOrder ?? ei),
          },
        });
      }
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
