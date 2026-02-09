import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { LoanService } from '@/lib/services/loan-service';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [accounts, recentTransactions] = await Promise.all([
      SavingsService.getMemberSavingsAccounts(memberId),
      prisma.savings_transactions.findMany({
        where: {
          savings_account: { member_id: memberId },
        },
        orderBy: { transaction_date: 'desc' },
        take: 5,
        include: {
          savings_account: {
            include: { savings_type: { select: { code: true, name: true } } },
          },
        },
      }),
    ]);

    const totalSavings = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    const { loans } = await LoanService.listLoans({ member_id: memberId, limit: 100 });
    const outstandingLoans = loans.filter(
      (l) => ['approved', 'disbursed', 'active'].includes((l as { status?: string }).status ?? '')
    );
    const totalOutstanding = outstandingLoans.reduce(
      (sum, l) => sum + (Number((l as any).principal_amount) ?? 0),
      0
    );

    const recent = recentTransactions.map((t) => ({
      id: Number(t.id),
      type: t.transaction_type,
      amount: Number(t.amount),
      date: t.transaction_date,
      savings_type: (t.savings_account as any)?.savings_type?.name,
    }));

    return NextResponse.json({
      totalSavings,
      savingsByType: accounts.map((a) => ({
        code: (a as any).savings_type_code,
        name: (a as any).savings_type_name,
        balance: Number(a.balance),
      })),
      totalOutstanding,
      activeLoansCount: outstandingLoans.length,
      recentTransactions: recent,
    });
  } catch (error: any) {
    console.error('Member portal dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
