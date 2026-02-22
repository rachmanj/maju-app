import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const member_id = searchParams.get('member_id') ? parseInt(searchParams.get('member_id')!) : undefined;
    const status = searchParams.get('status') || undefined;

    const result = await LoanService.listApplications({ page, limit, member_id, status });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching loan applications:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch applications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
