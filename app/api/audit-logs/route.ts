import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { AuditService } from '@/lib/services/audit-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.ADMIN_AUDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const user_id = request.nextUrl.searchParams.get('user_id');
    const entity_type = request.nextUrl.searchParams.get('entity_type');
    const action = request.nextUrl.searchParams.get('action');
    const from_date = request.nextUrl.searchParams.get('from_date') ?? undefined;
    const to_date = request.nextUrl.searchParams.get('to_date') ?? undefined;

    const result = await AuditService.listLogs({
      page,
      limit,
      user_id: user_id ? parseInt(user_id) : undefined,
      entity_type: entity_type ?? undefined,
      action: action ?? undefined,
      from_date,
      to_date,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Audit logs list:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
