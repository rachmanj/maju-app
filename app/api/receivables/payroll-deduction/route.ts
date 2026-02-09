import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ReceivablesService } from '@/lib/services/receivables-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ACCOUNTING_REPORT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(request.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1));

    const result = await ReceivablesService.getPayrollDeductionData(year, month);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching payroll deduction data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payroll deduction data' },
      { status: 500 }
    );
  }
}
