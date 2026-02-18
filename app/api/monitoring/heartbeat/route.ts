import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MonitoringService } from '@/lib/services/monitoring-service';
import { getRequestContext } from '@/lib/services/audit-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as { context?: string };
    const ctx = getRequestContext(request);
    await MonitoringService.upsertHeartbeat({
      user_id: parseInt(String(session.user.id)),
      ip_address: ctx.ip_address,
      context: body.context ?? (request.headers.get('referer')?.includes('/member') ? 'member_portal' : 'dashboard'),
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
