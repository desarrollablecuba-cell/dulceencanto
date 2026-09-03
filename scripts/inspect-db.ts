/* Inspección rápida de la BD: categorías, productos clave, siteconfig */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    orderBy: [{ order: 'asc' }],
    select: { id: true, name: true, slug: true, icon: true, image: true, order: true, active: true },
  });
  console.log('=== CATEGORÍAS ===');
  cats.forEach((c) => console.log(`${c.order} | ${c.name} | slug=${c.slug} | icon=${c.icon} | img=${c.image} | active=${c.active}`));

  console.log('\n=== PRODUCTOS POR CATEGORÍA (nombre, precio, image, flags) ===');
  const prods = await prisma.product.findMany({
    orderBy: [{ categoryId: 'asc' }, { order: 'asc' }],
    select: {
      id: true, name: true, price: true, image: true, categoryId: true, saleUnit: true,
      featured: true, status: true, posAvailable: true, tiendaAvailable: true, tags: true,
    },
  });
  const byCat = new Map<string, typeof prods>();
  prods.forEach((p) => {
    const arr = byCat.get(p.categoryId) ?? [];
    arr.push(p);
    byCat.set(p.categoryId, arr);
  });
  for (const [catId, list] of byCat) {
    const cat = cats.find((c) => c.id === catId);
    console.log(`\n-- ${cat?.name ?? catId} (${list.length} productos)`);
    list.forEach((p) => {
      const img = p.image.split('/').pop();
      console.log(`   ${p.name} | $${p.price} | ${p.saleUnit} | img=${img} | feat=${p.featured} | pos=${p.posAvailable} tienda=${p.tiendaAvailable}`);
    });
  }

  const cfg = await prisma.siteConfig.findFirst();
  console.log('\n=== SITECONFIG ===');
  if (cfg) {
    console.log('logo:', cfg.logo);
    console.log('cover:', cfg.cover);
    console.log('homeSectionsOrder:', cfg.homeSectionsOrder);
    console.log('homeSectionsEnabled:', cfg.homeSectionsEnabled);
    console.log('navSections:', cfg.navSections);
    console.log('whatsappNumber:', cfg.whatsappNumber);
    console.log('themeId:', cfg.themeId);
  }
}

main().finally(() => prisma.$disconnect());
