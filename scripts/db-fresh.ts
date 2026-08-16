/**
 * Script que BORRA y vuelve a crear la BD desde cero.
 * Útil cuando una migración falló a mitad y dejó la BD en estado inconsistente.
 *
 * Uso:  bun run db:fresh
 *
 * ⚠️  ESTO BORRA TODOS LOS DATOS DE LA BD `diaz_premium`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as mysql from 'mysql2/promise';

const PROJECT_ROOT = process.cwd();

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ No existe el archivo .env. Ejecuta primero: bun run setup');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!match) {
    console.error('❌ No se encontró DATABASE_URL en .env');
    process.exit(1);
  }
  const url = match[1];
  // Parsear mysql://user:pass@host:port/dbname
  const m = url.match(/^mysql:\/\/([^:]+):(.*)@([^:]+):(\d+)\/(.+)$/);
  if (!m) {
    console.error(`❌ URL de MySQL inválida: ${url}`);
    process.exit(1);
  }
  return {
    user: decodeURIComponent(m[1]),
    password: decodeURIComponent(m[2]),
    host: m[3],
    port: Number(m[4]),
    dbName: m[5],
  };
}

async function main() {
  const cfg = loadEnv();
  console.log(`\n⚠️  Vas a BORRAR la base de datos \`${cfg.dbName}\` en ${cfg.host}:${cfg.port}.`);
  console.log('   Esto NO se puede deshacer. Tienes 5 segundos para cancelar con Ctrl+C...\n');
  await new Promise((r) => setTimeout(r, 5000));

  console.log(`🔌 Conectando a MySQL...`);
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  });

  console.log(`🗑️  Dropeando \`${cfg.dbName}\`...`);
  await conn.query(`DROP DATABASE IF EXISTS \`${cfg.dbName}\`;`);

  console.log(`📦 Creando \`${cfg.dbName}\` vacía...`);
  await conn.query(
    `CREATE DATABASE \`${cfg.dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );

  await conn.end();
  console.log(`\n✅ BD \`${cfg.dbName}\` reseteada.`);
  console.log(`\nAhora ejecuta: bun run setup`);
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e);
  process.exit(1);
});
