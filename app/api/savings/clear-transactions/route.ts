import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_CONFIGURE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({
      message: 'Savings transactions cleared',
      deleted: { transactions: txCount, journalEntries: journalCount, accountsReset: accCount },
    });
  } catch (error: unknown) {
    console.error('Clear savings transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear transactions' },
      { status: 500 }
    );
  }
}
