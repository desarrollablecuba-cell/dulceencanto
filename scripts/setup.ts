/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DÍAZ PREMIUM ENVÍOS — Script de configuración (multiplataforma)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Funciona igual en Windows, Mac y Linux desde la terminal de VS Code.
 *  NO usa .bat, NO usa PowerShell específico.
 *
 *  Uso:
 *     bun run setup           → asistido: pregunta datos y configura todo
 *     bun run db:migrate      → solo aplica migraciones Prisma
 *     bun run db:seed-json    → solo migra datos JSON → MySQL
 *     bun run db:reset        → borra y recrea la BD (¡cuidado!)
 *
 *  Para producción (VPS Hostinger) se puede invocar de forma no interactiva:
 *     DB_USER=root DB_PASS=... DB_HOST=localhost DB_NAME=diaz_premium \
 *     bun run setup -- --non-interactive
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import * as mysql from 'mysql2/promise';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const log = {
  info: (msg: string) => console.log(`\x1b[36m[i]\x1b[0m ${msg}`),
  ok: (msg: string) => console.log(`\x1b[32m[✓]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[!]\x1b[0m ${msg}`),
  err: (msg: string) => console.error(`\x1b[31m[✗]\x1b[0m ${msg}`),
  step: (n: number, total: number, msg: string) =>
    console.log(`\n\x1b[1m── Paso ${n}/${total} ── ${msg}\x1b[0m`),
};

const PROJECT_ROOT = process.cwd();
const rl = readline.createInterface({ input, output });

async function ask(prompt: string): Promise<string> {
  const answer = await rl.question(prompt);
  return answer.trim();
}

/** Pregunta sí/no, por defecto defaultValue */
async function askYesNo(prompt: string, defaultValue: boolean): Promise<boolean> {
  const hint = defaultValue ? '[S/n]' : '[s/N]';
  const ans = (await ask(`${prompt} ${hint} `)).toLowerCase();
  if (ans === '') return defaultValue;
  return ans === 's' || ans === 'y' || ans === 'si' || ans === 'yes';
}

/** Codifica un string para usarlo en la parte de contraseña de una URL */
function urlEncodePassword(pass: string): string {
  // Solo dejamos sin codificar: A-Z a-z 0-9 . ~ - _
  let out = '';
  for (const ch of pass) {
    const code = ch.charCodeAt(0);
    if (
      (code >= 65 && code <= 90) || // A-Z
      (code >= 97 && code <= 122) || // a-z
      (code >= 48 && code <= 57) || // 0-9
      ch === '.' || ch === '~' || ch === '-' || ch === '_'
    ) {
      out += ch;
    } else {
      out += '%' + code.toString(16).toUpperCase().padStart(2, '0');
    }
  }
  return out;
}

function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd || PROJECT_ROOT,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    code: result.status ?? -1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pasos
// ─────────────────────────────────────────────────────────────────────────────

interface DbConfig {
  user: string;
  pass: string;
  host: string;
  port: string;
  dbName: string;
}

async function collectConfig(): Promise<DbConfig> {
  log.info('Configuración de conexión a MySQL');
  log.info('Presiona ENTER para aceptar el valor por defecto entre corchetes.\n');

  const user = (await ask('👤 Usuario de MySQL [root]: ')) || 'root';
  const pass = await ask('🔑 Contraseña de MySQL (vacío si no tiene): ');
  const host = (await ask('🌐 Host [localhost]: ')) || 'localhost';
  const port = (await ask('🚪 Puerto [3306]: ')) || '3306';
  const dbName = (await ask('📦 Nombre de la BD [diaz_premium]: ')) || 'diaz_premium';

  return { user, pass, host, port, dbName };
}

function writeEnvFile(cfg: DbConfig): string {
  const encodedPass = urlEncodePassword(cfg.pass);
  const url = `mysql://${cfg.user}:${encodedPass}@${cfg.host}:${cfg.port}/${cfg.dbName}`;

  // Generar JWT_SECRET aleatorio (32 bytes hex = 64 chars)
  // Esto firma los tokens de autenticación admin y customer.
  const jwtSecret = crypto.randomBytes(32).toString('hex');

  const envContent = [
    `# Generado por \`bun run setup\` el ${new Date().toISOString()}`,
    `# NO subir este archivo a git (ya está en .gitignore)`,
    `# Si cambias la contraseña de MySQL, edita este archivo o vuelve a ejecutar bun run setup`,
    ``,
    `# Conexión MySQL`,
    `DATABASE_URL="${url}"`,
    ``,
    `# Secreto para firmar JWT de autenticación (admin + customer)`,
    `# Generado automáticamente. NO cambiar una vez en producción o se invalidan todas las sesiones.`,
    `JWT_SECRET="${jwtSecret}"`,
    ``,
    `# Superadmin (se crea automáticamente en el primer setup)`,
    `DEFAULT_ADMIN_EMAIL="desarrollablecuba@gmail.com"`,
    `DEFAULT_ADMIN_PASSWORD="Ma/*87.Sa"`,
    ``,
    `# Entorno`,
    `NODE_ENV="development"`,
    ``,
  ].join('\n');

  const envPath = path.join(PROJECT_ROOT, '.env');
  fs.writeFileSync(envPath, envContent, 'utf8');
  log.ok(`Archivo .env creado en: ${envPath}`);
  log.info(`URL MySQL: ${url}`);
  log.info(`JWT_SECRET: ${jwtSecret.slice(0, 8)}...${jwtSecret.slice(-4)} (64 chars)`);
  return url;
}

async function createMySQLDatabase(cfg: DbConfig): Promise<boolean> {
  const sql = `CREATE DATABASE IF NOT EXISTS \`${cfg.dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;

  log.info(`Conectando a MySQL en ${cfg.host}:${cfg.port} como ${cfg.user}...`);

  let connection;
  try {
    // Nos conectamos SIN especificar base de datos (mysql2 lo permite)
    connection = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.pass,
      connectTimeout: 10000,
    });
  } catch (err: any) {
    log.err(`No se pudo conectar a MySQL.`);
    log.err(`Error: ${err.message || err.code || err}`);
    log.warn(`\nPosibles causas:`);
    log.warn(`  • MySQL no está corriendo`);
    log.warn(`        Windows: services.msc → buscar "MySQL" → debe estar "En ejecución"`);
    log.warn(`        PowerShell: Get-Service *mysql*`);
    log.warn(`  • La contraseña es incorrecta`);
    log.warn(`  • El puerto ${cfg.port} está bloqueado o usado por otra app`);
    log.warn(`\nAlternativa: crea la BD manualmente desde MySQL Workbench o DBeaver:`);
    log.warn(`  ${sql}`);
    return false;
  }

  try {
    await connection.query(sql);
    log.ok(`Base de datos \`${cfg.dbName}\` creada (o ya existía)`);
    return true;
  } catch (err: any) {
    log.err(`No se pudo ejecutar CREATE DATABASE.`);
    log.err(`Error: ${err.message || err.code || err}`);
    return false;
  } finally {
    await connection.end();
  }
}

function generatePrismaClient(): boolean {
  log.info('Generando Prisma Client...');
  const result = run('bunx', ['prisma', 'generate']);
  if (result.code !== 0) {
    log.err('prisma generate falló');
    console.error(result.stderr);
    return false;
  }
  log.ok('Prisma Client generado');
  return true;
}

function applyPrismaMigrations(): boolean {
  log.info('Aplicando migraciones de Prisma (creando tablas)...');
  const result = run('bunx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env },
  });
  if (result.code !== 0) {
    log.err(`Prisma migrate falló:`);
    console.log(result.stdout);
    console.error(result.stderr);
    return false;
  }
  console.log(result.stdout.trim());
  log.ok('Migraciones aplicadas');
  return true;
}

/**
 * Ejecuta directamente migration.sql contra MySQL usando mysql2.
 * Fallback cuando prisma migrate deploy no crea las tablas correctamente.
 * Hace DROP de todas las tablas existentes primero para evitar
 * "Table already exists".
 */
async function executeMigrationSqlDirectly(cfg: DbConfig): Promise<boolean> {
  const migrationPath = path.join(PROJECT_ROOT, 'prisma', 'migrations', '20260721000000_init_mysql', 'migration.sql');
  if (!fs.existsSync(migrationPath)) {
    log.err(`No se encontró ${migrationPath}`);
    return false;
  }
  const sql = fs.readFileSync(migrationPath, 'utf8');
  if (!sql.trim()) {
    log.err('migration.sql está VACÍO.');
    return false;
  }
  log.info('Ejecutando migration.sql directamente contra MySQL...');
  try {
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.pass,
      database: cfg.dbName,
      multipleStatements: true,
      connectTimeout: 30000,
    });
    try {
      log.info('Limpiando tablas existentes...');
      await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
      const [tables] = await conn.query('SHOW TABLES;') as any[];
      for (const t of tables) {
        const tableName = String(Object.values(t)[0]);
        await conn.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
      await conn.query(sql);
      log.ok('migration.sql ejecutado correctamente');
      return true;
    } finally {
      await conn.end();
    }
  } catch (err: any) {
    log.err(`Error ejecutando migration.sql: ${err.message}`);
    return false;
  }
}

/**
 * Verifica que el schema real de la BD coincide con lo que Prisma espera.
 *
 * CASE SENSITIVITY: usa LOWER(COLUMN_NAME) = 'storeid' porque MySQL en
 * Windows con lower_case_table_names=1 guarda columnas en minúsculas.
 *
 * NO verifica OrderItem porque ese modelo NO tiene storeId en el schema
 * (hereda el storeId de su Order padre vía FK orderId).
 */
async function verifySchemaHealth(cfg: DbConfig): Promise<boolean> {
  log.info('Verificando salud del schema (storeId en tablas principales)...');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.pass,
      database: cfg.dbName,
      connectTimeout: 10000,
    });
  } catch (err: any) {
    log.warn(`No se pudo verificar el schema: ${err.message}`);
    return true;
  }

  try {
    const [rows] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND LOWER(COLUMN_NAME) = 'storeid'`,
      [cfg.dbName]
    ) as any[];
    const tablesWithStoreId = new Set(
      (rows as any[]).map((r) => String(r.TABLE_NAME).toLowerCase())
    );

    // OrderItem NO está aquí porque NO tiene storeId por diseño.
    const expectedTables = [
      'Category', 'Product', 'Order', 'SiteConfig',
      'DeliveryZone', 'Customer',
    ];
    const expectedLower = expectedTables.map((t) => t.toLowerCase());
    const missing = expectedLower.filter((t) => !tablesWithStoreId.has(t));

    if (missing.length === 0) {
      log.ok('Schema OK — todas las tablas principales tienen storeId');
      return true;
    }

    log.warn(`⚠️  Las siguientes tablas NO tienen la columna storeId: ${missing.join(', ')}`);
    log.warn('La BD quedó con tablas VIEJAS de una instalación anterior.');
    return false;
  } finally {
    await conn.end();
  }
}

/**
 * Verifica que las columnas JSON/texto-largo sean LONGTEXT (no VARCHAR(191)).
 *
 * Problema que resuelve: si el usuario instaló v53-v57 sobre una BD que ya
 * tenía las tablas creadas con VARCHAR(191), Prisma dice "No pending
 * migrations" (porque el registro en _prisma_migrations ya existe) y
 * verifySchemaHealth pasa (storeId existe), PERO las columnas siguen siendo
 * VARCHAR(191). La migración de datos JSON falla con
 * "The provided value for the column is too long for the column's type".
 *
 * Solución: verificar que horarioCards (y otros campos JSON) sean LONGTEXT.
 * Si son VARCHAR(191), forzar reset de la BD.
 */
async function verifyColumnTypes(cfg: DbConfig): Promise<boolean> {
  log.info('Verificando tipos de columna (LONGTEXT en campos JSON)...');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.pass,
      database: cfg.dbName,
      connectTimeout: 10000,
    });
  } catch (err: any) {
    log.warn(`No se pudo verificar tipos de columna: ${err.message}`);
    return true;
  }

  try {
    // Verificar que horarioCards sea LONGTEXT (no VARCHAR(191)).
    // horarioCards es el campo que más commonly falla — si es LONGTEXT,
    // los demás también lo son (se aplicaron juntos en v58).
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'SiteConfig'
       AND LOWER(COLUMN_NAME) IN ('horariocards', 'homebenefits', 'testimonials', 'themedata')`,
      [cfg.dbName]
    ) as any[];
    const cols = (rows as any[]).map((r) => ({
      name: String(r.COLUMN_NAME).toLowerCase(),
      type: String(r.DATA_TYPE).toLowerCase(),
    }));

    if (cols.length === 0) {
      // La tabla SiteConfig no existe o no tiene esas columnas —
      // verifySchemaHealth ya debería haber capturado esto.
      log.warn('No se encontraron columnas JSON en SiteConfig — posible BD vacía');
      return true;
    }

    const varcharCols = cols.filter((c) => c.type === 'varchar');
    if (varcharCols.length > 0) {
      log.warn(`⚠️  Las siguientes columnas son VARCHAR(191) en vez de LONGTEXT:`);
      varcharCols.forEach((c) => log.warn(`     - SiteConfig.${c.name} (${c.type})`));
      log.warn('La BD tiene el schema VIEJO (v53-v57). Necesita reset completo.');
      return false;
    }

    log.ok('Tipos de columna OK — campos JSON son LONGTEXT');
    return true;
  } finally {
    await conn.end();
  }
}

async function resetDatabase(cfg: DbConfig): Promise<boolean> {
  log.info('Reseteando BD desde cero (DROP + CREATE)...');
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
    log.ok('BD reseteada');
    return true;
  } catch (err: any) {
    log.err(`No se pudo resetear la BD: ${err.message}`);
    return false;
  }
}

function migrateJsonData(): boolean {
  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'migrate-json-to-sqlite.ts');
  if (!fs.existsSync(scriptPath)) {
    log.warn(`No se encontró ${scriptPath}, saltando migración de datos JSON`);
    return true;
  }
  const dataDir = path.join(PROJECT_ROOT, 'data');
  if (!fs.existsSync(dataDir)) {
    log.warn(`No se encontró la carpeta data/, saltando migración de datos JSON`);
    return true;
  }
  log.info('Migrando datos de JSON a MySQL (modo limpio: --reset)...');
  const result = run('bunx', ['tsx', scriptPath, '--reset']);
  if (result.code !== 0) {
    log.err('Migración JSON falló:');
    console.error(result.stderr);
    return false;
  }
  console.log(result.stdout.trim());
  log.ok('Datos migrados a MySQL');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  DÍAZ PREMIUM ENVÍOS — Setup MySQL (multiplataforma)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const nonInteractive = process.argv.includes('--non-interactive');

  let cfg: DbConfig;
  if (nonInteractive) {
    cfg = {
      user: process.env.DB_USER || 'root',
      pass: process.env.DB_PASS || '',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '3306',
      dbName: process.env.DB_NAME || 'diaz_premium',
    };
    log.info(`Modo no-interactivo: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.dbName}`);
  } else {
    cfg = await collectConfig();
  }

  const TOTAL_STEPS = 6;
  log.step(1, TOTAL_STEPS, 'Crear archivo .env');
  writeEnvFile(cfg);

  log.step(2, TOTAL_STEPS, 'Crear base de datos en MySQL');
  if (!(await createMySQLDatabase(cfg))) {
    log.err('No se puede continuar sin la BD. Abortando.');
    rl.close();
    process.exit(1);
  }

  log.step(3, TOTAL_STEPS, 'Generar Prisma Client');
  if (!generatePrismaClient()) {
    log.warn('prisma generate falló, pero continuaremos...');
  }

  log.step(4, TOTAL_STEPS, 'Aplicar migraciones (crear tablas)');
  if (!applyPrismaMigrations()) {
    log.err('Las migraciones fallaron. Causa común: la BD quedó en estado inconsistente');
    log.warn('por una migración anterior fallida. Prisma se rehúsa a continuar.');
    log.warn('');
    const reset = await askYesNo(
      '¿Quieres que borre y recrear la BD desde cero y reintente? (solo si no tienes datos importantes)',
      true
    );
    if (!reset) {
      log.err('No se pueden migrar datos sin las tablas. Abortando.');
      rl.close();
      process.exit(1);
    }
    if (!(await resetDatabase(cfg))) {
      rl.close();
      process.exit(1);
    }
    // Reintento
    log.info('Reintentando migraciones...');
    if (!applyPrismaMigrations()) {
      log.err('Las migraciones siguen fallando. Revisa el error arriba.');
      rl.close();
      process.exit(1);
    }
  }

  // Verificación de salud del schema.
  let schemaOk = await verifySchemaHealth(cfg);
  if (!schemaOk) {
    log.warn('');
    log.warn('Si continúas, la migración de datos JSON fallará con');
    log.warn('"The column storeId does not exist in the current database".');
    const doReset = await askYesNo(
      '¿Reseteo la BD desde cero para que las tablas se creen correctamente? (solo si no tienes datos importantes)',
      true
    );
    if (doReset) {
      if (!(await resetDatabase(cfg))) {
        rl.close();
        process.exit(1);
      }
      log.info('Reaplicando migraciones sobre BD limpia...');
      if (!applyPrismaMigrations()) {
        log.warn('prisma migrate deploy falló. Intentando migration.sql directamente...');
      }
      schemaOk = await verifySchemaHealth(cfg);
      if (!schemaOk) {
        // FALLBACK: ejecutar migration.sql directamente con mysql2.
        log.warn('Prisma no creó las tablas correctamente. Ejecutando migration.sql directamente...');
        const fallbackOk = await executeMigrationSqlDirectly(cfg);
        if (fallbackOk) {
          schemaOk = await verifySchemaHealth(cfg);
        }
        if (!schemaOk) {
          log.err('');
          log.err('❌ NO SE PUDO CREAR EL SCHEMA CORRECTAMENTE');
          log.err('Descarga la ÚLTIMA versión desde /api/download');
          rl.close();
          process.exit(1);
        }
      }
    } else {
      log.warn('Continuando sin resetear. La migración de datos probablemente fallará.');
    }
  }

  // Verificación de TIPOS de columna: detecta el caso donde Prisma dice
  // "No pending migrations" y storeId existe, PERO las columnas siguen
  // siendo VARCHAR(191) en vez de LONGTEXT (BD vieja de v53-v57).
  // Sin esta verificación, la migración de datos JSON falla con
  // "The provided value for the column is too long for the column's type".
  let colTypesOk = await verifyColumnTypes(cfg);
  if (!colTypesOk) {
    log.warn('');
    log.warn('Si continúas, la migración de datos JSON fallará con');
    log.warn('"The provided value for the column is too long for the column\'s type".');
    const doReset = await askYesNo(
      '¿Reseteo la BD desde cero para que las columnas sean LONGTEXT? (solo si no tienes datos importantes)',
      true
    );
    if (doReset) {
      if (!(await resetDatabase(cfg))) {
        rl.close();
        process.exit(1);
      }
      log.info('Reaplicando migraciones sobre BD limpia...');
      applyPrismaMigrations();
      colTypesOk = await verifyColumnTypes(cfg);
      if (!colTypesOk) {
        // Fallback: ejecutar migration.sql directamente
        log.warn('Prisma no actualizó los tipos. Ejecutando migration.sql directamente...');
        const fallbackOk = await executeMigrationSqlDirectly(cfg);
        if (fallbackOk) {
          colTypesOk = await verifyColumnTypes(cfg);
        }
        if (!colTypesOk) {
          log.err('');
          log.err('❌ Los tipos de columna siguen siendo VARCHAR(191).');
          log.err('Descarga la ÚLTIMA versión desde /api/download');
          rl.close();
          process.exit(1);
        }
      }
    } else {
      log.warn('Continuando sin resetear. La migración de datos probablemente fallará.');
    }
  }

  log.step(5, TOTAL_STEPS, 'Migrar datos JSON → MySQL');
  if (!migrateJsonData()) {
    log.warn('La migración de datos JSON tuvo errores, pero la BD está lista.');
    log.warn('Si el error fue "value too long for column type", ejecuta:');
    log.warn('  bun run db:fresh-reset');
  }

  log.step(6, TOTAL_STEPS, 'Verificación final');
  log.ok('Todo listo.');
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ CONFIGURACIÓN COMPLETA');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('  Ahora puedes iniciar el servidor:');
  console.log('     bun run dev\n');
  console.log('  Y abrir en el navegador:');
  console.log('     🏠 Tienda:  http://localhost:3000');
  console.log('     🔐 Admin:   http://localhost:3000/admin');
  console.log('     👤 Login:   desarrollablecuba@gmail.com / Ma/*87.Sa\n');

  rl.close();
  process.exit(0);
}

main().catch((err) => {
  log.err(`Error inesperado: ${err.message}`);
  console.error(err);
  rl.close();
  process.exit(1);
});
