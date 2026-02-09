import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { OrderService } from '@/lib/services/order-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId') || undefined;
    const status = searchParams.get('status') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await OrderService.listOrders({
      memberId: memberId ? parseInt(memberId) : undefined,
      status,
      fromDate,
      toDate,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, warehouseId, items, notes } = body;

    if (!memberId || !warehouseId || !items) {
      return NextResponse.json(
        { error: 'memberId, warehouseId, items required' },
        { status: 400 }
      );
    }

    const result = await OrderService.createOrder({
      memberId: parseInt(memberId),
      warehouseId: parseInt(warehouseId),
      items: items.map((i: { product_id: number; quantity: number; unit_id: number; unit_price: number }) => ({
        product_id: parseInt(String(i.product_id)),
        quantity: parseFloat(String(i.quantity)),
        unit_id: parseInt(String(i.unit_id)),
        unit_price: parseFloat(String(i.unit_price)),
      })),
      notes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
