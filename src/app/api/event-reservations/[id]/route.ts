import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUS = ['pending', 'confirmed', 'completed', 'cancelled'];

/** V52.7 — PATCH: actualizar el estado de una reserva desde el calendario del admin. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = String(body.status || '');
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: `Estado inválido: ${status}` }, { status: 400 });
    }
    const existing = await db.eventReservation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }
    const reservation = await db.eventReservation.update({
      where: { id },
      data: { status, updatedAt: new Date().toISOString() },
      include: { items: true },
    });
    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error('Error updating event reservation:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar la reserva' }, { status: 500 });
  }
}

/** GET individual (por si se necesita). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reservation = await db.eventReservation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    return NextResponse.json(reservation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
