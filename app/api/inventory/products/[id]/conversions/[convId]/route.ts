import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ProductService } from '@/lib/services/product-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; convId: string }> }
) {
  try {
    const { convId } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await ProductService.deleteUnitConversion(parseInt(convId));
    return NextResponse.json({ message: 'Conversion deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete conversion' }, { status: 500 });
  }
}
