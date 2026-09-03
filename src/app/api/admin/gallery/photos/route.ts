import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CRUD de fotos de eventos dentro de una categoría de la galería (solo admin).
 *
 * POST   → crear foto { categoryId, image, title?, description?, order? }
 * PUT    → actualizar foto { id, image?, title?, description?, order?, active? }
 * DELETE → eliminar foto (?id=)
 * PATCH  → reordenar { id, direction: 'up' | 'down' } (swap de order con la vecina)
 */
export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.categoryId) return NextResponse.json({ error: 'categoryId requerido' }, { status: 400 });
    if (!body.image) return NextResponse.json({ error: 'image requerida' }, { status: 400 });
    const now = new Date().toISOString();
    const last = await db.galleryPhoto.findFirst({
      where: { categoryId: body.categoryId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const photo = await db.galleryPhoto.create({
      data: {
        categoryId: body.categoryId,
        image: String(body.image),
        title: String(body.title || ''),
        description: String(body.description || ''),
        order: Number.isFinite(body.order) ? Number(body.order) : (last?.order ?? -1) + 1,
        active: body.active !== false,
        createdAt: now,
        updatedAt: now,
      },
    });
    return NextResponse.json(photo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const { id, image, title, description, order, active } = body;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (image !== undefined) data.image = String(image);
    if (title !== undefined) data.title = String(title);
    if (description !== undefined) data.description = String(description);
    if (order !== undefined) data.order = Number(order) || 0;
    if (active !== undefined) data.active = Boolean(active);
    const photo = await db.galleryPhoto.update({ where: { id }, data });
    return NextResponse.json(photo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.galleryPhoto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const { id, direction } = body;
    if (!id || !['up', 'down'].includes(direction)) {
      return NextResponse.json({ error: 'id y direction (up|down) requeridos' }, { status: 400 });
    }
    const photo = await db.galleryPhoto.findUnique({ where: { id } });
    if (!photo) return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
    const siblings = await db.galleryPhoto.findMany({
      where: { categoryId: photo.categoryId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const idx = siblings.findIndex((p) => p.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) {
      return NextResponse.json({ ok: true }); // ya está en el extremo
    }
    const now = new Date().toISOString();
    const a = siblings[idx];
    const b = siblings[swapIdx];
    await db.$transaction([
      db.galleryPhoto.update({ where: { id: a.id }, data: { order: swapIdx, updatedAt: now } }),
      db.galleryPhoto.update({ where: { id: b.id }, data: { order: idx, updatedAt: now } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
