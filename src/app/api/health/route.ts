import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { db as prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health — diagnóstico público de la BD (pensado para Railway).
 *
 * Responde SIEMPRE 200 con JSON, aunque la BD esté rota (status: "error"),
 * para que puedas ver en segundos qué pasa en el deploy:
 *
 *  { status: "ok" | "degraded" | "error",
 *    appVersion: "50.0.0",          ← la V del ZIP que desplegaste
 *    database: { provider, connected, ...counts, criticalColumns } }
 *
 * Si status es "error" o los counts salen en 0, revisa los logs de arranque
 * ([ddl]/[dulce]/[config]/[catalogo]/[galeria]) y DEPLOY-RAILWAY.md.
 */

let cachedVersion: string | null = null;

async function getAppVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const pkg = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
    );
    cachedVersion = pkg.version || 'desconocida';
  } catch {
    cachedVersion = 'desconocida';
  }
  return cachedVersion as string;
}

interface TableCheck {
  model: string;
  table: string;
  count: number | null;
  error?: string;
}

async function checkTable(model: string, table: string): Promise<TableCheck> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM \`${table}\``
    );
    return { model, table, count: Number(rows[0]?.n ?? 0) };
  } catch (e) {
    return { model, table, count: null, error: String((e as Error).message).slice(0, 160) };
  }
}

async function checkColumns(provider: string, database: string) {
  const CRITICAS: [string, string][] = [
    ['Category', 'section'],
    ['SiteConfig', 'sectionImages'],
    ['SiteConfig', 'heroSlides'],
    ['SiteConfig', 'specialDates'],
    ['SiteConfig', 'minOrderAmount'],
  ];
  const out: Record<string, boolean | 'desconocida'> = {};
  for (const [table, col] of CRITICAS) {
    try {
      if (provider === 'mysql') {
        const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
          'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
          database, table, col
        );
        out[`${table}.${col}`] = Number(rows[0]?.n ?? 0) > 0;
      } else {
        const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
          `SELECT COUNT(*) AS n FROM pragma_table_info('${table}') WHERE name = '${col}'`
        );
        out[`${table}.${col}`] = Number(rows[0]?.n ?? 0) > 0;
      }
    } catch {
      out[`${table}.${col}`] = 'desconocida';
    }
  }
  return out;
}

export async function GET() {
  const appVersion = await getAppVersion();
  const url = process.env.DATABASE_URL || '';
  const provider = url.startsWith('file:') ? 'sqlite' : url.startsWith('mysql') ? 'mysql' : 'desconocido';
  const database = provider === 'mysql' ? (url.split('?')[0].split('/').pop() || '') : '';

  const result: Record<string, any> = {
    ok: true,
    app: 'Dulce Encanto',
    appVersion,
    deployedFrom: appVersion !== '0.2.1' ? `V${appVersion.split('.')[0]} (ZIP /api/download)` : 'sandbox-dev',
    database: { provider, database: database || null, connected: false },
    tables: {} as Record<string, TableCheck>,
    criticalColumns: {} as Record<string, boolean | 'desconocida'>,
    seeds: {},
    timestamp: new Date().toISOString(),
  };

  try {
    // Tablas + conteos (falla una a una, sin tumbar el endpoint)
    const TABLES: [string, string][] = [
      ['admin', 'Admin'],
      ['categories', 'Category'],
      ['products', 'Product'],
      ['siteConfig', 'SiteConfig'],
      ['services', 'Service'],
      ['promotions', 'Promotion'],
      ['gallery (legacy)', 'GalleryItem'],
      ['galleryCategories', 'GalleryCategory'],
      ['galleryPhotos', 'GalleryPhoto'],
      ['orders', 'Order'],
      ['deliveryZones', 'DeliveryZone'],
    ];
    const tables: Record<string, TableCheck> = {};
    let algunaFalla = false;
    for (const [key, table] of TABLES) {
      const t = await checkTable(key, table);
      tables[key] = t;
      if (t.error) algunaFalla = true;
    }
    result.tables = tables;
    result.database.connected = !algunaFalla;

    result.criticalColumns = await checkColumns(provider, database);

    result.seeds = {
      productos: tables['products']?.count ?? 0,
      categorias: tables['categories']?.count ?? 0,
      categoriasGaleria: tables['galleryCategories']?.count ?? 0,
      fotosGaleria: tables['galleryPhotos']?.count ?? 0,
      siteConfig: tables['siteConfig']?.count ?? 0,
    };

    // Estado global
    const vacia = Object.values(tables).every((t) => t.count === 0 || t.error);
    if (algunaFalla) result.status = 'error';
    else if (vacia) result.status = 'degraded';
    else result.status = 'ok';
    if (vacia) {
      result.hint =
        'La BD está VACÍA: los seeds no corrieron. Revisa los logs de arranque en Railway ' +
        '([ddl]/[config]/[catalogo]/[galeria]) o redespliega; db-setup.mjs siembra todo solo.';
    }
    const faltan = Object.entries(result.criticalColumns as Record<string, unknown>)
      .filter(([, v]) => v === false)
      .map(([k]) => k);
    if (faltan.length > 0) {
      result.missingColumns = faltan;
      result.hint =
        `Faltan columnas (${faltan.join(', ')}): esta BD es de un deploy anterior. ` +
        'El próximo arranque con esta versión las añade solo (autorreparación).';
      if (result.status === 'ok') result.status = 'degraded';
    }
  } catch (e) {
    result.status = 'error';
    result.error = String((e as Error).message).slice(0, 300);
  }

  const headers = new Headers();
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return NextResponse.json(result, { status: 200, headers });
}
