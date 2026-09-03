/**
 * AUDIT — Compara columna a columna el DDL (scripts/schema-mysql.sql)
 * contra el schema Prisma MySQL (prisma/schema.mysql.prisma).
 *
 * Detecta:
 *  - Columnas presentes en Prisma pero AUSENTES en el CREATE TABLE del DDL
 *    (→ en Railway el PrismaClient fallaría con P2022 "column does not exist")
 *  - Tablas presentes en Prisma pero ausentes en el DDL
 *  - Columnas del DDL que ya no existen en Prisma (informativo)
 *
 * Uso: node scripts/audit-mysql-ddl.mjs   (exit 1 si hay diferencias)
 */
import { readFileSync } from 'node:fs';

const prismaSchema = readFileSync('prisma/schema.mysql.prisma', 'utf-8');
const ddl = readFileSync('scripts/schema-mysql.sql', 'utf-8');

// ── Parsear modelos Prisma → { tabla: Set<columnas> } ──────────────────────
const modelNames = new Set(
  [...prismaSchema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((mm) => mm[1])
);
const models = {};
let current = null;
for (const rawLine of prismaSchema.split('\n')) {
  const line = rawLine.trim();
  const modelMatch = line.match(/^model\s+(\w+)\s+\{/);
  if (modelMatch) {
    current = modelMatch[1];
    models[current] = new Set();
    continue;
  }
  if (current && line === '}') { current = null; continue; }
  if (!current || !line || line.startsWith('//') || line.startsWith('@@')) continue;
  const fieldMatch = line.match(/^(\w+)\s+(\w+[\[\]?]*)(\s|$)/);
  if (fieldMatch && !['enum'].includes(fieldMatch[1])) {
    // Los campos de relación (Product[], Category?, ...) NO son columnas reales
    const baseType = fieldMatch[2].replace(/[\[\]?]/g, '');
    if (modelNames.has(baseType)) continue;
    models[current].add(fieldMatch[1]);
  }
}

// ── Parsear el DDL → { tabla: Set<columnas> } ───────────────────────────────
const ddlTables = {};
const createRe = /CREATE TABLE IF NOT EXISTS `(\w+)` \(([\s\S]*?)\)\s*DEFAULT CHARACTER SET/g;
let m;
while ((m = createRe.exec(ddl)) !== null) {
  const table = m[1];
  const cols = new Set();
  for (const rawLine of m[2].split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('--')) continue;
    if (/^(UNIQUE INDEX|INDEX|PRIMARY KEY|CONSTRAINT)/i.test(line)) continue;
    const colMatch = line.match(/^`(\w+)`\s/);
    if (colMatch) cols.add(colMatch[1]);
  }
  ddlTables[table] = cols;
}

// ── Comparar ────────────────────────────────────────────────────────────────
let errores = 0;
console.log('═'.repeat(70));
console.log(' AUDITORÍA DDL MySQL ↔ schema.prisma');
console.log('═'.repeat(70));

for (const [model, prismaCols] of Object.entries(models)) {
  const ddlCols = ddlTables[model];
  if (!ddlCols) {
    console.error(`✗ TABLA FALTANTE en DDL: ${model} (${prismaCols.size} columnas)`);
    errores++;
    continue;
  }
  for (const col of prismaCols) {
    if (!ddlCols.has(col)) {
      console.error(`✗ ${model}.${col} — en Prisma pero FALTA en el CREATE TABLE del DDL`);
      errores++;
    }
  }
  for (const col of ddlCols) {
    if (!prismaCols.has(col)) {
      console.warn(`• ${model}.${col} — en DDL pero no en Prisma (informativo)`);
    }
  }
}

// Tablas del DDL que no corresponden a ningún modelo (informativo)
for (const table of Object.keys(ddlTables)) {
  if (!models[table]) console.warn(`• Tabla DDL sin modelo Prisma: ${table} (informativo)`);
}

// ── Verificar que los ALTER de "BD vieja" cubran columnas críticas ─────────
const altersRequeridos = [
  ['Category', 'section'],
  ['SiteConfig', 'specialDates'],
  ['SiteConfig', 'sectionImages'],
  ['SiteConfig', 'minOrderAmount'],
];
const alterBlock = ddl.slice(ddl.indexOf('Columnas para despliegues'));
for (const [table, col] of altersRequeridos) {
  const re = new RegExp(`ALTER TABLE \\\`${table}\\\` ADD COLUMN \\\`${col}\\\``);
  if (!re.test(alterBlock)) {
    console.error(`✗ Falta ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` para BDs antiguas`);
    errores++;
  }
}

// Defaults literales sobre LONGTEXT sin paréntesis (error 1101 en MySQL 8)
const badDefault = ddl.match(/LONGTEXT[^,\n]*DEFAULT\s+'[^']*'\s*(?=[,\n])/g);
if (badDefault) {
  for (const b of badDefault) {
    console.error(`✗ LONGTEXT con DEFAULT sin paréntesis (error 1101 en MySQL 8): ${b.trim()}`);
    errores++;
  }
}

console.log('─'.repeat(70));
if (errores > 0) {
  console.error(`❌ ${errores} problema(s) — el DDL de Railway NO está alineado con Prisma`);
  process.exit(1);
} else {
  console.log(`✅ DDL alineado con Prisma (${Object.keys(models).length} modelos, ${Object.keys(ddlTables).length} tablas DDL)`);
}
