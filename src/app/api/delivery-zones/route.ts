import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/delivery-zones
 * Lista las zonas de delivery activas para el checkout público.
 * Query params:
 *   - all=true  → incluye también las zonas inactivas (solo admin)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';

    const where: Record<string, unknown> = {};
    if (!includeInactive) where.active = true;

    const zones = await db.deliveryZone.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(zones);
  } catch (error) {
    console.error('Error fetching delivery zones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery zones' },
      { status: 500 }
    );
  }
}
