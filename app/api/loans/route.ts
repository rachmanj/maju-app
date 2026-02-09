import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.LOAN_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const member_id = searchParams.get('member_id') ? parseInt(searchParams.get('member_id')!) : undefined;
    const status = searchParams.get('status') || undefined;

    const result = await LoanService.listLoans({ page, limit, member_id, status });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.LOAN_CREATE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const applicationId = await LoanService.createApplication(body);
    return NextResponse.json({ id: applicationId, message: 'Loan application created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating loan application:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create loan application' },
      { status: 500 }
    );
  }
}
