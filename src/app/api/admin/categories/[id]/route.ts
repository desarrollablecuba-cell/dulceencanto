import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { id } = await params;
    const body = await request.json();
    const category = await db.category.update({
      where: { id },
      data: body,
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { id } = await params;
    // Delete all products in this category first
    await db.product.deleteMany({ where: { categoryId: id } });
    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
