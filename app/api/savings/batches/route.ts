import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

const VALID_BATCH_TYPES = ['deposit', 'sukarela_reduction'] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const roles = (session?.user as any)?.roles || [];
    const canView =
      session &&
      (hasPermission(roles, PERMISSIONS.SAVINGS_DEPOSIT) ||
        hasPermission(roles, PERMISSIONS.SAVINGS_WITHDRAW));
    if (!canView) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const typeParam = request.nextUrl.searchParams.get('type');
    const batchType =
      typeParam && VALID_BATCH_TYPES.includes(typeParam as (typeof VALID_BATCH_TYPES)[number])
        ? typeParam
        : undefined;

    const batchesModel = (prisma as any).savings_upload_batches;
    if (!batchesModel) {
      return NextResponse.json({ batches: [] });
    }

    const batches = await batchesModel.findMany({
      where: batchType ? { batch_type: batchType } : undefined,
      orderBy: { uploaded_at: 'desc' },
      include: {
        _count: { select: { savings_transactions: true } },
      },
    });

    const list = batches.map((b: any) => ({
      id: Number(b.id),
      filename: b.filename,
      batchType: b.batch_type ?? 'deposit',
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
