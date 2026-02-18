import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MonitoringService } from '@/lib/services/monitoring-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.ADMIN_MONITORING)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const member_id = request.nextUrl.searchParams.get('member_id');
    const from_date = request.nextUrl.searchParams.get('from_date') ?? undefined;
    const to_date = request.nextUrl.searchParams.get('to_date') ?? undefined;
    const search = request.nextUrl.searchParams.get('search') ?? undefined;

    const result = await MonitoringService.getMemberActivityStats({
      page,
      limit,
      member_id: member_id ? parseInt(member_id) : undefined,
      from_date,
      to_date,
      search,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Member activity error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
