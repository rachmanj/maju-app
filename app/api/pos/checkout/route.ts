import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.POS_TRANSACTION)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionId,
      memberId,
      warehouseId,
      items,
      paymentMethod,
      pin,
      discountAmount,
    } = body;

    if (!sessionId || !memberId || !warehouseId || !items || !paymentMethod) {
      return NextResponse.json(
        { error: 'sessionId, memberId, warehouseId, items, paymentMethod required' },
        { status: 400 }
      );
    }

    const result = await POSService.checkout({
      sessionId: parseInt(sessionId),
      memberId: parseInt(memberId),
      warehouseId: parseInt(warehouseId),
      items: items.map((i: { product_id: number; quantity: number; unit_id: number; unit_price: number }) => ({
        product_id: parseInt(String(i.product_id)),
        quantity: parseFloat(String(i.quantity)),
        unit_id: parseInt(String(i.unit_id)),
        unit_price: parseFloat(String(i.unit_price)),
      })),
      paymentMethod: paymentMethod as 'cash' | 'potong_gaji' | 'simpanan',
      pin,
      discountAmount: discountAmount != null ? parseFloat(discountAmount) : undefined,
      createdBy: parseInt(session.user.id),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}
