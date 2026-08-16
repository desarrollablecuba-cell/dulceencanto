import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { decodeCustomerToken, getCustomerTokenFromRequest } from '@/lib/customer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews?productId=xxx
 * Lista las reseñas APROBADAS de un producto.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
    }
    const reviews = await db.review.findMany({
      where: { productId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Crea una nueva reseña (siempre con status 'pending').
 * Body: { productId, rating, comment }
 * REQUIERE que el cliente esté logueado (token). Se usa su nombre y país.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = String(body.productId ?? '');
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
    const comment = String(body.comment ?? '').trim();

    if (!productId || !comment) {
      return NextResponse.json(
        { error: 'Producto y comentario son obligatorios.' },
        { status: 400 }
      );
    }

    // REQUERIR cliente logueado.
    const token = getCustomerTokenFromRequest(request);
    const payload = token ? decodeCustomerToken(token) : null;
    if (!payload) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para escribir una reseña.' },
        { status: 401 }
      );
    }

    const customer = await db.customer.findUnique({ where: { id: payload.customerId } });
    if (!customer) {
      return NextResponse.json(
        { error: 'Cliente no encontrado.' },
        { status: 404 }
      );
    }

    const review = await db.review.create({
      data: {
        productId,
        customerId: customer.id,
        authorName: customer.name,
        rating,
        comment,
        status: 'pending',
        adminReply: '',
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
