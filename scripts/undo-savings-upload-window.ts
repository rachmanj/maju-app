/**
 * Reverses savings Excel upload transactions that were created without a batch
 * (e.g. when batch_type column was missing and batch creation failed silently).
 *
 * Run: npx tsx scripts/undo-savings-upload-window.ts --from "2026-07-02 15:00:00" --to "2026-07-02 16:00:00"
 */
import './load-env';
import { prisma } from '../lib/db/prisma';

function parseArgs(): { from: string; to: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let from = '';
  let to = '';
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from') from = args[++i] ?? '';
    else if (args[i] === '--to') to = args[++i] ?? '';
    else if (args[i] === '--dry-run') dryRun = true;
  }
  if (!from || !to) {
    console.error('Usage: npx tsx scripts/undo-savings-upload-window.ts --from "YYYY-MM-DD HH:mm:ss" --to "YYYY-MM-DD HH:mm:ss" [--dry-run]');
    process.exit(1);
  }
  return { from, to, dryRun };
}

async function main() {
  const { from, to, dryRun } = parseArgs();

  const transactions = await prisma.savings_transactions.findMany({
    where: {
      upload_batch_id: null,
      created_at: { gte: new Date(from), lt: new Date(to) },
    },
  });

  if (transactions.length === 0) {
    console.log('No unbatched transactions found in the given window.');
    return;
  }

  const accountDeltas = new Map<bigint, number>();
  for (const t of transactions) {
    const amt = Number(t.amount);
    const current = accountDeltas.get(t.savings_account_id) ?? 0;
    const delta = t.transaction_type === 'withdrawal' ? -amt : amt;
    accountDeltas.set(t.savings_account_id, current + delta);
  }

  const journalCount = await prisma.journal_entries.count({
    where: {
      created_at: { gte: new Date(from), lt: new Date(to) },
      OR: [
        { description: { startsWith: 'Setor Simpanan' } },
        { description: { startsWith: 'Tarik Simpanan' } },
      ],
    },
  });

  console.log(`Window: ${from} → ${to}`);
  console.log(`Transactions to delete: ${transactions.length}`);
  console.log(`Journal entries to delete: ${journalCount}`);
  console.log(`Accounts to adjust: ${accountDeltas.size}`);

  if (dryRun) {
    console.log('Dry run — no changes made.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const [accountId, delta] of accountDeltas) {
      const acc = await tx.savings_accounts.findUnique({
        where: { id: accountId },
        select: { balance: true },
      });
      if (acc) {
        const newBalance = Math.max(0, Number(acc.balance ?? 0) - delta);
        await tx.savings_accounts.update({
          where: { id: accountId },
          data: { balance: newBalance },
        });
      }
    }

    await tx.journal_entries.deleteMany({
      where: {
        created_at: { gte: new Date(from), lt: new Date(to) },
        OR: [
          { description: { startsWith: 'Setor Simpanan' } },
          { description: { startsWith: 'Tarik Simpanan' } },
        ],
      },
    });

    await tx.savings_transactions.deleteMany({
      where: {
        id: { in: transactions.map((t) => t.id) },
      },
    });
  });

  console.log('Done. Upload reversed successfully.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
