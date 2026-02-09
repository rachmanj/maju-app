import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL;
  if (!url || typeof url !== 'string' || !url.startsWith('mysql://')) {
    const host = process.env.DB_HOST ?? 'localhost';
    const port = process.env.DB_PORT ?? '3306';
    const user = process.env.DB_USER ?? 'root';
    const password = process.env.DB_PASSWORD ?? '';
    const database = process.env.DB_NAME ?? 'maju_app';
    url = `mysql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
  const param = 'allowPublicKeyRetrieval=true';
  return url.includes('?') ? `${url}&${param}` : `${url}?${param}`;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(getDatabaseUrl()),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
