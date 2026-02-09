import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { OrderService } from '@/lib/services/order-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') || undefined;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const result = await OrderService.listOrders({
      memberId,
      status,
      page,
      limit,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Member portal orders:', error);
    const message = error instanceof Error ? error.message : 'Failed to load orders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { warehouseId, items, notes } = body;

    if (!warehouseId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'warehouseId and items (array) required' },
        { status: 400 }
      );
    }

    const result = await OrderService.createOrder({
      memberId,
      warehouseId: parseInt(String(warehouseId)),
      items: items.map((i: { product_id: number; quantity: number; unit_id: number; unit_price: number }) => ({
        product_id: parseInt(String(i.product_id)),
        quantity: parseFloat(String(i.quantity)),
        unit_id: parseInt(String(i.unit_id)),
        unit_price: parseFloat(String(i.unit_price)),
      })),
      notes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error('Member portal create order:', error);
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
