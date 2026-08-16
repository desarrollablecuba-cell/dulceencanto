/**
 * Database access layer — Prisma.
 *
 * Detección automática de proveedor:
 *  - Si DATABASE_URL empieza con "file:" → SQLite (vista previa en Z.AI)
 *  - Si DATABASE_URL empieza con "mysql://" → MySQL (Railway/Hostinger producción)
 *
 * El schema.prisma por defecto es SQLite para el sandbox de Z.AI.
 * Para producción MySQL, copia prisma/schema.mysql.prisma a prisma/schema.prisma
 * y configura DATABASE_URL=mysql://... en el entorno de deploy.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL || '';
const isMySQL = databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql+pooled://');

// En producción, usar los parámetros de DATABASE_URL tal cual.
// En desarrollo, no modificar la URL.
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export type DB = typeof db;
export { isMySQL };
