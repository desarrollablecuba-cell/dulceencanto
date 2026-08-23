/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  START — Railway (servidor PRIMERO, BD en paralelo)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  LECCIONES APRENDIDAS (de dos deploys fallidos):
 *
 *  1. El contenedor de BUILD de Railway no llega a mysql.railway.internal
 *     → la BD jamás se prepara en fase de build. Se hace en runtime.
 *
 *  2. El HEALTHCHECK de Railway empieza a los ~10s de arrancar y solo
 *     espera 5 min. Si el puerto no escucha en ese lapso, el deploy se
 *     mata ("1/1 replicas never became healthy"). Preparar la BD ANTES
 *     de escuchar puede superar esa ventana.
 *
 *  ARQUITECTURA CORRECTA:
 *    1. Levantar el servidor Next.js INMEDIATAMENTE (escucha en <5s,
 *       el healthcheck pasa al primer intento).
 *    2. Preparar la BD en PARALELO (tablas + seeds). Los fallos de BD
 *       NO tumban la app: las APIs responden 500 hasta que la BD esté
 *       lista, pero el sitio vive y el deploy queda healthy.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const isWin = process.platform === 'win32';

/** Ejecuta un comando sincrónico con timeout. true si exit 0. */
function runSync(cmd, args, timeoutMs) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: isWin, // npx necesita shell solo en Windows
    timeout: timeoutMs, // mata el proceso si se cuelga (p.ej. MySQL a medio arrancar)
  });
  return r.status === 0;
}

/** Sleep síncrono — seguro aquí: el servidor ya corre como proceso aparte. */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

console.log('═══════════════════════════════════════════════════════');
console.log('  🚀 DULCE ENCANTO — Arranque de producción');
console.log('═══════════════════════════════════════════════════════');

// ── 1. SERVIDOR PRIMERO (healthcheck necesita el puerto YA) ────────────────
if (!existsSync('.next/standalone/server.js')) {
  console.error('❌ No existe .next/standalone/server.js — ¿falló el build?');
  process.exit(1);
}

// ⚠️ FIX CRÍTICO: el server.js standalone de Next.js hace
//   `const hostname = process.env.HOSTNAME || '0.0.0.0'`
// En los contenedores de Railway (Linux), HOSTNAME = ID del contenedor
// (p.ej. "a1b2c3d4e5"), un nombre que no se puede resolver como dirección
// → el servidor crashea al hacer listen() → "service unavailable" 5 min
// → "1/1 replicas never became healthy". Forzamos 0.0.0.0 (todas las
// interfaces), que es lo que Railway necesita.
const serverEnv = { ...process.env, HOSTNAME: '0.0.0.0' };

console.log(`[web] Iniciando servidor Next.js standalone (PORT=${process.env.PORT || 3000}, bind 0.0.0.0)...`);
const server = spawn('node', ['.next/standalone/server.js'], {
  stdio: 'inherit',
  env: serverEnv,
});

server.on('error', (err) => {
  console.error('[web] ❌ Error al iniciar el servidor:', err);
  process.exit(1);
});

// Si el servidor muere, el contenedor debe morir con él (Railway reinicia).
server.on('exit', (code, signal) => {
  console.log(`[web] Servidor terminado (code=${code}, signal=${signal})`);
  process.exit(code ?? 1);
});

// Reenviar señales de parada (redeploys) al servidor.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    try { server.kill(sig); } catch { /* noop */ }
  });
}

// ── 2. BD EN PARALELO (tablas + seeds, tolerante a fallos) ─────────────────
// Camino A: `prisma db push` (CLI). Si el schema engine no está disponible
//           en el runtime (npm v11+ bloquea postinstall de @prisma/engines),
//           falla sin crear tablas.
// Camino B: DDL directo con el PrismaClient de la app (scripts/db-push-raw.mjs)
//           — usa el motor de CONSULTAS, que siempre funciona porque la web
//           lo usa. CREATE TABLE IF NOT EXISTS × 19 tablas.
let dbLista = false;
const MAX_INTENTOS = 3;
for (let i = 1; i <= MAX_INTENTOS && !dbLista; i++) {
  console.log(`\n[db] Camino A — Intento ${i}/${MAX_INTENTOS}: prisma db push...`);
  if (runSync('npx', ['prisma', 'db', 'push'], 120000)) {
    dbLista = true;
    console.log('[db] ✓ Tablas verificadas/creadas (prisma db push)');
  } else if (i < MAX_INTENTOS) {
    console.log('[db] Falló. Esperando 5s (la app ya está online)...');
    sleepSync(5000);
  }
}

if (!dbLista) {
  console.log('\n[db] Camino B — DDL directo vía PrismaClient (db-push-raw)...');
  if (runSync('node', ['scripts/db-push-raw.mjs'], 180000)) {
    dbLista = true;
    console.log('[db] ✓ Tablas creadas por SQL directo');
  }
}

if (!dbLista) {
  console.error('\n[db] ⚠️ No se pudo preparar la BD. La app sigue ARRIBA.');
  console.error('[db] ⚠️ Revisa DATABASE_URL. Las APIs fallarán hasta arreglarlo.');
} else {
  const seeds = ['seed-dulce.ts', 'seed-extras.ts', 'seed-catalog.ts'];
  for (const s of seeds) {
    const ruta = `scripts/${s}`;
    if (!existsSync(ruta)) {
      console.warn(`[seed] ⚠️ No existe ${ruta} — se omite`);
      continue;
    }
    console.log(`\n[seed] ${s}`);
    runSync('npx', ['tsx', ruta], 300000); // fallo no tumba la app
  }
  console.log('\n[db] ✅ Preparación de BD terminada');
}
