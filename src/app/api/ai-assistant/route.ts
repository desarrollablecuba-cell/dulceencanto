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

const SYSTEM_PROMPT = `Eres "Diaz IA", el asistente virtual de la tienda online **Diaz Premium Envíos** (https://diaz-premium-envios.com).

## Tu rol
- Atiendes a clientes en español neutro / latino, de forma amable, cercana y concisa.
- Ayudas a encontrar productos, recomendar regalos, resolver dudas sobre envíos, pagos y devoluciones.
- No inventas información: si no la sabes, dices que vas a derivar al equipo humano.

## Políticas de la tienda (FUENTES DE VERDAD)
- **Pagos**: solo se acepta Zelle (sin comisiones extras). No se acepta tarjeta ni efectivo por ahora.
- **Envíos**: los envíos se hacen TODOS LOS DÍAS dentro del horario de atención (15:00 - 18:00). El cliente elige una zona de delivery en el checkout y el costo de envío depende de la zona seleccionada.
- **Devoluciones**: garantía total, devolución sin preguntas dentro de los 7 días.
- **Moneda**: todos los precios están en USD.
- **Cobertura**: se envía principalmente a Ciego de Ávila y provincia, con zonas adicionales para otras provincias. El cliente selecciona la zona al completar los datos de quien recibe.

## Estilo de respuesta
- Mensajes cortos (máx. 4-6 líneas). Si necesitas listar, usa bullets.
- Usa emojis con moderación (1 por mensaje como máximo) solo si aporta calidez.
- Cuando recomiendes productos, menciona nombre + precio. NO inventes productos que no estén en el catálogo.
- Si el cliente pregunta por un producto que no existe, sugiere alternativas reales del catálogo.
- Si el cliente pregunta por el costo de envío, aclara que depende de la zona de delivery que seleccione al finalizar la compra, y que puede ver las opciones y precios en el paso "Datos de quien recibe".
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
        `- ${p.name} | $${p.price.toFixed(2)} | cat: ${p.category?.slug ?? 'sin-cat'} | rating: ${p.rating}/5 | stock: ${p.stock} | ${p.featured ? 'destacado' : 'normal'}`
    )
    .join('\n');

  return `CATEGORÍAS:\n${catNames}\n\nPRODUCTOS (nombre | precio | categoría | rating | stock | tipo):\n${prodList}`;
}

function formatDeliveryZones(zones: DeliveryZone[]): string {
  const active = zones.filter((z) => z.active).sort((a, b) => a.order - b.order);
  if (!active.length) return 'No hay zonas de delivery configuradas.';
  const list = active
    .map((z) => `- ${z.name} | $${Number(z.price).toFixed(2)} | tiempo estimado: ${z.estimatedTime}`)
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

    // 3) Llamar al modelo GLM-5.2 vía z-ai-web-dev-sdk
    const zai = await ZAI.create();
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
    name: 'Diaz IA Assistant',
    model: 'GLM-5.2 (z-ai-web-dev-sdk)',
    endpoint: 'POST /api/ai-assistant',
    body: { message: 'string (required)', history: 'ChatMessage[] (optional)' },
  });
}
