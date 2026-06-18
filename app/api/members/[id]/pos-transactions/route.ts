import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.MEMBER_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = parseInt(id, 10);
    if (!Number.isFinite(memberId)) {
      return NextResponse.json({ error: 'Invalid member id' }, { status: 400 });
    }

    const sp = request.nextUrl.searchParams;
    const fromDate = sp.get('fromDate') || undefined;
    const toDate = sp.get('toDate') || undefined;
    const page = parseInt(sp.get('page') || '1');
    const limit = Math.min(parseInt(sp.get('limit') || '10'), 100);

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
    console.error('Member POS transactions:', error);
    const message = error instanceof Error ? error.message : 'Failed to load transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
