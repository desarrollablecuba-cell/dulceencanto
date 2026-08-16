import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { requireAdmin, unauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ZipResult {
  ok: boolean;
  buffer?: Buffer;
  fileCount?: number;
  error?: string;
}

/**
 * Empaqueta el proyecto en un ZIP usando el binario `zip` del sistema.
 * Excluye node_modules, .next, .git, data y otros archivos que no son fuente.
 */
async function createProjectZip(): Promise<ZipResult> {
  const projectRoot = process.cwd();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'diaz-zip-'));
  const zipPath = path.join(tmpDir, 'project.zip');

  // Generar manifest con metadatos útiles para el usuario
  const manifest = {
    generatedAt: new Date().toISOString(),
    project: 'diaz-premium-envios',
    description: 'Tienda online Diaz Premium Envíos - Next.js 16 + GLM-5.2',
    features: [
      'E-commerce completo (catálogo, carrito, checkout, pedidos)',
      'Pago con Zelle + comprobante',
      'Panel admin (productos, categorías, pedidos, delivery, ajustes)',
      'Zonas de delivery personalizables con selector moderno',
      'Asistente IA Diaz IA (GLM-5.2) con contexto del catálogo y zonas',
      'Persistencia en JSON (sin DB externa)',
    ],
    admin: { username: 'admin', password: 'diaz2024' },
    howToRun: [
      '1) Instalar dependencias: bun install',
      '2) Modo desarrollo: bun run dev',
      '3) Producción: bun run build && bun run start',
    ],
    notes: [
      'El store JSON auto-seed en data/ al primer arranque',
      'Para usar Prisma en vez de JSON, ver src/lib/db.ts y src/lib/store.ts',
      'Las zonas de delivery se gestionan desde /admin → Delivery',
    ],
  };
  try {
    await fs.writeFile(
      path.join(projectRoot, 'DOWNLOAD-MANIFEST.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  } catch {
    /* best-effort */
  }

  // Lista de argumentos para `zip -r`:
  //  -r  recursivo
  //  -q  silencioso
  //  -x  exclusiones (patrones relativos al cwd)
  // Excluimos todo lo que no es código fuente del proyecto:
  //  - node_modules, .next, .git, cache de bun
  //  - data/ (persistencia local del store JSON)
  //  - .zscripts/, agent-ctx/, skills/, examples/, tool-results/
  //    (infraestructura del sandbox, no del proyecto)
  //  - upload/ (ZIPs originales que el usuario subió)
  //  - download/ (entregables generados previamente)
  //  - logs y archivos del SO
  const excludePatterns = [
    'node_modules/*',
    'node_modules/**/*',
    '.next/*',
    '.next/**/*',
    '.git/*',
    '.git/**/*',
    'data/*',
    'data/**/*',
    '.zscripts/*',
    '.zscripts/**/*',
    'agent-ctx/*',
    'agent-ctx/**/*',
    'skills/*',
    'skills/**/*',
    'examples/*',
    'examples/**/*',
    'tool-results/*',
    'tool-results/**/*',
    'upload/*',
    'upload/**/*',
    'download/*',
    'download/**/*',
    'mini-services/*',
    'mini-services/**/*',
    '.cache/*',
    '.cache/**/*',
    'dev.log',
    'server.log',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    'bun.lock',
    'bun.lockb',
    '.env',
    '.env.local',
    '.env.*',
    '.eslintcache',
    'next-env.d.ts',
  ];

  return new Promise<ZipResult>((resolve) => {
    // `zip -qr project.zip . -x <excluidos>`
    // Como queremos incluir rutas relativas al cwd, ejecutamos desde projectRoot.
    const args = ['-qr', zipPath, '.', '-x'];
    for (const p of excludePatterns) args.push(p);

    const zipProc = spawn('zip', args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    zipProc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    zipProc.on('error', (err) => {
      resolve({
        ok: false,
        error: `No se pudo ejecutar 'zip': ${err.message}. Verifica que el binario esté instalado en el servidor.`,
      });
    });

    zipProc.on('close', async (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          error: `zip terminó con código ${code}. ${stderr.slice(0, 500)}`,
        });
        return;
      }

      try {
        const buffer = await fs.readFile(zipPath);

        // Contar archivos incluidos en el zip usando `unzip -Z1` (solo nombres, uno por línea).
        // Es más fiable que `zip -Z -l` cuyo formato varía entre versiones.
        let fileCount = 0;
        try {
          const listProc = spawn('unzip', ['-Z1', zipPath], { stdio: ['ignore', 'pipe', 'ignore'] });
          let listOut = '';
          listProc.stdout.on('data', (d: Buffer) => { listOut += d.toString(); });
          await new Promise<void>((r) => {
            listProc.on('close', () => {
              const lines = listOut.split('\n').filter((l) => l.trim().length > 0);
              fileCount = lines.length;
              r();
            });
            listProc.on('error', () => r());
          });
        } catch {
          // No crítico
        }

        // Limpieza del directorio temporal (best-effort)
        try {
          await fs.rm(tmpDir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }

        resolve({ ok: true, buffer, fileCount });
      } catch (err) {
        resolve({
          ok: false,
          error: `No se pudo leer el zip generado: ${(err as Error).message}`,
        });
      }
    });
  });
}

export async function GET(request: NextRequest) {
  // requireAdmin ya verifica el token JWT (soporta header Authorization y ?token= query)
  if (!requireAdmin(request)) return unauthorized();
  try {
    const result = await createProjectZip();
    if (!result.ok || !result.buffer) {
      return NextResponse.json(
        { error: result.error || 'No se pudo generar el paquete.' },
        { status: 500 }
      );
    }

    const filename = `diaz-premium-envios-${Date.now()}.zip`;

    // Devolver el zip como binary stream.
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    headers.set('Content-Length', String(result.buffer.length));
    if (result.fileCount && result.fileCount > 0) {
      headers.set('X-File-Count', String(result.fileCount));
    }
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new NextResponse(new Uint8Array(result.buffer), { status: 200, headers });
  } catch (err) {
    console.error('[/api/admin/download] error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al generar el paquete.' },
      { status: 500 }
    );
  }
}
