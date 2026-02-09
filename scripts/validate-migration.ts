/**
 * Migration Validation Script
 *
 * Validates data integrity after migration or Excel import.
 * Checks: table counts, required reference data, and optional referential consistency.
 *
 * Usage:
 *   npx tsx scripts/validate-migration.ts
 */

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

const errors: string[] = [];
const warnings: string[] = [];

async function main() {
  console.log('Validating database...\n');

  const rolesCount = await prisma.roles.count({ where: { deleted_at: null } });
  if (rolesCount < 6) {
    errors.push(`Expected at least 6 roles; found ${rolesCount}. Run seed.`);
  } else {
    console.log(`✓ Roles: ${rolesCount}`);
  }

  const usersCount = await prisma.users.count({ where: { deleted_at: null } });
  if (usersCount === 0) {
    errors.push('No users found. Create admin (npm run migrate or create-admin).');
  } else {
    console.log(`✓ Users: ${usersCount}`);
  }

  const adminUser = await prisma.users.findFirst({
    where: { deleted_at: null },
    include: { user_roles: { include: { role: true } } },
  });
  const hasAdmin = adminUser?.user_roles?.some((ur) =>
    ['superadmin', 'manager'].includes(ur.role.code)
  );
  if (!hasAdmin) {
    warnings.push('No superadmin/manager user found. Ensure at least one admin can login.');
  } else {
    console.log('✓ Admin user present');
  }

  const savingsTypesCount = await prisma.savings_types.count();
  if (savingsTypesCount < 3) {
    errors.push(`Expected at least 3 savings types (POKOK, WAJIB, SUKARELA); found ${savingsTypesCount}. Run seed.`);
  } else {
    console.log(`✓ Savings types: ${savingsTypesCount}`);
  }

  const coaCount = await prisma.chart_of_accounts.count({ where: { is_active: true } });
  if (coaCount === 0) {
    warnings.push('Chart of accounts is empty. Run seed for COA.');
  } else {
    console.log(`✓ Chart of accounts: ${coaCount} active`);
  }

  const membersCount = await prisma.members.count({ where: { deleted_at: null } });
  console.log(`  Members: ${membersCount}`);

  const savingsAccountsCount = await prisma.savings_accounts.count({
    where: { closed_date: null },
  });
  console.log(`  Savings accounts (open): ${savingsAccountsCount}`);

  const loansCount = await prisma.loans.count();
  console.log(`  Loans: ${loansCount}`);

  const journalEntriesCount = await prisma.journal_entries.count();
  console.log(`  Journal entries: ${journalEntriesCount}`);

  const productUnitsCount = await prisma.product_units.count({ where: { is_active: true } });
  if (productUnitsCount === 0) {
    warnings.push('No product units. Run seed for units.');
  } else {
    console.log(`✓ Product units: ${productUnitsCount}`);
  }

  console.log('');
  if (errors.length > 0) {
    console.error('Errors:');
    errors.forEach((e) => console.error('  -', e));
    process.exitCode = 1;
  }
  if (warnings.length > 0) {
    console.warn('Warnings:');
    warnings.forEach((w) => console.warn('  -', w));
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log('Validation passed.');
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
