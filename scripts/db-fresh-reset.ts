/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DÍAZ PREMIUM ENVÍOS — Reset completo de la BD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Solución rápida para el error:
 *    "The column storeId does not exist in the current database"
 *
 *  Causa: instalaste v49 sobre una BD que ya tenía tablas VIEJAS de
 *  v47/v48 (sin la columna storeId). Prisma dice "no pending migrations"
 *  pero las tablas están desactualizadas.
 *
 *  Este script:
 *    1. DROP DATABASE diaz_premium
 *    2. CREATE DATABASE diaz_premium
 *    3. prisma migrate deploy (crea tablas con storeId)
 *    4. Migra datos JSON → MySQL
 *
 *  Uso:
 *    bun run db:fresh-reset
 *
 *  (Lee la configuración del archivo .env existente, no pregunta nada.)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as mysql from 'mysql2/promise';

const PROJECT_ROOT = process.cwd();

function log(msg: string) { console.log(msg); }
function ok(msg: string) { console.log(`\x1b[32m[✓]\x1b[0m ${msg}`); }
function err(msg: string) { console.error(`\x1b[31m[✗]\x1b[0m ${msg}`); }
function info(msg: string) { console.log(`\x1b[36m[i]\x1b[0m ${msg}`); }

function run(cmd: string, args: string[]): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(cmd, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: result.status ?? -1, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function parseDbUrl(url: string): { user: string; pass: string; host: string; port: string; dbName: string } {
  // mysql://user:pass@host:port/dbname
  const m = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error(`URL de BD no válida: ${url}`);
  return { user: m[1], pass: decodeURIComponent(m[2]), host: m[3], port: m[4], dbName: m[5] };
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  DÍAZ PREMIUM ENVÍOS — Reset completo de la BD');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Leer .env
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    err('No se encontró .env. Ejecuta primero: bun run setup');
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
  if (!dbUrlMatch) {
    err('No se encontró DATABASE_URL en .env');
    process.exit(1);
  }
  const cfg = parseDbUrl(dbUrlMatch[1]);
  info(`BD: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.dbName}`);

  // 2. DROP + CREATE
  info('Reseteando BD (DROP + CREATE)...');
  try {
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.pass,
      multipleStatements: true,
    });
    await conn.query(`DROP DATABASE IF EXISTS \`${cfg.dbName}\`;`);
    await conn.query(
      `CREATE DATABASE \`${cfg.dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await conn.end();
    ok('BD reseteada');
  } catch (e: any) {
    err(`No se pudo resetear la BD: ${e.message}`);
    process.exit(1);
  }

  // 3. Prisma migrate deploy
  info('Aplicando migraciones...');
  const mig = run('bunx', ['prisma', 'migrate', 'deploy']);
  if (mig.code !== 0) {
    err('prisma migrate deploy falló:');
    console.error(mig.stderr);
    process.exit(1);
  }
  console.log(mig.stdout.trim());
  ok('Migraciones aplicadas');

  // 4. Verificación rápida: ¿storeId existe en Category?
  info('Verificando que storeId exista en las tablas...');
  try {
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.pass,
      database: cfg.dbName,
    });
    const [rows] = await conn.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'storeId'`,
      [cfg.dbName]
    ) as any[];
    const count = (rows as any[])[0]?.cnt ?? 0;
    await conn.end();
    if (count < 7) {
      err(`Solo ${count} tablas tienen storeId (esperadas: 7+). Algo salió mal.`);
      process.exit(1);
    }
    ok(`${count} tablas con storeId ✓`);
  } catch (e: any) {
    err(`Verificación falló: ${e.message}`);
    process.exit(1);
  }

  // 5. Migrar datos JSON
  info('Migrando datos JSON → MySQL...');
  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'migrate-json-to-sqlite.ts');
  if (fs.existsSync(scriptPath)) {
    const mig2 = run('bunx', ['tsx', scriptPath, '--reset']);
    if (mig2.code !== 0) {
      err('Migración JSON falló:');
      console.error(mig2.stderr);
      process.exit(1);
    }
    console.log(mig2.stdout.trim());
    ok('Datos migrados');
  } else {
    info('No se encontró scripts/migrate-json-to-sqlite.ts, saltando migración de datos');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ RESET COMPLETO');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('  Ahora puedes iniciar el servidor:');
  console.log('     bun run dev\n');
}

main().catch((e) => {
  err(`Error inesperado: ${e.message}`);
  console.error(e);
  process.exit(1);
});
