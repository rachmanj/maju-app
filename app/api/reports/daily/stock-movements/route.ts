import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { DailyReportService } from '@/lib/services/daily-report-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles ?? [], PERMISSIONS.REPORT_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const date = request.nextUrl.searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'date (YYYY-MM-DD) required' }, { status: 400 });
    }
    const data = await DailyReportService.getStockMovementReport(date);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Daily stock movements report:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
