import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { ReportService } from '@/lib/services/report-service';

function formatDateId(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID');
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.REPORT_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const fromDate = searchParams.get('from_date') || defaultFrom;
    const toDate = searchParams.get('to_date') || defaultTo;

    const data = await ReportService.getPayrollDeductionReport(fromDate, toDate);

    const header = [
      'No',
      'NIK',
      'Nama',
      'Simpanan Wajib',
      'Angsuran Pinjaman',
      'Belanja POS',
      'Total Potongan',
    ];
    const rows = (data.members || []).map((m, i) => [
      i + 1,
      m.nik,
      m.name,
      m.simpanan_wajib,
      m.loan_installment,
      m.pos_purchase,
      m.total,
    ]);

    const summary = data.summary;
    const summaryRows = summary
      ? [
          [],
          ['', '', 'Total', summary.total_simpanan_wajib, summary.total_loan_installment, summary.total_pos_purchase, summary.total],
        ]
      : [];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [`Laporan Potongan Gaji — ${formatDateId(fromDate)} s/d ${formatDateId(toDate)}`],
      [],
      header,
      ...rows,
      ...summaryRows,
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Potongan Gaji');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fname = `laporan-potongan-gaji-${fromDate}_${toDate}.xlsx`;
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Payroll deduction export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
