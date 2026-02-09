import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ReceivablesService } from '@/lib/services/receivables-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ACCOUNTING_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId') || undefined;
    const status = searchParams.get('status') as 'pending' | 'paid' | undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await ReceivablesService.listReceivables({
      memberId: memberId ? parseInt(memberId) : undefined,
      status,
      year,
      month,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching receivables:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch receivables' },
      { status: 500 }
    );
  }
}
