import { NextRequest, NextResponse } from 'next/server';
import { createProjectZip } from '@/lib/project-zip';
import { requireAdmin, unauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/admin/download  (requiere token de admin)
 *
 * Igual que /api/download pero:
 *  - Verifica el JWT del admin (requireAdmin soporta header Authorization
 *    y ?token= query).
 *  - Incrusta DOWNLOAD-MANIFEST.json dentro del ZIP con metadatos del
 *    proyecto y credenciales iniciales del admin.
 *  - Expone X-File-Count (el panel admin lo muestra al descargar).
 */
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return unauthorized();

  const manifest = {
    generatedAt: new Date().toISOString(),
    project: 'dulce-encanto',
    description: 'Dulce Encanto — Tienda online de repostería (Next.js 16 + Prisma + Railway MySQL)',
    deployTarget: 'Railway (MySQL) — ver DEPLOY-RAILWAY.md',
    features: [
      'E-commerce completo (catálogo, carrito, checkout, pedidos, cupones)',
      'Pago Zelle + comprobante, tasas de cambio y precios CUP/USD',
      'Panel admin completo (productos, categorías, pedidos, delivery, temas, reservas)',
      'Zonas de delivery personalizables con selector moderno',
      'Reservas de eventos (quinceañeras, bodas, cumpleaños) con items',
      'Asistente IA con contexto del catálogo (z-ai-web-dev-sdk)',
      'PWA instalable (manifest + service worker)',
      'Prisma MySQL en Railway / SQLite en vista previa (switch-schema)',
    ],
    admin: { email: 'admin@dulceencanto.com', password: 'DulceAdmin2026!' },
    howToRun: [
      '1) Local (vista previa SQLite): npm install && npx prisma generate && npx prisma db push && npm run dev',
      '2) Producción Railway: configurar DATABASE_URL (MySQL), JWT_SECRET, NODE_ENV=production y deployar',
      '3) El arranque (scripts/start-railway.mjs) crea tablas y siembra datos en paralelo',
    ],
    notes: [
      'El ZIP siempre incluye prisma/schema.prisma en modo MySQL (listo para Railway)',
      'Los seeds leen de data/ (scraped-products.json) en el arranque de Railway',
      'Cambiar la contraseña del admin tras el primer login',
    ],
  };

  const result = await createProjectZip({ manifest, filenamePrefix: 'dulce-encanto' });

  if (!result.ok || !result.buffer) {
    console.error('[/api/admin/download]', result.error);
    return NextResponse.json(
      { error: result.error || 'No se pudo generar el paquete.' },
      { status: 500 }
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);
  headers.set('Content-Length', String(result.buffer.length));
  headers.set('X-File-Count', String(result.fileCount));
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return new NextResponse(new Uint8Array(result.buffer), { status: 200, headers });
}
