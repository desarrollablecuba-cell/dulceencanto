import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

export async function GET(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  const categories = await db.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const body = await request.json();
    const category = await db.category.create({ data: body });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
