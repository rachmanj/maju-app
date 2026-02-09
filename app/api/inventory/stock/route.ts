import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { StockService } from '@/lib/services/stock-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const warehouse_id = searchParams.get('warehouse_id');
    const product_id = searchParams.get('product_id');

    if (warehouse_id) {
      const stock = await StockService.getStockByWarehouse(parseInt(warehouse_id));
      return NextResponse.json(stock);
    }
    if (product_id) {
      const stock = await StockService.getStockByProduct(parseInt(product_id));
      return NextResponse.json(stock);
    }

    return NextResponse.json({ error: 'warehouse_id or product_id required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}
