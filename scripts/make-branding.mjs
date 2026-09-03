/**
 * Genera el set completo de logo/favicon de Dulce Encanto a partir del
 * logo oficial subido por el usuario:
 *   public/products/prod-1786758719239-239af5539f63.webp
 * (insignia circular "Dulce Encanto — Eventos & Repostería").
 *
 * Salidas:
 *   public/logo-dulce-encanto.webp  (512)  — logo oficial (SiteConfig.logo)
 *   public/logo-real.webp           (512)  — copia histórica usada en seeds
 *   public/favicon.webp             (64)   — favicon (metadata.icons)
 *   public/icon.webp                (192)
 *   src/app/icon.png                (180)  — favicon por convención Next
 *   public/icon-192.png / icon-512.png     — manifest PWA
 *   public/apple-touch-icon.png     (180)
 */
import sharp from 'sharp';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'public/products/prod-1786758719239-239af5539f63.webp');

async function makeWebp(size, out) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: '#FFFFFF' })
    .webp({ quality: 90 })
    .toFile(path.join(process.cwd(), out));
  console.log('✓', out, size + 'px');
}

async function makePng(size, out) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: '#FFFFFF' })
    .png()
    .toFile(path.join(process.cwd(), out));
  console.log('✓', out, size + 'px');
}

await makeWebp(512, 'public/logo-dulce-encanto.webp');
await makeWebp(512, 'public/logo-real.webp');
await makeWebp(64, 'public/favicon.webp');
await makeWebp(192, 'public/icon.webp');
await makePng(180, 'src/app/icon.webp');
await makePng(180, 'public/apple-touch-icon.webp');
await makePng(192, 'public/icon-192.webp');
await makePng(512, 'public/icon-512.webp');
console.log('🎉 Set de logo/favicon generado');
