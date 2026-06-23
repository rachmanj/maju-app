import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { prisma } from '@/lib/db/prisma';
import type { SavingsTransaction } from '@/types/database';

const CATEGORY_TYPE_CODES: Record<string, string[]> = {
  sukarela: ['SUKARELA_REGULER', 'SUKARELA_SHU', 'SUKARELA'],
  pokok_wajib: ['POKOK', 'WAJIB'],
};

const DISPLAY_NAME_OVERRIDE: Record<string, string> = {
  SUKARELA_REGULER: 'Simpanan Sukarela',
};

function displaySavingsTypeName(code?: string | null, name?: string | null): string | undefined {
  if (!code) return name ?? undefined;
  return DISPLAY_NAME_OVERRIDE[code] ?? name ?? undefined;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');
    const category = request.nextUrl.searchParams.get('category') ?? 'sukarela';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    if (!accountId) {
      const typeCodes = CATEGORY_TYPE_CODES[category] ?? CATEGORY_TYPE_CODES.sukarela;
      const where = {
        savings_account: {
          member_id: BigInt(memberId),
          closed_date: null,
          savings_type: { code: { in: typeCodes } },
        },
      };

      const [transactions, total] = await Promise.all([
        prisma.savings_transactions.findMany({
          where,
          include: {
            savings_account: {
              include: { savings_type: { select: { code: true, name: true } } },
            },
          },
          orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.savings_transactions.count({ where }),
      ]);

      return NextResponse.json({
        transactions: transactions.map((t) => ({
          id: Number(t.id),
          account_id: Number(t.savings_account_id),
          type: t.transaction_type,
          amount: Number(t.amount),
          date: t.transaction_date,
          balance_after: Number(t.balance_after),
          savings_type_code: t.savings_account.savings_type.code,
          savings_type_name: displaySavingsTypeName(
            t.savings_account.savings_type.code,
            t.savings_account.savings_type.name
          ),
          notes: t.notes,
        })),
        total,
      });
    }

    const accId = parseInt(accountId);
    const account = await prisma.savings_accounts.findFirst({
      where: { id: accId, member_id: memberId },
      include: { savings_type: { select: { code: true, name: true } } },
    });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const { transactions, total } = await SavingsService.getTransactionHistory(accId, page, limit);
    return NextResponse.json({
      transactions: transactions.map((t: SavingsTransaction) => ({
        id: t.id,
        type: t.transaction_type,
        amount: Number(t.amount),
        date: t.transaction_date,
        balance_before: Number(t.balance_before),
        balance_after: Number(t.balance_after),
        savings_type_code: account.savings_type.code,
        savings_type_name: displaySavingsTypeName(account.savings_type.code, account.savings_type.name),
        notes: t.notes,
      })),
      total,
    });
  } catch (error: unknown) {
    console.error('Member portal savings transactions:', error);
    const message = error instanceof Error ? error.message : 'Failed to load transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
