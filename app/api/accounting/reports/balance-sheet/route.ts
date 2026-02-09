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
    const asOfDate = request.nextUrl.searchParams.get('as_of_date');
    if (!asOfDate) {
      return NextResponse.json({ error: 'as_of_date (YYYY-MM-DD) required' }, { status: 400 });
    }
    const data = await ReportService.getBalanceSheet(asOfDate);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Balance sheet:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
