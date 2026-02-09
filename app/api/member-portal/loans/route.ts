import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') || undefined;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const result = await LoanService.listLoans({
      member_id: memberId,
      status,
      page,
      limit,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Member portal loans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load loans' },
      { status: 500 }
    );
  }
}
