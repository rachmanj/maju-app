import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const fromDate = sp.get('fromDate') || undefined;
    const toDate = sp.get('toDate') || undefined;
    const page = parseInt(sp.get('page') || '1');
    const limit = Math.min(parseInt(sp.get('limit') || '20'), 100);

    const result = await POSService.listTransactions({
      memberId,
      fromDate,
      toDate,
      page,
      limit,
    });

    return NextResponse.json({
      transactions: result.transactions.map((t) => ({
        ...t,
        transaction_date:
          t.transaction_date instanceof Date
            ? t.transaction_date.toISOString()
            : String(t.transaction_date),
      })),
      total: result.total,
    });
  } catch (error: unknown) {
    console.error('Member portal POS transactions:', error);
    const message = error instanceof Error ? error.message : 'Failed to load transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
