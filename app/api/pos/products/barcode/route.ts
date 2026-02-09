import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.POS_ACCESS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const barcode = request.nextUrl.searchParams.get('barcode');
    const warehouseId = request.nextUrl.searchParams.get('warehouseId');

    if (!barcode || !warehouseId) {
      return NextResponse.json({ error: 'barcode and warehouseId required' }, { status: 400 });
    }

    const product = await POSService.lookupProductByBarcode(barcode, parseInt(warehouseId));
    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Error looking up product by barcode:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lookup product' },
      { status: 500 }
    );
  }
}
