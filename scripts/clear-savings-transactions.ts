/**
 * Deletes ALL Simpanan transaction data: Pokok, Wajib, Sukarela, Sukarela SHU, Sukarela Reguler.
 * - savings_transactions
 * - savings_upload_batches
 * - savings_interest_calculations
 * - Resets savings_accounts.balance to 0
 * - Deletes related journal entries (Setor/Tarik Simpanan, savings_upload_batch)
 *
 * Run: npm run clear-savings-transactions
 * WARNING: Irreversible. Use only when you need to reset all simpanan data.
 */
import './load-env';
import { prisma } from '../lib/db/prisma';

async function main() {
  const [txCount, batchCount, interestCount, accCount, journalCount] = await Promise.all([
    prisma.savings_transactions.count(),
    prisma.savings_upload_batches.count(),
    prisma.savings_interest_calculations.count(),
    prisma.savings_accounts.count(),
    prisma.journal_entries.count({
      where: {
        OR: [
          { description: { startsWith: 'Setor Simpanan' } },
          { description: { startsWith: 'Tarik Simpanan' } },
          { reference_type: 'savings_upload_batch' },
        ],
      },
    }),
  ]);

  console.log('\nWARNING: This will permanently delete all Simpanan data.');
  console.log('Before clear:');
  console.log(`  savings_transactions: ${txCount}`);
  console.log(`  savings_upload_batches: ${batchCount}`);
  console.log(`  savings_interest_calculations: ${interestCount}`);
  console.log(`  savings_accounts (will reset balance): ${accCount}`);
  console.log(`  journal_entries (savings-related): ${journalCount}`);

  await prisma.$transaction(async (tx) => {
    await tx.savings_interest_calculations.deleteMany({});
    await tx.savings_transactions.deleteMany({});
    await tx.savings_upload_batches.deleteMany({});
    await tx.savings_accounts.updateMany({
      data: { balance: 0 },
    });
    await tx.journal_entries.deleteMany({
      where: {
        OR: [
          { description: { startsWith: 'Setor Simpanan' } },
          { description: { startsWith: 'Tarik Simpanan' } },
          { reference_type: 'savings_upload_batch' },
        ],
      },
    });
  });

  console.log('\nDone. Deleted:');
  console.log(`  savings_transactions: ${txCount}`);
  console.log(`  savings_upload_batches: ${batchCount}`);
  console.log(`  savings_interest_calculations: ${interestCount}`);
  console.log(`  journal_entries: ${journalCount}`);
  console.log(`  savings_accounts balances reset: ${accCount}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
