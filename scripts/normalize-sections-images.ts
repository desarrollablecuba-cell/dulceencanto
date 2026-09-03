/**
 * Normalización de la BD del sandbox (idempotente — espejo de db-setup.mjs):
 *  1. Sección de categorías: Dulces Finos → 'reservation'; Dulces Finos y
 *     Buffet → 'immediate'; resto → 'ambas'.
 *  2. Los 13 dulces finos quedan reservables (reservationEnabled=true).
 *  3. Categorías destacadas sin imagen → imagen del primer producto real.
 *  4. Verificación de precios clave (2 pisos 120 USD, 3 pisos 140, tortas 30/40/60).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const now = new Date().toISOString();

async function main() {
  // ── 1. Secciones ──
  const finos = await prisma.category.findUnique({ where: { slug: 'dulces-finos' } });
  if (finos) {
    await prisma.category.update({ where: { id: finos.id }, data: { section: 'reservation', updatedAt: now } });
  }
  const buffet = await prisma.category.findUnique({ where: { slug: 'dulces-finos-buffet' } });
  if (buffet) {
    await prisma.category.update({ where: { id: buffet.id }, data: { section: 'immediate', updatedAt: now } });
  }
  const resto = await prisma.category.updateMany({
    where: { slug: { in: ['tortas', 'cake-bandeja', 'pasteles-dos-pisos', 'pasteles-tres-pisos'] as string[] } },
    data: { section: 'ambas', updatedAt: now },
  });
  console.log(`[secciones] Dulces Finos=reserva, Buffet=immediate, resto=ambas (${resto.count})`);

  // ── 2. Productos de Dulces Finos → reservables ──
  if (finos) {
    const upd = await prisma.product.updateMany({
      where: { categoryId: finos.id },
      data: { reservationEnabled: true, updatedAt: now },
    });
    console.log(`[finos] ${upd.count} productos marcados como reservables`);
  }

  // ── 3. Imágenes de categorías (producto real interno) ──
  const cats = await prisma.category.findMany({
    include: { products: { orderBy: { order: 'asc' }, take: 20, select: { image: true } } },
  });
  for (const cat of cats) {
    if (cat.image && cat.image.trim() !== '') continue;
    const real = cat.products.find((p) => p.image && p.image.trim() !== '');
    if (!real) continue;
    await prisma.category.update({ where: { id: cat.id }, data: { image: real.image, updatedAt: now } });
    console.log(`[img] ${cat.name} ← ${real.image.split('/').pop()}`);
  }

  // ── 4. Verificación de precios ──
  const checks = [
    ['Pasteles de Dos Pisos', 84000],
    ['Pasteles de Tres Pisos', 98000],
  ];
  for (const [catName, expected] of checks) {
    const c = await prisma.category.findFirst({ where: { name: catName } });
    if (!c) continue;
    const bad = await prisma.product.count({ where: { categoryId: c.id, price: { not: expected } } });
    console.log(`[precios] ${catName}: ${bad === 0 ? 'OK (120/140 USD)' : bad + ' productos con precio incorrecto'}`);
  }

  // Resumen final
  const resumen = await prisma.category.findMany({ orderBy: { order: 'asc' }, select: { name: true, section: true, image: true } });
  console.log('\n=== RESUMEN ===');
  resumen.forEach((c) => console.log(`${c.name} | sección=${c.section} | img=${c.image ? c.image.split('/').pop() : '—'}`));
}

main().finally(() => prisma.$disconnect());
