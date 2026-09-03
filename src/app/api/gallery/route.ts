import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/gallery
 *
 * Galería por categorías (público, solo lectura). Devuelve las categorías
 * activas con sus fotos de eventos reales, ordenadas. La escritura se hace
 * desde /api/admin/gallery (protegida con token de admin).
 */
export async function GET() {
  try {
    const categories = await db.galleryCategory.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        photos: {
          where: { active: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json([]);
  }
}
