import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  try {
    const { id, txId } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.MEMBER_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = parseInt(id, 10);
    const transactionId = parseInt(txId, 10);
    if (!Number.isFinite(memberId) || !Number.isFinite(transactionId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const detail = await POSService.getMemberTransactionDetail(memberId, transactionId);
    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error: unknown) {
    console.error('Member POS transaction detail:', error);
    const message = error instanceof Error ? error.message : 'Failed to load transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
