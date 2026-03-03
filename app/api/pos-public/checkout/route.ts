import { NextRequest, NextResponse } from 'next/server';
import { POSService } from '@/lib/services/pos-service';
import { requireAnggotaSession } from '@/lib/auth/require-anggota';

export async function POST(request: NextRequest) {
  const authResult = await requireAnggotaSession();
  if (authResult instanceof NextResponse) return authResult;

  const { session, memberId } = authResult;
  const userId = parseInt(session?.user?.id ?? '0');

  try {
    const body = await request.json();
    const {
      sessionId,
      warehouseId,
      items,
      paymentMethod,
      pin,
      discountAmount,
    } = body;

    if (!sessionId || !warehouseId || !items || !paymentMethod) {
      return NextResponse.json(
        { error: 'sessionId, warehouseId, items, paymentMethod required' },
        { status: 400 }
      );
    }

    const result = await POSService.checkout({
      sessionId: parseInt(sessionId),
      memberId,
      warehouseId: parseInt(warehouseId),
      items: items.map(
        (i: {
          product_id: number;
          quantity: number;
          unit_id: number;
          unit_price: number;
        }) => ({
          product_id: parseInt(String(i.product_id)),
          quantity: parseFloat(String(i.quantity)),
          unit_id: parseInt(String(i.unit_id)),
          unit_price: parseFloat(String(i.unit_price)),
        })
      ),
      paymentMethod: paymentMethod as 'cash' | 'potong_gaji' | 'simpanan',
      pin,
      discountAmount:
        discountAmount != null ? parseFloat(discountAmount) : undefined,
      createdBy: userId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('POS public checkout:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Checkout failed',
      },
      { status: 500 }
    );
  }
}
