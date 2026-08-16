import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const promos = await db.promotion.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });
    return NextResponse.json(promos);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const promo = await db.promotion.create({
      data: {
        title: body.title || 'Nueva promoción',
        description: body.description || '',
        image: body.image || '',
        occasion: body.occasion || 'otra',
        discountPct: Number(body.discountPct) || 0,
        startDate: body.startDate || '',
        endDate: body.endDate || '',
        active: body.active !== false,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    });
    return NextResponse.json(promo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const promo = await db.promotion.update({
      where: { id },
      data: { ...data, updatedAt: new Date().toISOString() },
    });
    return NextResponse.json(promo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.promotion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
