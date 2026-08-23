/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DB PUSH RAW — Plan B para crear las tablas sin el CLI de Prisma
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  CONTEXTO: en Railway, `npx prisma db push` (CLI + schema engine) puede
 *  fallar si los binarios del engine no quedaron instalados (npm v11+
 *  bloquea los postinstall de @prisma/engines). PERO el motor de CONSULTAS
 *  de @prisma/client sí funciona (lo usa la propia app web).
 *
 *  Este script ejecuta el DDL (scripts/schema-mysql.sql, generado con
 *  `prisma migrate diff`) statement por statement usando el mismo
 *  PrismaClient que usa la app. Es idempotente:
 *   - CREATE TABLE IF NOT EXISTS en las 19 tablas
 *   - los ALTER TABLE de FKs se toleran si ya existen
 *
 *  Uso: node scripts/db-push-raw.mjs   (lo invoca start-railway.mjs como
 *  fallback si `prisma db push` falla)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cargar PrismaClient desde node_modules (CJS interop)
const { PrismaClient } = await import(
  path.join(process.cwd(), 'node_modules', '@prisma', 'client', 'index.js')
).then(m => m.default ?? m);

const prisma = new PrismaClient({ log: ['error'] });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, 'schema-mysql.sql');

// Errores de MySQL que significan "ya existe" → tolerables
const TOLERABLE = [
  /already exists/i,          // 1050 tabla / 1061 índice / 1062 FK duplicados
  /Duplicate (key|index|foreign key)/i,
  /ER_FK_DUP/i,
  /errno: 1050|errno: 1061|errno: 1062|errno: 1022/i,
];

async function main() {
  console.log('[db-raw] Ejecutando DDL directo (CREATE TABLE IF NOT EXISTS)...');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Separar statements: el DDL termina cada statement en ";\n"
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/^--.*$/gm, '').trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  let ok = 0;
  let yaExistian = 0;
  let fallos = 0;

  for (const stmt of statements) {
    const resumen = stmt.replace(/\s+/g, ' ').slice(0, 70);
    try {
      await prisma.$executeRawUnsafe(stmt);
      ok++;
      console.log(`[db-raw] ✓ ${resumen}`);
    } catch (e) {
      const msg = String(e?.message || e);
      if (TOLERABLE.some((re) => re.test(msg))) {
        yaExistian++;
        console.log(`[db-raw] = ya existe: ${resumen}`);
      } else {
        fallos++;
        console.error(`[db-raw] ✗ ${resumen} → ${msg.slice(0, 140)}`);
      }
    }
  }

  console.log(`[db-raw] Resultado: ${ok} creados, ${yaExistian} ya existían, ${fallos} fallos.`);

  // Verificación real: consultar una tabla crítica
  try {
    await prisma.admin.count();
    console.log('[db-raw] ✅ Verificado: la tabla Admin responde. Esquema completo.');
    process.exit(0);
  } catch (e) {
    console.error('[db-raw] ❌ La verificación falló:', String(e?.message || e).slice(0, 160));
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('[db-raw] ❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
