import { NextResponse } from 'next/server';
import { POSService } from '@/lib/services/pos-service';
import { requireAnggotaSession } from '@/lib/auth/require-anggota';

export async function GET() {
  const authResult = await requireAnggotaSession();
  if (authResult instanceof NextResponse) return authResult;

  const { session, memberId } = authResult;
  const userId = parseInt(session?.user?.id ?? '0');

  try {
    const sessionId = await POSService.getOrCreateSelfServiceSession(userId);
    return NextResponse.json({ sessionId });
  } catch (error: unknown) {
    console.error('POS public session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
