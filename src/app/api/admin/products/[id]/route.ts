import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

/** Genera un SKU aleatorio con formato PROD-XXXXXX. */
function generateSKU(): string {
  return 'PROD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { id } = await params;
    const body = await request.json();

    // Extraer relaciones y campos que requieren tratamiento especial
    const {
      variantGroups,
      combinations,
      productExtras,
      wholesaleTiers,
      tags: rawTags,
      sku: rawSku,
      ...productFields
    } = body;

    // Validar nombre obligatorio si viene en el body
    if (productFields.name !== undefined && (!productFields.name || typeof productFields.name !== 'string' || !productFields.name.trim())) {
      return NextResponse.json(
        { error: 'El nombre del producto es obligatorio.' },
        { status: 400 }
      );
    }

    // Construir data plana para el Product
    const data: Record<string, unknown> = { ...productFields };

    if (typeof rawSku === 'string') {
      data.sku = rawSku.trim() ? rawSku.trim() : generateSKU();
    }
    if (rawTags !== undefined) {
      data.tags = normalizeTags(rawTags);
    }

    // SIGECOS: costos y margen — recalcular si vienen price o costPrice
    if (data.price !== undefined || data.costPrice !== undefined) {
      // Necesitamos ambos para calcular el margen. Si sólo viene uno, usar el actual del producto.
      const current = await db.product.findUnique({ where: { id } });
      const salePrice = data.price !== undefined ? Number(data.price) : Number(current?.price ?? 0);
      const costPrice = data.costPrice !== undefined ? Number(data.costPrice) : Number(current?.costPrice ?? 0);
      data.price = salePrice;
      data.costPrice = costPrice;
      if (data.marginPercent === undefined) {
        data.marginPercent = calcMargin(salePrice, costPrice);
      }
    }

    // Coerción de campos numéricos/booleanos si están presentes
    if (data.stock !== undefined) data.stock = Number(data.stock);
    if (data.order !== undefined) data.order = Number(data.order);
    if (data.offerPrice !== undefined) data.offerPrice = Number(data.offerPrice);
    if (data.offerEnabled !== undefined) data.offerEnabled = Boolean(data.offerEnabled);
    if (data.offerType !== undefined) data.offerType = String(data.offerType);
    // Convertir null → '' para offerStart/offerEnd (compatibilidad MySQL NOT NULL)
    if (data.offerStart !== undefined) data.offerStart = data.offerStart === null ? '' : String(data.offerStart);
    if (data.offerEnd !== undefined) data.offerEnd = data.offerEnd === null ? '' : String(data.offerEnd);
    // Lo mismo para promoStart/promoEnd
    if (data.promoStart !== undefined) data.promoStart = data.promoStart === null ? '' : String(data.promoStart);
    if (data.promoEnd !== undefined) data.promoEnd = data.promoEnd === null ? '' : String(data.promoEnd);
    // SIGECOS
    if (data.saleUnit !== undefined) data.saleUnit = String(data.saleUnit);
    if (data.barcode !== undefined) data.barcode = String(data.barcode);
    if (data.productType !== undefined) data.productType = String(data.productType);
    if (data.status !== undefined) data.status = String(data.status);
    if (data.posAvailable !== undefined) data.posAvailable = Boolean(data.posAvailable);
    if (data.tiendaAvailable !== undefined) data.tiendaAvailable = Boolean(data.tiendaAvailable);
    // V52.6 — canales de venta (Venta Directa / Buffet para Repartir)
    if (data.directSaleEnabled !== undefined) data.directSaleEnabled = Boolean(data.directSaleEnabled);
    if (data.buffetEnabled !== undefined) data.buffetEnabled = Boolean(data.buffetEnabled);
    // V52.8 — precio del buffet por docena en USD
    if (data.buffetPriceUsd !== undefined) data.buffetPriceUsd = Number(data.buffetPriceUsd) || 30;
    if (data.advanceType !== undefined) data.advanceType = String(data.advanceType);
    if (data.advanceValue !== undefined) data.advanceValue = Number(data.advanceValue);
    if (data.minHours !== undefined) data.minHours = Number(data.minHours);
    if (data.minHoursUnit !== undefined) data.minHoursUnit = data.minHoursUnit === 'dias' ? 'dias' : 'horas';
    if (data.marginPercent !== undefined) data.marginPercent = Number(data.marginPercent);
    // Wholesale (legacy)
    if (data.wholesaleEnabled !== undefined) data.wholesaleEnabled = Boolean(data.wholesaleEnabled);
    if (data.wholesalePrice !== undefined) data.wholesalePrice = Number(data.wholesalePrice);
    if (data.wholesaleMinQty !== undefined) data.wholesaleMinQty = Number(data.wholesaleMinQty);
    // Reservation
    if (data.reservationEnabled !== undefined) {
      // NO permitir reservas en mercancías
      if (data.productType === 'mercancia' && data.reservationEnabled) {
        data.reservationEnabled = false;
      } else {
        data.reservationEnabled = Boolean(data.reservationEnabled);
      }
    }
    if (data.maxReservations !== undefined) data.maxReservations = Number(data.maxReservations);
    if (data.reservationDays !== undefined) data.reservationDays = Number(data.reservationDays);
    if (data.reservationDeposit !== undefined) data.reservationDeposit = Number(data.reservationDeposit);
    // Promo
    if (data.promoEnabled !== undefined) data.promoEnabled = Boolean(data.promoEnabled);
    if (data.promoType !== undefined) data.promoType = String(data.promoType);
    if (data.promoValue !== undefined) data.promoValue = Number(data.promoValue);
    if (data.promoBuyQty !== undefined) data.promoBuyQty = Number(data.promoBuyQty);
    if (data.promoGetQty !== undefined) data.promoGetQty = Number(data.promoGetQty);
    if (data.images !== undefined) data.images = String(data.images);
    if (data.shortName !== undefined) data.shortName = String(data.shortName);

    const product = await db.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    // ─── Wholesale tiers (recreación) ───
    if (Array.isArray(wholesaleTiers)) {
      await db.wholesaleTier.deleteMany({ where: { productId: id } });
      for (let ti = 0; ti < wholesaleTiers.length; ti++) {
        const t = wholesaleTiers[ti] || {};
        await db.wholesaleTier.create({
          data: {
            productId: id,
            name: String(t.name ?? ''),
            minQty: Number(t.minQty ?? 0),
            maxQty: Number(t.maxQty ?? 0),
            price: Number(t.price ?? 0),
            sortOrder: Number(t.sortOrder ?? ti),
          },
        });
      }
    }

    // ─── Variant groups + options (recreación con mapeo de IDs) ───
    if (Array.isArray(variantGroups)) {
      // 1) Borrar combinaciones viejas del producto
      await db.productCombination.deleteMany({ where: { productId: id } });

      // 2) Borrar opciones viejas (necesitamos los groupIds primero)
      const oldGroups = await db.variantGroup.findMany({ where: { productId: id } });
      const oldGroupIds = oldGroups.map((g) => g.id);
      const idMap: Record<string, string> = {}; // oldGroupId -> newGroupId
      const optIdMap: Record<string, string> = {}; // oldOptionId -> newOptionId

      if (oldGroupIds.length > 0) {
        await db.variantOption.deleteMany({ where: { groupId: { in: oldGroupIds } } });
      }

      // 3) Borrar grupos viejos
      await db.variantGroup.deleteMany({ where: { productId: id } });

      // 4) Crear nuevos grupos + opciones y mapear IDs
      for (let gi = 0; gi < variantGroups.length; gi++) {
        const g = variantGroups[gi] || {};
        const oldGroupId = String(g.id ?? '');
        const newGroup = await db.variantGroup.create({
          data: {
            productId: id,
            name: String(g.name ?? ''),
            required: Boolean(g.required ?? false),
            maxSelect: Number(g.maxSelect ?? 1),
            isImageGroup: Boolean(g.isImageGroup ?? false),
            isDominant: Boolean(g.isDominant ?? false),
            sortOrder: Number(g.sortOrder ?? gi),
          },
        });
        if (oldGroupId) idMap[oldGroupId] = newGroup.id;

        const opts = Array.isArray(g.options) ? g.options : [];
        for (let oi = 0; oi < opts.length; oi++) {
          const o = opts[oi] || {};
          const oldOptId = String(o.id ?? '');
          const newOpt = await db.variantOption.create({
            data: {
              groupId: newGroup.id,
              name: String(o.name ?? ''),
              priceMod: Number(o.priceMod ?? 0),
              image: String(o.image ?? ''),
              stock: Number(o.stock ?? 0),
              available: o.available !== false,
              sortOrder: Number(o.sortOrder ?? oi),
            },
          });
          if (oldOptId) optIdMap[oldOptId] = newOpt.id;
        }
      }

      // 5) Recrear combinations con IDs mapeados (si se enviaron)
      if (Array.isArray(combinations)) {
        for (let ci = 0; ci < combinations.length; ci++) {
          const c = combinations[ci] || {};
          let oldIds: string[] = [];
          try {
            const parsed = JSON.parse(c.optionIds || '[]');
            if (Array.isArray(parsed)) oldIds = parsed.filter((x: unknown) => typeof x === 'string');
          } catch {
            /* ignore */
          }
          // Mapear old → new. Si no está en el mapa, conservar el ID original
          // (puede ser un ID recién creado por el admin en la misma sesión).
          const mappedIds = oldIds.map((oldId) => optIdMap[oldId] || oldId);
          await db.productCombination.create({
            data: {
              productId: id,
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
      }
    }

    // ─── Product extras (recreación) ───
    if (Array.isArray(productExtras)) {
      await db.productExtra.deleteMany({ where: { productId: id } });
      for (let ei = 0; ei < productExtras.length; ei++) {
        const e = productExtras[ei] || {};
        await db.productExtra.create({
          data: {
            productId: id,
            name: String(e.name ?? ''),
            description: String(e.description ?? ''),
            priceMod: Number(e.priceMod ?? 0),
            required: Boolean(e.required ?? false),
            sortOrder: Number(e.sortOrder ?? ei),
          },
        });
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { id } = await params;

    // Limpiar relaciones antes de borrar el producto
    await db.productCombination.deleteMany({ where: { productId: id } });
    await db.productExtra.deleteMany({ where: { productId: id } });
    await db.wholesaleTier.deleteMany({ where: { productId: id } });
    const groups = await db.variantGroup.findMany({ where: { productId: id } });
    const groupIds = groups.map((g) => g.id);
    if (groupIds.length > 0) {
      await db.variantOption.deleteMany({ where: { groupId: { in: groupIds } } });
    }
    await db.variantGroup.deleteMany({ where: { productId: id } });

    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
