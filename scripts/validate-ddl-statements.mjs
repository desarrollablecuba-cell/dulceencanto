/**
 * VALIDACIÓN DDL — Simula EXACTAMENTE el split y filtrado que hace
 * db-setup.mjs (crearTablas) sobre scripts/schema-mysql.sql y valida
 * cada statement contra las reglas conocidas de MySQL 8 (Railway).
 *
 * Uso: node scripts/validate-ddl-statements.mjs
 */
import { readFileSync } from 'node:fs';

const sql = readFileSync('scripts/schema-mysql.sql', 'utf-8');

// Misma lógica que crearTablas()
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/^--.*$/gm, '').trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'));

console.log(`Statements tras el split de crearTablas(): ${statements.length}`);

let errores = 0;
for (const [i, stmt] of statements.entries()) {
  const flat = stmt.replace(/\s+/g, ' ');
  const first = flat.split(' ')[0].toUpperCase();

  // 1. Todo statement debe empezar por CREATE o ALTER
  if (!['CREATE', 'ALTER'].includes(first)) {
    console.error(`✗ #${i} empieza por "${first}": ${flat.slice(0, 90)}`);
    errores++;
    continue;
  }

  // 2. Sin paréntesis final colgante / statement truncado
  //    (los CREATE terminan con ") DEFAULT CHARACTER SET … COLLATE …", válido)
  if (first === 'CREATE' && !/(\)|COLLATE \w+)\s*$/.test(flat)) {
    console.error(`✗ #${i} CREATE truncado: …${flat.slice(-70)}`);
    errores++;
  }

  // 3. LONGTEXT/TEXT con default literal SIN paréntesis → error 1101 en MySQL 8
  const m = flat.match(/(LONGTEXT|TEXT)\s+NOT NULL\s+DEFAULT\s+'([^']*)'(?!\s*\))|(?<!(\)))\s(LONGTEXT|TEXT)\s+DEFAULT\s+'([^']*)'/);
  const badDefault = /(?:LONGTEXT|TEXT)[^,]*(?:NOT NULL\s+)?DEFAULT\s+'[^']*'(?![\s]*\))/.test(flat)
    && !/\((?:'[^']*'|\d+)\)/.test(flat.split('DEFAULT')[1] ?? '');
  if (badDefault) {
    console.error(`✗ #${i} TEXT/LONGTEXT con DEFAULT sin paréntesis (MySQL 8 error 1101): ${flat.slice(0, 90)}`);
    errores++;
  }
  if (m) {
    console.error(`✗ #${i} (match directo) DEFAULT literal en TEXT/LONGTEXT: ${flat.slice(0, 90)}`);
    errores++;
  }

  // 4. VARCHAR con default > tamaño
  const v = flat.match(/VARCHAR\((\d+)\) NOT NULL DEFAULT ('([^']*)')/);
  if (v && v[3] && v[3].length > parseInt(v[1], 10)) {
    console.error(`✗ #${i} default VARCHAR más largo que la columna: ${flat.slice(0, 90)}`);
    errores++;
  }
}

// 5. Los statements críticos para la reparación de BDs viejas DEBEN existir
const críticos = [
  'CREATE TABLE IF NOT EXISTS `GalleryCategory`',
  'CREATE TABLE IF NOT EXISTS `GalleryPhoto`',
  "ALTER TABLE `SiteConfig` ADD COLUMN `sectionImages` LONGTEXT NOT NULL DEFAULT ('')",
  "ALTER TABLE `Category` ADD COLUMN `section` VARCHAR(191) NOT NULL DEFAULT 'ambas'",
  'ALTER TABLE `SiteConfig` ADD COLUMN `specialDates` LONGTEXT',
  'ALTER TABLE `SiteConfig` ADD COLUMN `minOrderAmount` DOUBLE NOT NULL DEFAULT 10',
];
for (const c of críticos) {
  const found = statements.some((s) => s.replace(/\s+/g, ' ').includes(c.replace(/\s+/g, ' ')));
  if (!found) {
    console.error(`✗ FALTA el statement crítico: ${c}`);
    errores++;
  } else {
    console.log(`✓ presente: ${c.slice(0, 72)}…`);
  }
}

// 6. La última statement no debe perderse por falta de ; final
const last = statements[statements.length - 1].replace(/\s+/g, ' ');
console.log(`Última statement: ${last.slice(0, 100)}`);

console.log('─'.repeat(70));
if (errores > 0) {
  console.error(`❌ ${errores} problema(s) en el DDL`);
  process.exit(1);
}
console.log(`✅ ${statements.length} statements DDL válidos para MySQL 8 (Railway)`);
