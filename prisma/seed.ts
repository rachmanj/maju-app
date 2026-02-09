import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { COA_ACCOUNTS } from '../lib/data/coa-seed';

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
  const roles = [
    { code: 'superadmin', name: 'Superadmin', description: 'Full access to all modules' },
    { code: 'manager', name: 'Manager', description: 'Approval pinjaman, laporan, konfigurasi operasional' },
    { code: 'pengurus', name: 'Pengurus', description: 'Akses ke modul keuangan dan laporan' },
    { code: 'kasir', name: 'Kasir', description: 'POS, input pembayaran' },
    { code: 'pengawas', name: 'Pengawas', description: 'Read-only/view saja - Monitoring dan audit' },
    { code: 'anggota', name: 'Anggota', description: 'Self-service portal' },
  ];
  for (const role of roles) {
    await prisma.roles.upsert({
      where: { code: role.code },
      create: role,
      update: {},
    });
  }

  const savingsTypes = [
    { code: 'POKOK', name: 'Simpanan Pokok', is_mandatory: true, is_withdrawable: false, minimum_amount: 200000, earns_interest: false },
    { code: 'WAJIB', name: 'Simpanan Wajib', is_mandatory: true, is_withdrawable: false, minimum_amount: 100000, earns_interest: false },
    { code: 'SUKARELA', name: 'Simpanan Sukarela', is_mandatory: false, is_withdrawable: true, minimum_amount: 0, earns_interest: true },
  ];
  for (const t of savingsTypes) {
    await prisma.savings_types.upsert({
      where: { code: t.code },
      create: t,
      update: {},
    });
  }

  const productUnits = [
    { code: 'PCS', name: 'Pieces' },
    { code: 'KG', name: 'Kilogram' },
    { code: 'L', name: 'Liter' },
    { code: 'KARTON', name: 'Karton' },
    { code: 'PAK', name: 'Pak' },
    { code: 'DUS', name: 'Dus' },
  ];
  for (const u of productUnits) {
    await prisma.product_units.upsert({
      where: { code: u.code },
      create: u,
      update: {},
    });
  }

  const accountMap = new Map<string, number>();
  for (const account of COA_ACCOUNTS) {
    if (!account.parent_code) {
      const created = await prisma.chart_of_accounts.upsert({
        where: { code: account.code },
        create: { code: account.code, name: account.name, account_type: account.account_type },
        update: {},
      });
      accountMap.set(account.code, created.id);
    }
  }
  for (const account of COA_ACCOUNTS) {
    if (account.parent_code) {
      const parentId = accountMap.get(account.parent_code);
      if (parentId) {
        await prisma.chart_of_accounts.upsert({
          where: { code: account.code },
          create: { code: account.code, name: account.name, account_type: account.account_type, parent_id: parentId },
          update: {},
        });
      }
    }
  }

  const posDevice = await prisma.pos_devices.upsert({
    where: { code: 'POS-01' },
    create: { code: 'POS-01', name: 'Kasir 1' },
    update: {},
  });
  if (posDevice) console.log('POS device POS-01 ready');

  const expenseCategories = [
    { code: 'UMUM', name: 'Biaya Umum' },
    { code: 'OPERASIONAL', name: 'Biaya Operasional' },
    { code: 'ATK', name: 'Alat Tulis Kantor' },
  ];
  for (const c of expenseCategories) {
    await prisma.expense_categories.upsert({
      where: { code: c.code },
      create: { code: c.code, name: c.name, is_active: true },
      update: {},
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@koperasimaju.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'Administrator';

  const existing = await prisma.users.findFirst({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const superadmin = await prisma.roles.findUnique({ where: { code: 'superadmin' } });
    if (superadmin) {
      const user = await prisma.users.create({
        data: { email: adminEmail, password_hash: passwordHash, name: adminName, is_active: true },
      });
      await prisma.user_roles.create({
        data: { user_id: user.id, role_id: superadmin.id },
      });
      console.log(`Admin user created: ${adminEmail}`);
    }
  }
}

main()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
