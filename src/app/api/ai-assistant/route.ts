import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
// Types defined inline for Prisma compatibility

// ⚠️ z-ai-web-dev-sdk MUST be used in backend only.
import ZAI from 'z-ai-web-dev-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantRequestBody {
  message: string;
  history?: ChatMessage[];
}

const SYSTEM_PROMPT = `Eres "Dulce IA", el asistente virtual de la tienda online **Dulce Encanto**, repostería artesanal en Ciego de Ávila, Cuba.

## Tu rol
- Atiendes a clientes en español neutro / latino, de forma amable, cercana y concisa.
- Ayudas a encontrar productos, recomendar dulces para eventos, resolver dudas sobre pedidos, reservas y entregas.
- No inventas información: si no la sabes, dices que vas a derivar al equipo humano por WhatsApp.

## Políticas de la tienda (FUENTES DE VERDAD)
- **Moneda**: los precios están en CUP (Peso Cubano). Para quien paga desde el exterior por Zelle, se acepta el equivalente en USD.
- **Pagos**: DOS opciones:
  1. **Zelle en USD** — para familiares/amigos que pagan desde el exterior (sin comisiones).
  2. **Pago local desde Cuba** — en CUP, en efectivo o transferencia, coordinado con la tienda al confirmar el pedido.
- **Entregas**: a domicilio en Ciego de Ávila (ciudad) y periferia/municipios cercanos. El cliente elige la zona de delivery en el checkout y el costo depende de la zona.
- **Reservas**: tartas y pasteles personalizados se reservan con al menos 48 horas de anticipación. Los dulces finos y buffet están disponibles para venta directa con 24 horas.
- **Horario**: lunes a sábado 09:00 - 18:00, domingo cerrado (pedidos online 24/7).

## Estilo de respuesta
- Mensajes cortos (máx. 4-6 líneas). Si necesitas listar, usa bullets.
- Usa emojis con moderación (1 por mensaje como máximo) solo si aporta calidez.
- Cuando recomiendes productos, menciona nombre + precio en CUP. NO inventes productos que no estén en el catálogo.
- Si el cliente pregunta por un producto que no existe, sugiere alternativas reales del catálogo.
- Si el cliente pregunta por el costo de entrega, aclara que depende de la zona de delivery que seleccione al finalizar la compra.
- Si el cliente quiere comprar, indícale que pulse el botón "Agregar al carrito" y luego "Finalizar compra".

## Catálogo disponible
Se te inyectará el catálogo actualizado en cada petición dentro del contexto. Úsalo como única fuente de verdad.

## Zonas de delivery
Se te inyectará la lista de zonas de delivery disponibles (con nombre, precio y tiempo estimado). Refiérete a ellas cuando el cliente pregunte por costos de envío o cobertura.`;

function formatCatalog(products: (Product & { category?: Category | null })[], categories: Category[]): string {
  if (!products.length) return 'El catálogo está vacío temporalmente.';

  const catNames = categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => `- ${c.name} (${c.slug})`)
    .join('\n');

  const prodList = products
    .slice(0, 60)
    .map(
      (p) =>
        `- ${p.name} | ₱${p.price.toFixed(2)} CUP | cat: ${p.category?.slug ?? 'sin-cat'} | rating: ${p.rating}/5 | stock: ${p.stock} | ${p.featured ? 'destacado' : 'normal'}`
    )
    .join('\n');

  return `CATEGORÍAS:\n${catNames}\n\nPRODUCTOS (nombre | precio | categoría | rating | stock | tipo):\n${prodList}`;
}

function formatDeliveryZones(zones: DeliveryZone[]): string {
  const active = zones.filter((z) => z.active).sort((a, b) => a.order - b.order);
  if (!active.length) return 'No hay zonas de delivery configuradas.';
  const list = active
    .map((z) => `- ${z.name} | ₱${Number(z.price).toFixed(2)} CUP | tiempo estimado: ${z.estimatedTime}`)
    .join('\n');
  return `ZONAS DE DELIVERY ACTIVAS (nombre | precio | tiempo estimado):\n${list}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssistantRequestBody;
    const userMessage = body?.message?.trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json(
        { ok: false, error: 'El mensaje está vacío.' },
        { status: 400 }
      );
    }
    if (userMessage.length > 1000) {
      return NextResponse.json(
        { ok: false, error: 'El mensaje es demasiado largo (máx 1000 caracteres).' },
        { status: 400 }
      );
    }

    // 1) Cargar catálogo + zonas de delivery desde el store JSON
    const [categories, products, deliveryZones] = await Promise.all([
      db.category.findMany({ orderBy: { order: 'asc' } }),
      db.product.findMany({ include: { category: true }, orderBy: { createdAt: 'desc' } }),
      db.deliveryZone.findMany({ orderBy: { order: 'asc' } }),
    ]);

    const catalogBlock = formatCatalog(products, categories);
    const zonesBlock = formatDeliveryZones(deliveryZones);

    // 2) Construir mensajes para GLM-5.2 (rol 'assistant' = system prompt)
    const trimmedHistory = history.slice(-6);

    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: `${SYSTEM_PROMPT}\n\n## Catálogo actual\n${catalogBlock}\n\n## Zonas de delivery\n${zonesBlock}`,
      },
      ...trimmedHistory.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? '').slice(0, 1000),
      })),
      { role: 'user', content: userMessage },
    ];

    // 3) Llamar al modelo vía z-ai-web-dev-sdk
    //    Fuera del sandbox de Z.AI (Railway/Hostinger) el SDK no tiene
    //    credenciales: devolvemos un mensaje de respaldo en vez de un 500
    //    para que el chat de la tienda no se rompa.
    let zai: Awaited<ReturnType<typeof ZAI.create>>;
    try {
      zai = await ZAI.create();
    } catch {
      return NextResponse.json(
        {
          ok: true,
          reply:
            '¡Hola! 🧁 Nuestro asistente automático no está disponible en este momento, pero puedes escribirnos por WhatsApp y te respondemos enseguida.',
        },
        { status: 200 }
      );
    }
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json(
        {
          ok: true,
          reply:
            'Lo siento, en este momento no puedo responder. Por favor escríbenos por WhatsApp o intenta de nuevo en unos minutos.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, reply }, { status: 200 });
  } catch (err) {
    console.error('[/api/ai-assistant] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Ocurrió un error al procesar tu mensaje. Intenta nuevamente.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Dulce IA Assistant',
    endpoint: 'POST /api/ai-assistant',
    body: { message: 'string (required)', history: 'ChatMessage[] (optional)' },
  });
}
