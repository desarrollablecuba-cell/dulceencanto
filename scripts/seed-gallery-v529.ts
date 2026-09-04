/**
 * V52.9 — seed-gallery-v529.ts
 *
 * Siembra FOTOS REALISTAS de eventos en las categorías de la Galería
 * (15 Años, Cumpleaños Infantiles, Cumpleaños de Adultos, Bodas):
 * fiestas de 15, cumpleaños infantiles reales, etc. — generadas como
 * demostración para el gestor de la galería del admin (se pueden borrar
 * desde el propio admin y reemplazar por las fotos reales del negocio).
 *
 * Idempotente: no duplica fotos con la misma imagen.
 *
 * Uso: bun scripts/seed-gallery-v529.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface SeedPhoto {
  image: string;
  title: string;
  description: string;
}

const SEED: Record<string, SeedPhoto[]> = {
  'quince-anos': [
    { image: '/gallery/gal-15anos-1.webp', title: 'Fiesta de 15 — mesa dulce en rosa y dorado', description: 'Tarta de tres pisos con detalles dorados y arco de globos. Un encanto de quinceañera.' },
    { image: '/gallery/gal-15anos-2.webp', title: '15 Años — salón decorado a mano', description: 'Cabecera con drapeados rosa, luces cálidas y centros de flores naturales.' },
    { image: '/gallery/gal-15anos-3.webp', title: 'Mesa de postres de la quinceañera', description: 'Cupcakes, cake pops y frascos de dulces en bandejas doradas con pétalos.' },
    { image: '/gallery/gal-15anos-4.webp', title: 'Velas volcánicas de cumpleaños 15', description: 'El momento mágico: chispas sobre la tarta con la quinceañera y sus amigas.' },
  ],
  'cumpleanos-infantiles': [
    { image: '/gallery/gal-ninos-1.webp', title: 'Cumpleaños infantil con payasita', description: 'Mesas de colores, globos y la Payasita de Dulce Encanto divirtiendo a los peques.' },
    { image: '/gallery/gal-ninos-2.webp', title: 'Mesa temática de cumpleaños infantil', description: 'Tarta de dibujos, gorritos y dulces a color completo.' },
    { image: '/gallery/gal-ninos-3.webp', title: 'Piñata y confeti — fiesta de niños', description: 'La emoción de la piñata: bolsitas listas y confeti por todo el salón.' },
    { image: '/gallery/gal-ninos-4.webp', title: 'Soplando las velitas', description: 'El cumpleañero con su tarta de superhéroes, rodeado de familia y amigos.' },
  ],
  'cumpleanos-adultos': [
    { image: '/gallery/gal-adultos-1.webp', title: 'Cumpleaños elegante en blanco y dorado', description: 'Tarta de dos pisos con arreglos florales y velas — celebración de noche.' },
    { image: '/gallery/gal-adultos-2.webp', title: 'Cumpleaños con números gigantes', description: 'Velas de número sobre tarta elegante, decoración negro y dorado.' },
  ],
  bodas: [
    { image: '/gallery/gal-bodas-1.webp', title: 'Mesa dulce de boda', description: 'Tarta blanco y dorado con flores frescas, macarons y cupcakes.' },
    { image: '/gallery/gal-bodas-2.webp', title: 'Postres de la recepción', description: 'P petits fours, velas y rosas — romanticismo en cada detalle.' },
  ],
};

async function main() {
  let added = 0;
  for (const [slug, photos] of Object.entries(SEED)) {
    const cat = await db.galleryCategory.findUnique({ where: { slug } });
    if (!cat) {
      console.log(`⚠️  categoría "${slug}" no existe — se omite`);
      continue;
    }
    const existing = await db.galleryPhoto.findMany({ where: { categoryId: cat.id }, select: { image: true } });
    const existingSet = new Set(existing.map((p) => p.image));
    let order = existing.length;
    const now = new Date().toISOString();
    for (const p of photos) {
      if (existingSet.has(p.image)) continue;
      await db.galleryPhoto.create({
        data: {
          categoryId: cat.id,
          image: p.image,
          title: p.title,
          description: p.description,
          order,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      });
      added++;
      order++;
      console.log(`✓ ${cat.name} · ${p.title}`);
    }
  }
  console.log(`\nListo: ${added} fotos nuevas sembradas (idempotente).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
