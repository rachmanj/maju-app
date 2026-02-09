import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { OrderService } from '@/lib/services/order-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await OrderService.cancelOrder(parseInt(id));
    return NextResponse.json({ message: 'Order cancelled' });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
