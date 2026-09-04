import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** V52.7 — antelación máxima (días) requerida por los productos de la reserva. */
async function maxLeadDaysFor(productIds: string[]): Promise<number> {
  if (productIds.length === 0) return 0;
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { reservationDays: true },
  });
  return products.reduce((max, p) => Math.max(max, Number(p.reservationDays) || 0), 0);
}

/** V52.7 — fecha mínima reservable (YYYY-MM-DD) = hoy + leadDays. */
function minReservableDate(leadDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + leadDays);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const reservations = await db.eventReservation.findMany({
      include: { items: true },
      orderBy: { eventDate: 'asc' },
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching event reservations:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventType, eventDate, eventTime, customerName, customerEmail,
      customerPhone, guestCount, budget, paymentMethod, notes, items,
    } = body;

    if (!eventType || !eventDate || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: eventType, eventDate, customerName, customerPhone' },
        { status: 400 }
      );
    }

    // ── V52.7 — respetar la antelación de los productos reservables ──
    // La fecha del evento no puede ser anterior a hoy + mayor antelación
    // de todos los productos incluidos en la reserva.
    const productIds: string[] = (Array.isArray(items) ? items : [])
      .filter((it: any) => String(it.itemType || '') === 'product' && it.itemId)
      .map((it: any) => String(it.itemId));
    const leadDays = await maxLeadDaysFor(productIds);
    const minDate = minReservableDate(leadDays);
    if (String(eventDate) < minDate) {
      return NextResponse.json(
        {
          error: `La fecha del evento (${eventDate}) no cumple la antelación requerida: tu selección necesita ${leadDays} ${leadDays === 1 ? 'día' : 'días'} de elaboración. La fecha más cercana disponible es ${minDate}.`,
        },
        { status: 400 }
      );
    }

    // Calcular totales
    let totalCup = 0;
    let totalUsd = 0;
    const itemsData = (Array.isArray(items) ? items : []).map((it: any) => {
      const qty = Number(it.quantity) || 1;
      const priceCup = Number(it.priceCup) || 0;
      const priceUsd = Number(it.priceUsd) || 0;
      totalCup += priceCup * qty;
      totalUsd += priceUsd * qty;
      return {
        itemType: String(it.itemType || 'service'),
        itemId: String(it.itemId || ''),
        name: String(it.name || ''),
        quantity: qty,
        priceCup,
        priceUsd,
        notes: String(it.notes || ''),
        // V52.7 — miniatura del servicio/producto/variante (para el admin y tickets)
        image: String(it.image || ''),
      };
    });

    const now = new Date().toISOString();
    const code = `RES-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const reservation = await db.eventReservation.create({
      data: {
        reservationCode: code,
        eventType: String(eventType),
        eventDate: String(eventDate),
        eventTime: String(eventTime || ''),
        customerName: String(customerName),
        customerEmail: String(customerEmail || ''),
        customerPhone: String(customerPhone),
        guestCount: Number(guestCount) || 0,
        budget: Number(budget) || 0,
        paymentMethod: String(paymentMethod || ''),
        notes: String(notes || ''),
        status: 'pending',
        totalCup,
        totalUsd,
        leadDays,
        createdAt: now,
        updatedAt: now,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    // ── Enviar notificación por WhatsApp al negocio ──
    try {
      const siteConfig = await db.siteConfig.findUnique({ where: { id: 'site' } });
      const whatsappNumber = siteConfig?.whatsappNumber || '+5351111111';
      const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
      const EVENT_LABELS: Record<string, string> = {
        '15_anos': '15 Años', cumple_ninos: 'Cumpleaños Infantil', cumple_adultos: 'Cumpleaños Adulto',
        boda: 'Boda', bautizo: 'Bautizo', otro: 'Otro Evento',
      };
      const itemsText = itemsData.map((it: any) => `  • ${it.name} ×${it.quantity} — $${(it.priceUsd * it.quantity).toFixed(2)} USD`).join('\n');
      const message = `🧁 *NUEVA RESERVA DE EVENTO* 🧁\n\n*Código:* ${code}\n*Tipo:* ${EVENT_LABELS[String(eventType)] || eventType}\n*Fecha:* ${eventDate}${eventTime ? ` a las ${eventTime}` : ''}\n*Cliente:* ${customerName}\n*Teléfono:* ${customerPhone}${customerEmail ? `\n*Email:* ${customerEmail}` : ''}${guestCount ? `\n*Invitados:* ${guestCount}` : ''}\n\n*Items:*\n${itemsText}\n\n*Total:* $${totalUsd.toFixed(2)} USD${totalCup > 0 ? ` · ₡${totalCup.toLocaleString('es-CU')} CUP` : ''}${leadDays > 0 ? `\n*Antelación requerida:* ${leadDays} ${leadDays === 1 ? 'día' : 'días'}` : ''}\n${paymentMethod ? `*Pago:* ${paymentMethod}` : ''}${notes ? `\n\n*Notas:* ${notes}` : ''}`;

      // Construir URL de WhatsApp (el negocio recibe el mensaje al hacer clic)
      const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
      // No podemos enviar automáticamente sin API de WhatsApp Business,
      // pero devolvemos la URL para que el cliente confirme el envío.
      return NextResponse.json({ ok: true, reservation, whatsappUrl: waUrl }, { status: 201 });
    } catch {
      return NextResponse.json({ ok: true, reservation }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error creating event reservation:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear la reserva' },
      { status: 500 }
    );
  }
}
