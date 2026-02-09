import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ReportService } from '@/lib/services/report-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles ?? [], PERMISSIONS.ACCOUNTING_REPORT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const fromDate = request.nextUrl.searchParams.get('from_date');
    const toDate = request.nextUrl.searchParams.get('to_date');
    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'from_date and to_date (YYYY-MM-DD) required' }, { status: 400 });
    }
    const data = await ReportService.getProfitLoss(fromDate, toDate);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Profit loss:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
