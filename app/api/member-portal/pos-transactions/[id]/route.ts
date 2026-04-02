import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const transactionId = parseInt(id, 10);
    if (!Number.isFinite(transactionId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const detail = await POSService.getMemberTransactionDetail(memberId, transactionId);
    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error: unknown) {
    console.error('Member portal POS transaction detail:', error);
    const message = error instanceof Error ? error.message : 'Failed to load transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
