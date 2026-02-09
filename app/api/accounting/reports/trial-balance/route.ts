import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { ReportService } from '@/lib/services/report-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ACCOUNTING_REPORT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const toDate = searchParams.get('to_date') || new Date().toISOString().split('T')[0];

    const data = await ReportService.getTrialBalance(fromDate, toDate);
    return NextResponse.json({ from_date: fromDate, to_date: toDate, data });
  } catch (error: any) {
    console.error('Error generating trial balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate trial balance' },
      { status: 500 }
    );
  }
}
