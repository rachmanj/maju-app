/**
 * Clear all savings transactions and reset account balances to 0.
 * Also deletes journal entries created by savings deposits/withdrawals.
 * Use when you need to re-upload correct data via Excel.
 *
 * Usage: npx tsx scripts/clear-savings-transactions.ts
 */

import 'dotenv/config';
import { prisma } from '@/lib/db/prisma';

async function main() {
  const [txCount, accCount, journalCount] = await Promise.all([
    prisma.savings_transactions.count(),
    prisma.savings_accounts.count(),
    prisma.journal_entries.count({
      where: {
        OR: [
          { description: { startsWith: 'Setor Simpanan' } },
          { description: { startsWith: 'Tarik Simpanan' } },
        ],
      },
    }),
  ]);

  console.log(`Found ${txCount} savings transactions, ${accCount} savings accounts, ${journalCount} savings journal entries.`);

  await prisma.$transaction(async (tx) => {
    await tx.savings_transactions.deleteMany({});
    await tx.savings_accounts.updateMany({
      data: { balance: 0 },
    });
    await tx.journal_entries.deleteMany({
      where: {
        OR: [
          { description: { startsWith: 'Setor Simpanan' } },
          { description: { startsWith: 'Tarik Simpanan' } },
        ],
      },
    });
  });

  console.log('Done. All savings transactions, balances, and related journal entries cleared.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
