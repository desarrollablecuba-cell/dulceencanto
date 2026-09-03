import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Calcula el rating promedio y número de reseñas aprobadas para una lista de productos.
 * Sobrescribe los valores del seed con datos reales.
 */
async function attachReviewStats(products: Record<string, unknown>[]) {
  if (products.length === 0) return products;

  // Obtener todas las reseñas aprobadas de los productos devueltos
  const productIds = products.map((p) => p.id as string);
  const allReviews = await db.review.findMany({
    where: {
      productId: { in: productIds },
      status: 'approved',
    },
  });

  // Agrupar por productId
  const reviewMap = new Map<string, { sum: number; count: number }>();
  for (const r of allReviews) {
    const pid = r.productId as string;
    const entry = reviewMap.get(pid) ?? { sum: 0, count: 0 };
    entry.sum += Number(r.rating) || 0;
    entry.count += 1;
    reviewMap.set(pid, entry);
  }

  // Sobrescribir rating y reviewCount con datos reales
  return products.map((p) => {
    const stats = reviewMap.get(p.id as string);
    if (stats && stats.count > 0) {
      return {
        ...p,
        rating: Math.round((stats.sum / stats.count) * 10) / 10,
        reviewCount: stats.count,
      };
    }
    // Si no hay reseñas reales, mostrar 0
    return {
      ...p,
      rating: 0,
      reviewCount: 0,
    };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const catalog = searchParams.get('catalog'); // 'reservation' | 'immediate'
    const sort = searchParams.get('sort');

    const where: Record<string, unknown> = {
      // SIGECOS: sólo productos activos y disponibles en tienda online
      status: 'active',
      tiendaAvailable: true,
    };

    // Condiciones compuestas (AND de ORs) para no colisionar catálogo + búsqueda
    const andConditions: Record<string, unknown>[] = [];

    // Filtro por tipo de catálogo — la SECCIÓN de la categoría manda
    // (configurable desde el admin: Venta Directa / Reservas / Ambas):
    // - 'reservation': productos de categorías "Por Reserva" + los reservables
    //   de categorías "Ambas".
    // - 'immediate': productos de categorías "Venta Directa" + los no
    //   reservables de categorías "Ambas".
    if (catalog === 'reservation' || catalog === 'immediate') {
      const cats = await db.category.findMany({ select: { id: true, section: true } });
      const inSection = cats.filter((c) => c.section === catalog).map((c) => c.id);
      const neutral = cats
        .filter((c) => c.section !== 'immediate' && c.section !== 'reservation')
        .map((c) => c.id);
      andConditions.push({
        OR: [
          { categoryId: { in: inSection.length > 0 ? inSection : ['__none__'] } },
          { categoryId: { in: neutral.length > 0 ? neutral : ['__none__'] }, reservationEnabled: catalog === 'reservation' },
        ],
      });
    }

    if (category) {
      const cat = await db.category.findFirst({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const orderBy: Record<string, string> = {};
    if (sort === 'price-asc') orderBy.price = 'asc';
    else if (sort === 'price-desc') orderBy.price = 'desc';
    else if (sort === 'rating') orderBy.rating = 'desc';
    else if (sort === 'newest') orderBy.createdAt = 'desc';
    else orderBy.createdAt = 'desc';

    let products = await db.product.findMany({
      where,
      // Incluimos _count.variantGroups para que el storefront (ProductCard)
      // sepa si el producto tiene variantes y debe enrutar al detalle en
      // lugar de añadir directamente al carrito.
      // También incluimos variantGroups.options para calcular si hay stock
      // disponible en alguna opción (necesario para mostrar SIN STOCK / RESERVABLE
      // correctamente en la tarjeta del producto).
      include: {
        category: true,
        _count: { select: { variantGroups: true } },
        variantGroups: {
          include: {
            options: { select: { id: true, stock: true, available: true } },
          },
        },
      },
      orderBy,
    });

    // SIGECOS: nunca exponer campos sensibles al storefront público
    const SENSITIVE_FIELDS = [
      'costPrice',
      'marginPercent',
      'advanceType',
      'advanceValue',
      'minHours',
      'sortOrder',
      'posAvailable',
    ];
    products = products.map((p) => {
      const cleaned: Record<string, unknown> = { ...(p as unknown as Record<string, unknown>) };
      for (const f of SENSITIVE_FIELDS) {
        delete cleaned[f];
      }
      return cleaned as typeof products[number];
    });

    // Sobrescribir rating y reviewCount con datos reales de reseñas aprobadas
    products = await attachReviewStats(products as unknown as Record<string, unknown>[]) as typeof products;

    // Si el sort es por rating, re-ordenar después de calcular ratings reales
    if (sort === 'rating') {
      products = [...products].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
