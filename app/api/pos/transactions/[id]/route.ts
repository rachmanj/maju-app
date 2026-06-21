import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.POS_DELETE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = parseInt((await params).id, 10);
    if (!Number.isFinite(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const detail = await POSService.getTransactionDetail(transactionId);
    if (!detail) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error: unknown) {
    console.error('POS transaction detail:', error);
    const message = error instanceof Error ? error.message : 'Failed to load transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.POS_DELETE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = parseInt((await params).id, 10);
    if (!Number.isFinite(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    await POSService.deleteTransaction(transactionId);

    return NextResponse.json({ message: 'Transaksi berhasil dihapus' });
  } catch (error: unknown) {
    console.error('POS transaction delete:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
