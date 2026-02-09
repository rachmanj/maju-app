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

    const warehouseId = request.nextUrl.searchParams.get('warehouseId');
    const q = request.nextUrl.searchParams.get('q') || '';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    if (!warehouseId) {
      return NextResponse.json({ error: 'warehouseId required' }, { status: 400 });
    }

    const products = await POSService.searchProducts(parseInt(warehouseId), q, limit);
    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error searching POS products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search products' },
      { status: 500 }
    );
  }
}
