import { NextRequest, NextResponse } from 'next/server';
import { POSService } from '@/lib/services/pos-service';
import { requireAnggotaSession } from '@/lib/auth/require-anggota';

export async function GET(request: NextRequest) {
  const authResult = await requireAnggotaSession();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const warehouseId = searchParams.get('warehouse_id');
    const q = searchParams.get('q') || '';
    const categoryId = searchParams.get('category_id')
      ? parseInt(searchParams.get('category_id')!)
      : undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!warehouseId) {
      return NextResponse.json(
        { error: 'warehouse_id required' },
        { status: 400 }
      );
    }

    const products = await POSService.searchProducts(
      parseInt(warehouseId),
      q,
      limit,
      categoryId
    );
    return NextResponse.json(products);
  } catch (error: unknown) {
    console.error('POS public products:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
