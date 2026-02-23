import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_CONFIGURE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idParam = (await params).id;
    const idNum = parseInt(idParam, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }
    const id = BigInt(idNum);

    const batch = await prisma.savings_upload_batches.findUnique({
      where: { id },
      include: { savings_transactions: true },
    });
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const txIds = batch.savings_transactions.map((t) => t.id);
    const journalCount = await prisma.journal_entries.count({
      where: { reference_type: 'savings_upload_batch', reference_id: id },
    });
    const accountDeltas = new Map<bigint, number>();
    for (const t of batch.savings_transactions) {
      const amt = Number(t.amount);
      const current = accountDeltas.get(t.savings_account_id) ?? 0;
      accountDeltas.set(t.savings_account_id, current + amt);
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
          reference_type: 'savings_upload_batch',
          reference_id: id,
        },
      });
      await tx.savings_transactions.deleteMany({
        where: { upload_batch_id: id },
      });
      await tx.savings_upload_batches.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: 'Batch deleted',
      deleted: {
        transactions: txIds.length,
        journalEntries: journalCount,
        accountsAdjusted: accountDeltas.size,
      },
    });
  } catch (error: unknown) {
    console.error('Delete savings batch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete batch' },
      { status: 500 }
    );
  }
}
