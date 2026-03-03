import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MemberService } from '@/lib/services/member-service';

export async function GET() {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderLimit = await MemberService.getOrderLimit(memberId);
    return NextResponse.json({ order_limit: orderLimit });
  } catch (error: unknown) {
    console.error('Order limit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memuat batas pemesanan' },
      { status: 500 }
    );
  }
}
