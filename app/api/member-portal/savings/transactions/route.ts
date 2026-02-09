import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    if (!accountId) {
      const accounts = await SavingsService.getMemberSavingsAccounts(memberId);
      const allTx: { id: number; account_id: number; type: string; amount: number; date: Date; balance_after: number; savings_type_name?: string }[] = [];
      for (const acc of accounts) {
        const { transactions } = await SavingsService.getTransactionHistory(acc.id, 1, 50);
        for (const t of transactions) {
          allTx.push({
            id: (t as any).id,
            account_id: acc.id,
            type: (t as any).transaction_type,
            amount: Number((t as any).amount),
            date: (t as any).transaction_date,
            balance_after: Number((t as any).balance_after),
            savings_type_name: (acc as any).savings_type_name,
          });
        }
      }
      allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const start = (page - 1) * limit;
      const paginated = allTx.slice(start, start + limit);
      return NextResponse.json({ transactions: paginated, total: allTx.length });
    }

    const accId = parseInt(accountId);
    const account = await prisma.savings_accounts.findFirst({
      where: { id: accId, member_id: memberId },
    });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const { transactions, total } = await SavingsService.getTransactionHistory(accId, page, limit);
    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: (t as any).id,
        type: (t as any).transaction_type,
        amount: Number((t as any).amount),
        date: (t as any).transaction_date,
        balance_before: Number((t as any).balance_before),
        balance_after: Number((t as any).balance_after),
        notes: (t as any).notes,
      })),
      total,
    });
  } catch (error: any) {
    console.error('Member portal savings transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load transactions' },
      { status: 500 }
    );
  }
}
