/**
 * Genera el set completo de logo/favicon de Dulce Encanto a partir del
 * logo oficial subido por el usuario:
 *   public/products/prod-1786758719239-239af5539f63.webp
 * (insignia circular "Dulce Encanto — Eventos & Repostería").
 *
 * v2 — FAVICON SIN FONDO BLANCO:
 *   · Detecta el círculo dentro del lienzo blanco y lo recorta ajustado.
 *   · Aplica MÁSCARA CIRCULAR con esquinas transparentes (alpha).
 *   · El favicon/iconos ya NO tienen el cuadrado blanco exterior.
 *   · apple-touch-icon.png lleva fondo degradado de marca (iOS no soporta
 *     transparencia en iconos de pantalla de inicio).
 *
 * Salidas:
 *   public/logo-dulce-encanto.webp  (512)  — logo oficial (SiteConfig.logo)
 *   public/logo-real.webp           (512)  — copia histórica usada en seeds
 *   public/favicon.webp             (64)   — favicon (metadata.icons)
 *   public/icon.webp                (192)
 *   src/app/icon.png                (180)  — favicon por convención Next
 *   public/icon-192.webp / icon-512.webp   — manifest PWA
 *   public/apple-touch-icon.png     (180)
 */
import sharp from 'sharp';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'public/products/prod-1786758719239-239af5539f63.webp');

/** Detecta el bounding-box del círculo (píxeles no blancos) en la imagen fuente. */
async function detectCircleBBox() {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const isWhite = (x, y) => {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 243 && g > 243 && b > 243;
  };
  let minX = W, minY = H, maxX = 0, maxY = 0;
  const step = 2; // muestreo (suficiente y rápido)
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (!isWhite(x, y)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Bounding box cuadrado centrado en el círculo detectado
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const size = Math.max(maxX - minX, maxY - minY) + 2 * step; // pequeño margen
  const side = Math.min(Math.round(size), Math.min(W, H));
  let left = Math.max(0, Math.round(cx - side / 2));
  let top = Math.max(0, Math.round(cy - side / 2));
  left = Math.min(left, W - side);
  top = Math.min(top, H - side);
  console.log(`círculo detectado: side=${side} @ (${left},${top})`);
  return { left, top, side };
}

/** Base del logo: círculo recortado con esquinas transparentes. */
async function circularBase(size) {
  const { left, top, side } = await detectCircleBBox();
  const r = side / 2;
  const mask = Buffer.from(
    `<svg width="${side}" height="${side}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`,
  );
  return sharp(SRC)
    .extract({ left, top, width: side, height: side })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
    .then((buf) => sharp(buf).resize(size, size).png().toBuffer());
}

async function makeWebp(size, out) {
  const base = await circularBase(size);
  await sharp(base).webp({ quality: 90, alphaQuality: 90 }).toFile(path.join(process.cwd(), out));
  console.log('✓', out, `${size}px (círculo transparente)`);
}

async function makePng(size, out) {
  const base = await circularBase(size);
  await sharp(base).png().toFile(path.join(process.cwd(), out));
  console.log('✓', out, `${size}px (círculo transparente)`);
}

/** apple-touch-icon: degradado de marca de fondo (iOS no soporta alpha). */
async function makeAppleIcon(size, out) {
  const base = await circularBase(Math.round(size * 0.86));
  const bg = Buffer.from(
    `<svg width="${size}" height="${size}">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0%" stop-color="#FCE7F3"/>
           <stop offset="55%" stop-color="#F3E8FF"/>
           <stop offset="100%" stop-color="#FBCFE8"/>
         </linearGradient>
       </defs>
       <rect width="${size}" height="${size}" fill="url(#g)"/>
     </svg>`,
  );
  await sharp(bg)
    .composite([{ input: base, blend: 'over' }])
    .png()
    .toFile(path.join(process.cwd(), out));
  console.log('✓', out, `${size}px (fondo degradado de marca)`);
}

await makeWebp(512, 'public/logo-dulce-encanto.webp');
await makeWebp(512, 'public/logo-real.webp');
await makeWebp(64, 'public/favicon.webp');
await makeWebp(192, 'public/icon.webp');
await makePng(180, 'src/app/icon.webp');
await makeAppleIcon(180, 'public/apple-touch-icon.webp');
await makeWebp(192, 'public/icon-192.webp');
await makeWebp(512, 'public/icon-512.webp');
console.log('🎉 Set de logo/favicon generado (sin fondo blanco, esquinas transparentes)');
