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

console.log('[web] Iniciando servidor Next.js standalone...');
const server = spawn('node', ['.next/standalone/server.js'], { stdio: 'inherit' });

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
const MAX_INTENTOS = 6;
let dbLista = false;
for (let i = 1; i <= MAX_INTENTOS; i++) {
  console.log(`\n[db] Intento ${i}/${MAX_INTENTOS}: prisma db push...`);
  if (runSync('npx', ['prisma', 'db', 'push'], 120000)) {
    dbLista = true;
    console.log('[db] ✓ Tablas verificadas/creadas');
    break;
  }
  if (i < MAX_INTENTOS) {
    console.log('[db] MySQL aún no responde. Esperando 10s (la app ya está online)...');
    sleepSync(10000);
  }
}

if (!dbLista) {
  console.error('\n[db] ⚠️ No se pudo conectar a la BD. La app sigue ARRIBA.');
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
