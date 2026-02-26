import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url && typeof url === 'string' && url.startsWith('mysql://')) return url;
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '3306';
  const user = process.env.DB_USER ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database = process.env.DB_NAME ?? 'maju_app';
  return `mysql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(getDatabaseUrl()),
  });
  try {
    const bebanOp = await prisma.chart_of_accounts.findUnique({ where: { code: '6227' }, select: { id: true } });
    const bebanAtk = await prisma.chart_of_accounts.findUnique({ where: { code: '6226' }, select: { id: true } });
    if (bebanOp) {
      await prisma.expense_categories.updateMany({
        where: { code: { in: ['UMUM', 'OPERASIONAL'] } },
        data: { account_id: bebanOp.id },
      });
      console.log('UMUM, OPERASIONAL → 6227');
    }
    if (bebanAtk) {
      await prisma.expense_categories.updateMany({
        where: { code: 'ATK' },
        data: { account_id: bebanAtk.id },
      });
      console.log('ATK → 6226');
    }
    console.log('Expense categories updated.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
