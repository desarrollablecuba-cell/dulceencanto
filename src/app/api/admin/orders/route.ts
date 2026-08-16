import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

export async function GET(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  const orders = await db.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
}

export async function PUT(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const body = await request.json();
    const { id, status } = body;
    const order = await db.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.orderItem.deleteMany({ where: { orderId: id } });
    await db.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
