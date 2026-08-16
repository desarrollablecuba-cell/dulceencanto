import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/seed
 * Inicializa los datos en Cloudflare KV (o JSON store).
 * Se llama automáticamente en la primera visita, o manualmente
 * visitando /api/seed después del deploy.
 */
export async function GET() {
  try {
    // El store se inicializa automáticamente al primer acceso.
    // Este endpoint fuerza la inicialización leyendo todas las colecciones.
    const [products, categories, admins, siteConfig] = await Promise.all([
      db.product.findMany(),
      db.category.findMany(),
      db.admin.findMany(),
      db.siteConfig.findUnique({ where: { id: 'site' } }),
    ]);

    return NextResponse.json({
      status: 'ok',
      message: 'Datos inicializados correctamente',
      counts: {
        products: products.length,
        categories: categories.length,
        admins: admins.length,
        siteConfig: siteConfig ? 'configured' : 'missing',
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Error al inicializar datos', error: String(error) },
      { status: 500 }
    );
  }
}
