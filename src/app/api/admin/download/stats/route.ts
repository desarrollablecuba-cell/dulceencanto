import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';
import { readDownloadStats } from '@/lib/project-zip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/download/stats  (requiere token de admin)
 *
 * Estadísticas del paquete de código (V52.3 — Centro de Descargas del admin):
 *  - pendingVersion: la V que recibirá la PRÓXIMA descarga real (no la quema)
 *  - totalDownloads / lastDownloadAt: resumen del historial
 *  - history: últimos paquetes servidos (versión, fecha, archivos, bytes)
 *
 * Solo LEE db/download-version.json — nunca genera ZIP ni consume versiones.
 */
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return unauthorized();

  try {
    const stats = await readDownloadStats();
    return NextResponse.json(
      { ...stats, generatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[/api/admin/download/stats]', err);
    return NextResponse.json(
      { error: 'No se pudieron leer las estadísticas de descarga.' },
      { status: 500 }
    );
  }
}
