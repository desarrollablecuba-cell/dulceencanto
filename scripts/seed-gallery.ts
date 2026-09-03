/**
 * seed-gallery.ts — Siembra la galería POR CATEGORÍAS (v2) en la BD del sandbox.
 *
 * Migra los 4 GalleryItem antiguos a GalleryCategory:
 *   · cover  = la imagen actual (portada de la categoría)
 *   · fotos  = la imagen original + fotos reales de productos relacionados
 *              (pasteles, tortas, dulces finos) para que el carrusel público
 *              tenga contenido desde el primer día.
 *
 * Idempotente: no duplica categorías (por slug) ni fotos (por imagen+categoria).
 * Ejecutar: bun run scripts/seed-gallery.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const now = new Date().toISOString();

interface CatSeed {
  slug: string;
  name: string;
  icon: string;
  description: string;
  cover: string;
  // Palabras para buscar fotos de productos reales relacionados
  keywords: string[];
}

const CATEGORIES: CatSeed[] = [
  {
    slug: 'quince-anos',
    name: '15 Años',
    icon: '🎀',
    description: 'Quinces soñados: tartas de varios pisos, mesas de dulces y decoración temática.',
    cover: '/gallery-15anos.webp',
    keywords: ['tres pisos', 'dos pisos', 'pavlova', 'macaron'],
  },
  {
    slug: 'cumpleanos-infantiles',
    name: 'Cumpleaños Infantiles',
    icon: '🧸',
    description: 'Tartas de personajes, cupcakes coloridos, cakepops y dulces para los más pequeños.',
    cover: '/gallery-cumple-ninos.webp',
    keywords: ['cupcake', 'cakepop', 'dona', 'paleta', 'galleta', 'vaso'],
  },
  {
    slug: 'cumpleanos-adultos',
    name: 'Cumpleaños de Adultos',
    icon: '🥂',
    description: 'Celebraciones con estilo: tortas sofisticadas, brownies y dulces finos.',
    cover: '/gallery-cumple-adultos.webp',
    keywords: ['torta', 'brownie', 'cheesecake', 'flan', 'verrine'],
  },
  {
    slug: 'bodas',
    name: 'Bodas',
    icon: '💍',
    description: 'Tartas nupciales de varios pisos, macarons, pavlovas y detalles románticos.',
    cover: '/gallery-boda.webp',
    keywords: ['tres pisos', 'macaron', 'pavlova', 'tartaleta', 'verrine'],
  },
];

async function main() {
  console.log('── Sembrando galería por categorías (v2) ──');

  // Imágenes reales disponibles (productos activos con imagen)
  const products = await db.product.findMany({
    where: { image: { not: '' } },
    select: { name: true, image: true },
  });
  const pickImages = (keywords: string[], used: Set<string>): string[] => {
    const out: string[] = [];
    for (const kw of keywords) {
      const p = products.find(
        (pr) =>
          pr.name.toLowerCase().includes(kw) &&
          !used.has(pr.image) &&
          !out.includes(pr.image),
      );
      if (p) out.push(p.image);
      if (out.length >= 3) break; // hasta 3 fotos de producto por categoría
    }
    return out;
  };

  for (const [i, cat] of CATEGORIES.entries()) {
    // ¿Ya existe la categoría? (idempotencia por slug)
    let galleryCat = await db.galleryCategory.findUnique({ where: { slug: cat.slug } });

    if (!galleryCat) {
      galleryCat = await db.galleryCategory.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          cover: cat.cover,
          icon: cat.icon,
          order: i,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      });
      console.log(`  ✓ Categoría creada: ${cat.icon} ${cat.name}`);
    } else {
      // Actualizar portada/descripción solo si están vacías
      const data: Record<string, string> = { updatedAt: now };
      if (!galleryCat.cover) data.cover = cat.cover;
      if (!galleryCat.description) data.description = cat.description;
      if (!galleryCat.icon) data.icon = cat.icon;
      await db.galleryCategory.update({ where: { id: galleryCat.id }, data });
      console.log(`  • Categoría existente: ${cat.name}`);
    }

    // Fotos: imagen original (si no está ya) + productos relacionados
    const existing = await db.galleryPhoto.findMany({
      where: { categoryId: galleryCat.id },
      select: { image: true },
    });
    const have = new Set(existing.map((p) => p.image));
    let order = existing.length;

    const addPhoto = async (image: string, title: string) => {
      if (!image || have.has(image)) return;
      have.add(image);
      await db.galleryPhoto.create({
        data: {
          categoryId: galleryCat!.id,
          image,
          title,
          description: '',
          order: order++,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      });
    };

    // La portada también participa como primera foto del carrusel
    await addPhoto(cat.cover, `${cat.name} — evento real de Dulce Encanto`);
    const used = new Set(have);
    const extra = pickImages(cat.keywords, used);
    for (const img of extra) await addPhoto(img, '');
  }

  // Resumen
  const cats = await db.galleryCategory.findMany({ include: { photos: true } });
  for (const c of cats) {
    console.log(`  🖼️ ${c.name}: ${c.photos.length} foto(s), portada=${c.cover || '—'}`);
  }
  console.log('── Galería sembrada correctamente ──');
}

main()
  .catch((e) => {
    console.error('ERROR sembrando galería:', e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
