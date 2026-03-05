import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batches = await prisma.product_upload_batches.findMany({
      orderBy: { uploaded_at: 'desc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    const list = batches.map((b) => ({
      id: Number(b.id),
      filename: b.filename,
      productCount: b.product_count,
      successCount: b.success_count,
      failedCount: b.failed_count,
      uploadedAt: b.uploaded_at,
      uploadedBy: b.uploaded_by != null ? Number(b.uploaded_by) : null,
      actualProductCount: b._count.products,
    }));

    return NextResponse.json({ batches: list });
  } catch (error: unknown) {
    console.error('List product batches error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list batches' },
      { status: 500 }
    );
  }
}
