/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  POSTBUILD — Copia assets al output standalone de Next.js
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Con `output: 'standalone'`, Next.js NO incluye en .next/standalone:
 *    - .next/static  (JS/CSS del cliente)
 *    - public/       (imágenes y archivos estáticos)
 *    - data/         (JSONs usados por /api/setup-db en runtime)
 *
 *  Este script los copia de forma cross-platform (Windows/Linux/macOS),
 *  sustituyendo los `cp -r` que solo funcionan en Unix.
 *
 *  Uso: node scripts/postbuild.mjs   (lo ejecuta `npm run build`)
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const standalone = path.join(root, '.next', 'standalone');

if (!existsSync(standalone)) {
  console.error('❌ No existe .next/standalone. ¿Se ejecutó `next build` con output:"standalone"?');
  process.exit(1);
}

mkdirSync(standalone, { recursive: true });

const targets = [
  { from: path.join(root, '.next', 'static'), to: path.join(standalone, '.next', 'static') },
  { from: path.join(root, 'public'), to: path.join(standalone, 'public') },
  { from: path.join(root, 'data'), to: path.join(standalone, 'data') },
];

for (const { from, to } of targets) {
  if (!existsSync(from)) {
    console.warn(`⚠️  ${path.relative(root, from)} no existe — se omite`);
    continue;
  }
  // merge: conserva archivos subidos en runtime (p.ej. public/products/prod-*.webp)
  cpSync(from, to, { recursive: true, force: true, errorOnExist: false });
  console.log(`✓ ${path.relative(root, to)}`);
}

console.log('✅ Postbuild completado');
