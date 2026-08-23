/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  START — Railway (arranque de producción con preparación de BD)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  LECCIÓN APRENDIDA: en Railway, el contenedor de BUILD NO tiene acceso a
 *  la red privada (mysql.railway.internal). `prisma db push` durante el
 *  build falla con "Can't reach database server" y rompe todo el deploy.
 *
 *  Patrón correcto (documentado por Railway para Prisma):
 *    1. BUILD  → solo compilar (sin tocar la BD).
 *    2. START  → crear tablas + sembrar datos ANTES de levantar el server,
 *                porque en runtime SÍ hay red privada.
 *
 *  Este script:
 *    1. Reintenta `prisma db push` hasta 15 veces (MySQL puede tardar en
 *       estar listo justo después de crear el servicio).
 *    2. Ejecuta los 3 seeds (se omiten solos si ya hay datos; solo siembran
 *       la primera vez).
 *    3. Arranca el servidor standalone de Next.js.
 *
 *  Ningún fallo de BD impide el arranque de la app: si la BD no responde,
 *  el servidor igual arranca (las APIs devolverán error hasta que la BD
 *  esté disponible, pero el sitio no se cae).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const isWin = process.platform === 'win32';

/** Ejecuta un comando heredando stdout/stderr. Devuelve true si exit 0. */
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: isWin, // en Windows npx necesita shell; en Linux no
  });
  return r.status === 0;
}

/** Sleep síncrono (no bloquea el event loop de nada: aún no hay server). */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

console.log('═══════════════════════════════════════════════════════');
console.log('  🚀 DULCE ENCANTO — Arranque de producción');
console.log('═══════════════════════════════════════════════════════');

// ── 1. Crear tablas (con reintentos esperando a MySQL) ─────────────────────
const MAX_INTENTOS = 15;
let dbLista = false;
for (let i = 1; i <= MAX_INTENTOS; i++) {
  console.log(`\n[db] Intento ${i}/${MAX_INTENTOS}: prisma db push...`);
  if (run('npx', ['prisma', 'db', 'push'])) {
    dbLista = true;
    console.log('[db] ✓ Tablas verificadas/creadas');
    break;
  }
  if (i < MAX_INTENTOS) {
    console.log('[db] MySQL aún no responde. Esperando 5s...');
    sleepSync(5000);
  }
}
if (!dbLista) {
  console.error('\n[db] ⚠️ No se pudo conectar a la BD tras varios intentos.');
  console.error('[db] ⚠️ La app arrancará igualmente; revisa DATABASE_URL.');
}

// ── 2. Sembrar datos (solo si la BD está vacía; los seeds se auto-omiten) ──
if (dbLista) {
  const seeds = ['seed-dulce.ts', 'seed-extras.ts', 'seed-catalog.ts'];
  for (const s of seeds) {
    const ruta = `scripts/${s}`;
    if (!existsSync(ruta)) {
      console.warn(`[seed] ⚠️ No existe ${ruta} — se omite`);
      continue;
    }
    console.log(`\n[seed] ${s}`);
    run('npx', ['tsx', ruta]); // fallo no bloquea el arranque
  }
}

// ── 3. Arrancar el servidor Next.js standalone ─────────────────────────────
console.log('\n[web] Iniciando servidor Next.js...');
console.log('═══════════════════════════════════════════════════════\n');
const ok = run('node', ['.next/standalone/server.js']);
process.exit(ok ? 0 : 1);
