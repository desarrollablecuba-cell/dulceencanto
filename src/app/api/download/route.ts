import { NextResponse } from 'next/server';
import { createProjectZip, type ProjectZipSuccess } from '@/lib/project-zip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/download
 *
 * Genera y sirve un .zip del proyecto Dulce Encanto LISTO PARA RAILWAY:
 *
 *  1. Incluye el código REAL del proyecto (whitelist): src/, prisma/,
 *     public/, data/, scripts/ y las configs — leído del disco en el
 *     momento de la descarga, sin caché.
 *  2. AUTOVERIFICA que el paquete contiene el código de la última versión
 *     (galería v2, dock móvil, seeds, autorreparación de BD, etc.) antes
 *     de servirlo; si falta algo, falla con error claro.
 *  3. VERSIONA cada paquete: dulce-encanto-V50.zip, V51, … (+1 por
 *     descarga) e incrusta VERSION.txt + DOWNLOAD-MANIFEST.json con
 *     fingerprint SHA-256 dentro del ZIP.
 *  4. FUERZA prisma/schema.prisma al modo MySQL, aunque el servidor esté
 *     corriendo en modo SQLite (vista previa).
 *  5. Convierte imágenes PNG/JPG a WebP (sharp) y actualiza referencias.
 *  6. Comprime con un writer ZIP puro en JS.
 *
 *  Tras desplegar, abre /api/health en Railway: "appVersion" debe ser
 *  la V de este ZIP (p.ej. "50.0.0").
 *
 *  Excluye por diseño: node_modules, .next, .git, .env (secretos),
 *  upload/, download/, db/ local, logs, etc.
 */
export async function GET() {
  const result = await createProjectZip({ filenamePrefix: 'dulce-encanto' });

  if (!result.ok || !result.buffer) {
    console.error('[/api/download]', result.error);
    return NextResponse.json(
      { error: result.error || 'Error al generar el paquete.' },
      { status: 500 }
    );
  }
  const zip = result as ProjectZipSuccess;

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="${zip.filename}"`);
  headers.set('Content-Length', String(zip.buffer.length));
  headers.set('X-File-Count', String(zip.fileCount));
  headers.set('X-Version', zip.version);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Access-Control-Allow-Origin', '*');

  return new NextResponse(new Uint8Array(zip.buffer), { status: 200, headers });
}
