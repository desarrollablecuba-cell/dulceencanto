import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { parseServiceVariants } from '@/lib/service-variants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * /api/services — Servicios para Eventos (público).
 *
 * Devuelve solo los servicios ACTIVOS, ordenados, con `variants` parseado
 * como array (V52.5) y solo con las variantes activas:
 *
 *   [{ id, name, description, icon, image, price, priceUsd, category,
 *      variants: [{ id, name, image, priceUsd, order }] }]
 */
export async function GET() {
  try {
    const services = await db.service.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(
      services.map((s) => ({
        ...s,
        variants: parseServiceVariants(s.variants).filter((v) => v.active),
      }))
    );
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json([]);
  }
}
