import { NextResponse } from 'next/server';
import { createProjectZip } from '@/lib/project-zip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/download
 *
 * Genera y sirve un .zip del proyecto Dulce Encanto LISTO PARA RAILWAY:
 *
 *  1. Incluye solo código fuente (whitelist): src/, prisma/, public/,
 *     data/, scripts/ y las configs (package.json, next.config.ts…).
 *  2. Incluye TODOS los archivos de deploy de Railway: railway.json,
 *     Procfile, nixpacks.toml, scripts/start-railway.mjs, DEPLOY-RAILWAY.md.
 *  3. FUERZA prisma/schema.prisma al modo MySQL, aunque el servidor esté
 *     corriendo en modo SQLite (vista previa). Así el zip siempre sirve
 *     para producción sin pasos extra.
 *  4. Convierte imágenes PNG/JPG a WebP (sharp) y actualiza referencias.
 *  5. Comprime con un writer ZIP puro en JS: no depende del binario `zip`
 *     del sistema (que no existe en el contenedor de Railway).
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

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);
  headers.set('Content-Length', String(result.buffer.length));
  headers.set('X-File-Count', String(result.fileCount));
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Access-Control-Allow-Origin', '*');

  return new NextResponse(new Uint8Array(result.buffer), { status: 200, headers });
}
