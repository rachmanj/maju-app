import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { LoanService } from '@/lib/services/loan-service';
import { prisma } from '@/lib/db/prisma';
import type { Loan, SavingsAccount } from '@/types/database';

export async function GET() {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [member, accounts, recentTransactions, depositAggregates, withdrawalAggregate] = await Promise.all([
      prisma.members.findFirst({
        where: { id: memberId, deleted_at: null },
        select: {
          member_number: true,
          nik: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          job_title: true,
          joined_date: true,
          status: true,
          project: { select: { name: true, code: true } },
          department: { select: { name: true, code: true } },
        },
      }),
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
      prisma.savings_transactions.groupBy({
        by: ['savings_account_id'],
        where: {
          transaction_type: 'deposit',
          savings_account: { member_id: memberId },
        },
        _sum: { amount: true },
      }),
      prisma.savings_transactions.aggregate({
        where: {
          transaction_type: 'withdrawal',
          savings_account: { member_id: memberId },
        },
        _sum: { amount: true },
      }),
    ]);

    const accountTypeById = new Map(
      accounts.map((a: SavingsAccount & { savings_type_code?: string }) => [
        Number(a.id),
        a.savings_type_code ?? '',
      ])
    );
    const totalDepositsByType: Record<string, number> = {};
    for (const row of depositAggregates) {
      const code = accountTypeById.get(Number(row.savings_account_id));
      if (!code) continue;
      totalDepositsByType[code] = (totalDepositsByType[code] ?? 0) + Number(row._sum.amount ?? 0);
    }
    const totalWithdrawals = Number(withdrawalAggregate._sum.amount ?? 0);

    const totalSavings = accounts.reduce((sum: number, a: SavingsAccount) => sum + Number(a.balance), 0);
    const { loans } = await LoanService.listLoans({ member_id: memberId, limit: 100 });
    const outstandingLoans = loans.filter((l: Loan) =>
      ['approved', 'disbursed', 'active'].includes(l.status ?? '')
    );
    const totalOutstanding = outstandingLoans.reduce(
      (sum: number, l: Loan) => sum + (Number(l.principal_amount) ?? 0),
      0
    );

    const recent = recentTransactions.map((t: (typeof recentTransactions)[number]) => ({
      id: Number(t.id),
      type: t.transaction_type,
      amount: Number(t.amount),
      date: t.transaction_date,
      savings_type: (t.savings_account as any)?.savings_type?.name,
      savings_type_code: (t.savings_account as any)?.savings_type?.code,
    }));

    const memberInfo = member
      ? {
          member_number: member.member_number,
          nik: member.nik ?? null,
          name: member.name,
          email: member.email ?? null,
          phone: member.phone ?? null,
          address: member.address ?? null,
          job_title: member.job_title ?? null,
          joined_date: member.joined_date,
          status: member.status ?? null,
          project_name: member.project?.name ?? null,
          project_code: member.project?.code ?? null,
          department_name: member.department?.name ?? null,
          department_code: member.department?.code ?? null,
        }
      : null;

    return NextResponse.json({
      member: memberInfo,
      totalSavings,
      savingsByType: accounts.map((a: SavingsAccount & { savings_type_code?: string; savings_type_name?: string }) => ({
        code: a.savings_type_code,
        name: a.savings_type_name,
        balance: Number(a.balance),
        totalDeposits: totalDepositsByType[a.savings_type_code ?? ''] ?? 0,
      })),
      totalWithdrawals,
      totalOutstanding,
      activeLoansCount: outstandingLoans.length,
      recentTransactions: recent,
    });
  } catch (error: unknown) {
    console.error('Member portal dashboard:', error);
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
