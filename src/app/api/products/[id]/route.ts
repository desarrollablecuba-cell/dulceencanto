import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calcular rating y reviewCount reales desde reseñas aprobadas
    const reviews = await db.review.findMany({
      where: { productId: id, status: 'approved' },
    });

    const reviewCount = reviews.length;
    const realRating = reviewCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount) * 10) / 10
      : 0;

    // Cargar relaciones de variantes, extras y rangos al por mayor
    const variantGroups = await db.variantGroup.findMany({ where: { productId: id }, orderBy: { sortOrder: 'asc' } });
    const groupIds = variantGroups.map((g) => g.id);
    const [variantOptions, combinations, productExtras, wholesaleTiers] = await Promise.all([
      groupIds.length > 0
        ? db.variantOption.findMany({ where: { groupId: { in: groupIds } }, orderBy: { sortOrder: 'asc' } })
        : Promise.resolve([]),
      db.productCombination.findMany({ where: { productId: id }, orderBy: { sortOrder: 'asc' } }),
      db.productExtra.findMany({ where: { productId: id }, orderBy: { sortOrder: 'asc' } }),
      db.wholesaleTier.findMany({ where: { productId: id }, orderBy: { sortOrder: 'asc' } }),
    ]);

    // Anidar opciones dentro de cada grupo
    const groupsWithOptions = variantGroups.map((g) => ({
      ...g,
      options: variantOptions.filter((o) => o.groupId === g.id),
    }));

    return NextResponse.json({
      ...product,
      rating: realRating,
      reviewCount,
      variantGroups: groupsWithOptions,
      combinations,
      productExtras,
      wholesaleTiers,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
