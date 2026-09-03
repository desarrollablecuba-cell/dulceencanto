import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CRUD de categorías de la galería (solo admin).
 *
 * GET    → todas las categorías (incluye inactivas, para el panel)
 * POST   → crear categoría { name, description?, cover?, icon?, order?, active? }
 * PUT    → actualizar categoría { id, ...campos }
 * DELETE → eliminar categoría (?id=) — borra en cascada sus fotos
 */

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || `cat-${Date.now()}`;

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const categories = await db.galleryCategory.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        photos: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const name = String(body.name || 'Nueva categoría').slice(0, 120);
    let slug = slugify(String(body.slug || name));
    // Garantizar slug único
    const exists = await db.galleryCategory.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const last = await db.galleryCategory.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    const category = await db.galleryCategory.create({
      data: {
        name,
        slug,
        description: String(body.description || ''),
        cover: String(body.cover || ''),
        icon: String(body.icon || '🖼️'),
        order: Number.isFinite(body.order) ? Number(body.order) : (last?.order ?? -1) + 1,
        active: body.active !== false,
        createdAt: now,
        updatedAt: now,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const { id, name, description, cover, icon, order, active } = body;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) data.name = String(name).slice(0, 120);
    if (description !== undefined) data.description = String(description);
    if (cover !== undefined) data.cover = String(cover);
    if (icon !== undefined) data.icon = String(icon);
    if (order !== undefined) data.order = Number(order) || 0;
    if (active !== undefined) data.active = Boolean(active);
    const category = await db.galleryCategory.update({ where: { id }, data });
    return NextResponse.json(category);
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
    // Prisma borra en cascada las fotos (onDelete: Cascade)
    await db.galleryCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
