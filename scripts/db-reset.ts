/**
 * Script de reseteo de BD: borra todas las tablas y las vuelve a crear.
 * ¡CUIDADO! Esto borra TODOS los datos.
 *
 * Uso: bun run db:reset
 */

import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('\n⚠️  ATENCIÓN: Esto va a BORRAR TODOS los datos de la BD.');
  console.log('   Tienes 5 segundos para cancelar con Ctrl+C...\n');

  await new Promise((r) => setTimeout(r, 5000));

  console.log('🗑️  Borrando tablas...');

  // Orden importa: primero hijas, luego padres
  const tables = [
    'OrderItem',
    'Order',
    'ProductExtra',
    'ProductCombination',
    'VariantOption',
    'VariantGroup',
    'WholesaleTier',
    'Product',
    'Review',
    'Customer',
    'DeliveryZone',
    'Category',
    'SiteConfig',
    'Admin',
    '_prisma_migrations',
  ];

  for (const table of tables) {
    try {
      // @ts-ignore — dinámico
      await prisma[table].deleteMany({});
      console.log(`   ✓ ${table} vaciada`);
    } catch (e) {
      console.log(`   - ${table}: ${(e as Error).message}`);
    }
  }

  await prisma.$disconnect();
  console.log('\n📦 Aplicando migraciones de nuevo...');
  const result = spawnSync('bunx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    encoding: 'utf8',
  });

  if (result.status === 0) {
    console.log('\n✅ BD reseteada y migraciones aplicadas.');
    console.log('   Para volver a cargar datos JSON: bun run db:seed-json');
  } else {
    console.error('\n❌ Falló la migración. Revisa el error arriba.');
  }
  process.exit(result.status ?? 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
