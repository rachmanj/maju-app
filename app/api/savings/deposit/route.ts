import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { JournalService } from '@/lib/services/journal-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_DEPOSIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_id, amount, reference_number, notes } = body;

    if (!account_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    await SavingsService.deposit(
      account_id,
      amount,
      reference_number,
      notes,
      parseInt(session.user.id)
    );

    const account = await prisma.savings_accounts.findUnique({
      where: { id: account_id },
      select: { savings_type: { select: { code: true } } },
    });
    const typeCode = account?.savings_type?.code;
    if (typeCode) {
      try {
        await JournalService.createSavingsJournal({
          savingsTypeCode: typeCode,
          amount,
          isDeposit: true,
          referenceNumber: reference_number,
          description: notes,
          createdBy: parseInt(session.user.id),
        });
      } catch (je) {
        console.warn('Auto-journal failed for savings deposit:', je);
      }
    }

    return NextResponse.json({ message: 'Deposit successful' });
  } catch (error: any) {
    console.error('Error processing deposit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process deposit' },
      { status: 500 }
    );
  }
}
