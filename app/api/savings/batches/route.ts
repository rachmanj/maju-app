import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_DEPOSIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batchesModel = (prisma as any).savings_upload_batches;
    if (!batchesModel) {
      return NextResponse.json({ batches: [] });
    }

    const batches = await batchesModel.findMany({
      orderBy: { uploaded_at: 'desc' },
      include: {
        _count: { select: { savings_transactions: true } },
      },
    });

    const list = batches.map((b: any) => ({
      id: Number(b.id),
      filename: b.filename,
      transactionCount: b.transaction_count,
      successCount: b.success_count,
      failedCount: b.failed_count,
      uploadedAt: b.uploaded_at,
      uploadedBy: b.uploaded_by != null ? Number(b.uploaded_by) : null,
      actualTransactionCount: b._count.savings_transactions,
    }));

    return NextResponse.json({ batches: list });
  } catch (error: unknown) {
    console.error('List savings batches error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list batches' },
      { status: 500 }
    );
  }
}
