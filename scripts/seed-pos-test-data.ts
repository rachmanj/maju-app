import 'dotenv/config';
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

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getDatabaseUrl()),
});

async function main() {
  await prisma.members.updateMany({
    where: { id: 1 },
    data: { status: 'active', name: 'Test Member' },
  });
  console.log('Member 1 approved');

  const pcs = await prisma.product_units.findUnique({ where: { code: 'PCS' } });
  if (!pcs) throw new Error('PCS unit not found');

  const existingPrice = await prisma.product_prices.findFirst({
    where: { product_id: 1, unit_id: pcs.id },
  });
  if (!existingPrice) {
    await prisma.product_prices.create({
      data: {
        product_id: 1,
        warehouse_id: 1,
        unit_id: pcs.id,
        price: 65000,
        effective_date: new Date(),
      },
    });
  }
  console.log('Product price added');

  await prisma.warehouse_stock.upsert({
    where: { warehouse_id_product_id: { warehouse_id: 1, product_id: 1 } },
    create: { warehouse_id: 1, product_id: 1, quantity: 100 },
    update: { quantity: 100 },
  });
  console.log('Stock added');

  await prisma.member_purchase_limits.upsert({
    where: { member_id: 1 },
    create: { member_id: 1, limit_amount: 1000000, effective_date: new Date() },
    update: { limit_amount: 1000000 },
  });
  console.log('Purchase limit set');
}

main()
  .then(() => {
    console.log('POS test data seeded');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
