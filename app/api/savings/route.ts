import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('member_id');

    if (memberId) {
      const accounts = await SavingsService.getMemberSavingsAccounts(parseInt(memberId));
      return NextResponse.json(accounts);
    }

    const types = await SavingsService.getSavingsTypes();
    return NextResponse.json(types);
  } catch (error: any) {
    console.error('Error fetching savings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch savings' },
      { status: 500 }
    );
  }
}
