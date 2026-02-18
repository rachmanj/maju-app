import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MonitoringService } from '@/lib/services/monitoring-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.ADMIN_MONITORING)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const users = await MonitoringService.getOnlineUsers();
    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('Online users error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
