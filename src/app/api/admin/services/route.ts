import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * /api/admin/services — CRUD de Servicios para Eventos (requiere admin).
 *
 *  GET    → todos los servicios (incluye inactivos), ordenados.
 *  POST   → crea un servicio { name, description, icon, image, price,
 *            priceUsd, category, active, order }.
 *  PUT    → actualiza un servicio { id, ...campos }.
 *  DELETE → elimina un servicio ?id=...
 *
 * Las cards públicas (/api/services) solo devuelven los activos; aquí el
 * admin ve y gestiona TODOS (incluidos los ocultos).
 */

interface ServiceBody {
  id?: string;
  name?: string;
  description?: string;
  icon?: string;
  image?: string;
  price?: number;
  priceUsd?: number;
  category?: string;
  active?: boolean;
  order?: number;
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const services = await db.service.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(services);
  } catch (error: any) {
    console.error('Error fetching services (admin):', error);
    return NextResponse.json({ error: error?.message || 'Error al listar servicios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const body = (await request.json()) as ServiceBody;
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'El nombre del servicio es obligatorio' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const service = await db.service.create({
      data: {
        name: body.name.trim(),
        description: body.description || '',
        icon: body.icon || '✨',
        image: body.image || '',
        price: Number(body.price) || 0,
        priceUsd: Number(body.priceUsd) || 0,
        category: body.category || 'decoracion',
        active: body.active !== false,
        order: Number.isFinite(Number(body.order)) ? Number(body.order) : 100,
        createdAt: now,
        updatedAt: now,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: error?.message || 'Error al crear el servicio' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const body = (await request.json()) as ServiceBody;
    if (!body.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined) data.description = String(body.description);
    if (body.icon !== undefined) data.icon = String(body.icon);
    if (body.image !== undefined) data.image = String(body.image);
    if (body.price !== undefined) data.price = Number(body.price) || 0;
    if (body.priceUsd !== undefined) data.priceUsd = Number(body.priceUsd) || 0;
    if (body.category !== undefined) data.category = String(body.category);
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.order !== undefined) data.order = Number(body.order) || 0;

    const service = await db.service.update({ where: { id: body.id }, data });
    return NextResponse.json(service);
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: error?.message || 'Error al actualizar el servicio' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!requireAdmin(request)) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: error?.message || 'Error al eliminar el servicio' }, { status: 500 });
  }
}
