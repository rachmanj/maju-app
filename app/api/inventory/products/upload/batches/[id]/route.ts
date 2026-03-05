import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idParam = (await params).id;
    const idNum = parseInt(idParam, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }
    const id = BigInt(idNum);

    const batch = await prisma.product_upload_batches.findUnique({
      where: { id },
      include: { products: { where: { deleted_at: null } } },
    });
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const productIds = batch.products.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      await tx.products.updateMany({
        where: { upload_batch_id: id, deleted_at: null },
        data: { deleted_at: new Date() },
      });
      await tx.product_upload_batches.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: 'Batch dihapus. Produk dalam batch telah dinonaktifkan.',
      deleted: {
        products: productIds.length,
      },
    });
  } catch (error: unknown) {
    console.error('Delete product batch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete batch' },
      { status: 500 }
    );
  }
}
