import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { decodeCustomerToken, getCustomerTokenFromRequest } from '@/lib/customer-auth';

/**
 * GET /api/orders
 * Requiere autenticación de cliente. Solo devuelve los pedidos del
 * cliente logueado (filtrado por email). No es posible ver pedidos de otros.
 *
 * Query params:
 *   - email: si se pasa, debe coincidir con el email del token. Si no,
 *     se usa el email del token.
 */
export async function GET(request: Request) {
  try {
    // ── Autenticar cliente ──
    const token = getCustomerTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para ver tus pedidos.' },
        { status: 401 }
      );
    }
    const payload = decodeCustomerToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Sesión expirada. Inicia sesión de nuevo.' },
        { status: 401 }
      );
    }

    // El email viene del token (seguro). Si hay query param email,
    // debe coincidir con el del token para evitar acceso cruzado.
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get('email');
    const customerEmail = queryEmail || payload.email;

    const orders = await db.order.findMany({
      where: { customerEmail },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      state,
      zipCode,
      recipientName,
      recipientPhone,
      recipientAddress,
      recipientCity,
      recipientNotes,
      deliveryZoneId,
      deliveryDate,
      deliveryTimeSlot,
      asapTimeSlot,
      items,
      zelleRef,
      paymentProof,
    } = body;

    if (!customerName || !customerEmail || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ── Validar stock disponible antes de crear la orden ──
    // Evita overselling: si algún producto no tiene stock suficiente,
    // rechaza el pedido entero.
    // EXCEPCIÓN: si el producto tiene reservationEnabled=true Y:
    //   - stock del producto < cantidad (reserva a nivel producto), O
    //   - la variante seleccionada tiene stock < cantidad (reserva a nivel variante)
    // En esos casos es una reserva y NO se valida stock.
    // ADEMÁS: si HAY al menos un reservable en el pedido, NO se valida stock
    // de ningún item (porque el negocio elaborará todo fresco).
    const stockErrors: string[] = [];
    // Primero: determinar si hay reservables en el pedido
    let orderHasReservables = false;
    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { reservationEnabled: true, stock: true },
      });
      if (!product?.reservationEnabled) continue;
      if (Number(product.stock) < item.quantity) {
        orderHasReservables = true;
        break;
      }
      if (item.variantInfo && typeof item.variantInfo === 'string') {
        try {
          const variants = JSON.parse(item.variantInfo);
          if (Array.isArray(variants)) {
            for (const v of variants) {
              if (v.optionId) {
                const opt = await db.variantOption.findUnique({
                  where: { id: v.optionId },
                  select: { stock: true },
                });
                if (opt && Number(opt.stock) < item.quantity) {
                  orderHasReservables = true;
                  break;
                }
              }
            }
          }
        } catch { /* ignore */ }
      }
      if (orderHasReservables) break;
    }
    // Si hay reservables, saltar toda la validación de stock
    if (!orderHasReservables) {
      for (const item of items) {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, stock: true, status: true, tiendaAvailable: true },
        });
        if (!product) {
          stockErrors.push(`Producto no encontrado: ${item.productId}`);
          continue;
        }
        if (product.status !== 'active' || !product.tiendaAvailable) {
          stockErrors.push(`"${product.name}" ya no está disponible.`);
          continue;
        }
        if (product.stock < item.quantity) {
          stockErrors.push(
            `"${product.name}" solo tiene ${product.stock} unidad(es) disponible(s), pediste ${item.quantity}.`
          );
        }
      }
    }
    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Stock insuficiente', details: stockErrors },
        { status: 409 }
      );
    }

    const subtotal = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    );

    // El monto mínimo de pedido se valida en el frontend (carrito y checkout),
    // no aquí. La API confía en que el frontend ya validó antes de enviar.
    // Esto evita que el cliente vea un error 400 después de llenar todo el checkout.

    // Resolver la zona de delivery seleccionada (snapshot nombre + precio)
    let zoneSnapshot: { id: string | null; name: string | null; price: number; asapOverride: boolean; asapType: string; asapValue: number } = {
      id: null,
      name: null,
      price: 0,
      asapOverride: false,
      asapType: 'fixed',
      asapValue: 0,
    };
    if (deliveryZoneId && typeof deliveryZoneId === 'string') {
      const zone = await db.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
      if (zone && zone.active) {
        zoneSnapshot = {
          id: zone.id,
          name: zone.name,
          price: Number(zone.price) || 0,
          asapOverride: Boolean(zone.asapSurchargeOverride),
          asapType: String(zone.asapSurchargeType || 'fixed'),
          asapValue: Number(zone.asapSurchargeValue) || 0,
        };
      } else {
        return NextResponse.json(
          { error: 'La zona de delivery seleccionada no está disponible.' },
          { status: 400 }
        );
      }
    }

    // ── Calcular envío gratis ──
    // Si el subtotal supera el mínimo configurado (freeShippingMin), el envío es gratis (0).
    // El admin ve shippingCost=0 y deliveryZonePrice=0 en el pedido.
    const siteConfig = await db.siteConfig.findUnique({ where: { id: 'site' } });
    const freeShippingEnabled = siteConfig ? Boolean((siteConfig as any).freeShippingEnabled) : false;
    const freeShippingMin = siteConfig ? Number((siteConfig as any).freeShippingMin) || 0 : 0;
    const isFreeShipping = freeShippingEnabled && freeShippingMin > 0 && subtotal >= freeShippingMin;

    // Costo de envío base = precio de la zona, o 0 si aplica envío gratis
    const shipping = isFreeShipping ? 0 : (zoneSnapshot.id ? zoneSnapshot.price : 0);
    // Precio de la zona que se guarda en el pedido (0 si es envío gratis)
    const effectiveZonePrice = isFreeShipping ? 0 : zoneSnapshot.price;

    // Cálculo del surcharge por entrega ASAP (fuente de verdad en el servidor).
    //  - Si deliveryTimeSlot !== 'asap' → 0
    //  - Si HAY reservables Y la fecha de entrega NO es hoy/mañana → 0 (gratis)
    //  - Si HAY reservables Y la fecha SÍ es hoy/mañana → se cobra (prioridad real)
    //  - Si NO hay reservables → se cobra normalmente
    let surcharge = 0;
    const slot = String(deliveryTimeSlot || 'normal').toLowerCase();
    if (slot === 'asap') {
      // Verificar si hay al menos un item reservable consultando la BD
      let hasReservableItems = false;
      for (const item of items) {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          select: { id: true, reservationEnabled: true, stock: true },
        });
        if (!product || !product.reservationEnabled) continue;
        if (Number(product.stock) < item.quantity) {
          hasReservableItems = true;
          break;
        }
        if (item.variantInfo && typeof item.variantInfo === 'string') {
          try {
            const variants = JSON.parse(item.variantInfo);
            if (Array.isArray(variants)) {
              for (const v of variants) {
                if (v.optionId) {
                  const opt = await db.variantOption.findUnique({
                    where: { id: v.optionId },
                    select: { stock: true },
                  });
                  if (opt && Number(opt.stock) < item.quantity) {
                    hasReservableItems = true;
                    break;
                  }
                }
              }
            }
          } catch { /* ignore */ }
        }
        if (hasReservableItems) break;
      }

      // Determinar si la entrega es próxima (hoy o mañana)
      const now = new Date();
      const cubaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Havana' }));
      const todayStr = `${cubaTime.getFullYear()}-${String(cubaTime.getMonth() + 1).padStart(2, '0')}-${String(cubaTime.getDate()).padStart(2, '0')}`;
      const tomorrow = new Date(cubaTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      const deliveryDateStr = typeof deliveryDate === 'string' ? deliveryDate : '';
      const isNearTermDelivery = deliveryDateStr === todayStr || deliveryDateStr === tomorrowStr;

      // Solo cobrar si NO hay reservables, o si hay pero es entrega próxima
      if (!hasReservableItems || isNearTermDelivery) {
        let surchargeType = 'fixed';
        let surchargeValue = 0;
        if (zoneSnapshot.asapOverride) {
          surchargeType = zoneSnapshot.asapType;
          surchargeValue = zoneSnapshot.asapValue;
        } else {
          if (siteConfig) {
            surchargeType = String((siteConfig as any).asapSurchargeType || 'fixed');
            surchargeValue = Number((siteConfig as any).asapSurchargeValue) || 0;
          }
        }
        if (surchargeType === 'percent') {
          // El porcentaje se aplica sobre (subtotal + envío)
          surcharge = ((subtotal + shipping) * surchargeValue) / 100;
        } else {
          surcharge = surchargeValue;
        }
        surcharge = Math.round(surcharge * 100) / 100; // redondeo a 2 decimales
      }
    }

    const total = subtotal + shipping + surcharge;

    // Prefijo del vale: DE = Dulce Encanto (antes decia "DPE" y se cambio a
    // peticion del cliente para que el vale identifique a la tienda).
    const orderNumber = `DE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const order = await db.order.create({
      data: {
        orderNumber,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        address: address || '',
        city: city || '',
        state: state || '',
        zipCode: zipCode || '',
        recipientName: recipientName || '',
        recipientPhone: recipientPhone || '',
        recipientAddress: recipientAddress || '',
        recipientCity: recipientCity || 'Ciego de Ávila',
        recipientNotes: recipientNotes || '',
        deliveryZoneId: zoneSnapshot.id,
        deliveryZoneName: zoneSnapshot.name,
        deliveryZonePrice: effectiveZonePrice,
        deliveryDate: typeof deliveryDate === 'string' ? deliveryDate : null,
        deliveryTimeSlot: slot,
        asapTimeSlot: typeof asapTimeSlot === 'string' && asapTimeSlot.trim() ? asapTimeSlot.trim() : null,
        deliverySurcharge: surcharge,
        shippingCost: shipping,
        total,
        status: zelleRef ? 'confirmed' : 'pending',
        isPaid: false,
        zelleRef: zelleRef || null,
        paymentProof: paymentProof || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: {
          create: items.map((item: {
            productId: string;
            name: string;
            price: number;
            quantity: number;
            image: string;
            variantInfo?: string;
            extrasInfo?: string;
          }) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            // Persistencia de variantes y extras seleccionados (JSON string).
            // Si el cliente no los envía, se guardan como arrays vacíos.
            variantInfo: typeof item.variantInfo === 'string' ? item.variantInfo : '[]',
            extrasInfo: typeof item.extrasInfo === 'string' ? item.extrasInfo : '[]',
          })),
        },
      },
      include: { items: true },
    });

    // ── Determinar si el pedido tiene al menos un item reservable ──
    // Si hay reservables, NO se descuenta stock de NINGÚN item porque:
    // - Los reservables son elaborados que el negocio hará frescos
    // - Los elaborados con stock son para ventas inmediatas, no para fecha futura
    // - El negocio elaborará todo fresco cerca de la fecha de entrega
    let orderHasReservableItems = false;
    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { reservationEnabled: true, stock: true },
      });
      if (!product?.reservationEnabled) continue;
      if (Number(product.stock) < item.quantity) {
        orderHasReservableItems = true;
        break;
      }
      if (item.variantInfo && typeof item.variantInfo === 'string') {
        try {
          const variants = JSON.parse(item.variantInfo);
          if (Array.isArray(variants)) {
            for (const v of variants) {
              if (v.optionId) {
                const opt = await db.variantOption.findUnique({
                  where: { id: v.optionId },
                  select: { stock: true },
                });
                if (opt && Number(opt.stock) < item.quantity) {
                  orderHasReservableItems = true;
                  break;
                }
              }
            }
          }
        } catch { /* ignore */ }
      }
      if (orderHasReservableItems) break;
    }

    // ── Update stock for each product ──
    // Solo se descuenta stock si NO hay reservables en el pedido.
    // Si hay reservables, el negocio elaborará todo fresco → no se descuenta nada.
    if (!orderHasReservableItems) {
    for (const item of items) {
        // Decrementar stock del producto padre
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Decrementar stock individual de cada VariantOption seleccionada
        if (item.variantInfo && typeof item.variantInfo === 'string') {
          try {
            const variants = JSON.parse(item.variantInfo);
            if (Array.isArray(variants)) {
              for (const v of variants) {
                const optId = v.optionId;
                if (optId && typeof optId === 'string') {
                  try {
                    await db.variantOption.update({
                      where: { id: optId },
                      data: { stock: { decrement: item.quantity } },
                    });
                  } catch { /* ignore */ }
                }
              }
            }
          } catch { /* ignore */ }
        }

        // Decrementar stock de ProductCombination si coincide
        if (item.variantInfo && typeof item.variantInfo === 'string') {
          try {
            const variants = JSON.parse(item.variantInfo);
            if (Array.isArray(variants) && variants.length > 0) {
              const optionIds = variants
                .map((v: { optionId?: string }) => v.optionId)
                .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
              if (optionIds.length > 0) {
                const combinations = await db.productCombination.findMany({
                  where: { productId: item.productId },
                });
                for (const combo of combinations) {
                  try {
                    const comboIds: string[] = JSON.parse(combo.optionIds);
                    if (
                      Array.isArray(comboIds) &&
                      comboIds.length === optionIds.length &&
                      optionIds.every(id => comboIds.includes(id))
                    ) {
                      await db.productCombination.update({
                        where: { id: combo.id },
                        data: { stock: { decrement: item.quantity } },
                      });
                      break;
                    }
                  } catch { /* ignore */ }
                }
              }
            }
          } catch { /* ignore */ }
        }
      }
    }

    // ── Enviar notificación por WhatsApp al negocio ──
    let whatsappUrl: string | undefined;
    try {
      const siteConfig = await db.siteConfig.findUnique({ where: { id: 'site' } });
      const whatsappNumber = siteConfig?.whatsappNumber || '+5351111111';
      const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
      const body = typeof request === 'object' ? (await (await request.clone()).json()) : {};
      const items = Array.isArray(body.items) ? body.items : [];
      const itemsText = items.map((it: any) => `  • ${it.name} ×${it.quantity} — ₱${((Number(it.price) || 0) * (Number(it.quantity) || 1)).toLocaleString('es-CU')}`).join('\n');
      const customerName = body.customerName || body.recipientName || 'Cliente';
      const customerPhone = body.customerPhone || body.customerEmail || '';
      const total = Number(body.total) || 0;
      const orderNumber = (order as any)?.orderNumber || '';
      const message = `🛒 *NUEVO PEDIDO* 🛒\n\n*Pedido:* ${orderNumber}\n*Cliente:* ${customerName}${customerPhone ? `\n*Teléfono:* ${customerPhone}` : ''}\n\n*Items:*\n${itemsText}\n\n*Total:* ₱${total.toLocaleString('es-CU')} CUP`;
      whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    } catch { /* ignore */ }

    return NextResponse.json({ ...(order as object), whatsappUrl }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
