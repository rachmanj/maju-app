import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { OrderService } from '@/lib/services/order-service';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id);
    const order = await prisma.member_orders.findFirst({
      where: { id: orderId, member_id: memberId },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const detail = await OrderService.getOrder(orderId);
    return NextResponse.json(detail);
  } catch (error: any) {
    console.error('Member portal order detail:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load order' },
      { status: 500 }
    );
  }
}
