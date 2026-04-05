import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

function loanStatusLabel(status: string | null | undefined): string {
  const m: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    active: 'Aktif',
    completed: 'Lunas',
    defaulted: 'Macet',
    disbursed: 'Cair',
  };
  if (!status) return '';
  return m[status] ?? status;
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('id-ID');
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const member_search = sp.get('q') || sp.get('member_search') || undefined;
    const project_id_raw = sp.get('project_id');
    const project_id =
      project_id_raw != null && project_id_raw !== '' ? parseInt(project_id_raw, 10) : undefined;

    const { detail, byMember } = await LoanService.listLoanBalanceExport({
      member_search: member_search ?? undefined,
      project_id: project_id != null && !isNaN(project_id) ? project_id : undefined,
    });

    const detailHeader = [
      'Nomor Anggota',
      'Nama Anggota',
      'NIK',
      'Kode Proyek',
      'Nama Proyek',
      'No. Pinjaman',
      'Status Pinjaman',
      'Pokok Pinjaman',
      'Pokok Terbayar',
      'Sisa Pokok',
      'Bunga Terbayar',
      'Sisa Angsuran (Jadwal)',
      'Tanggal Disetujui',
      'Tanggal Pencairan',
    ];
    const detailRows = detail.map((r) => [
      r.member_number,
      r.member_name,
      r.member_nik ?? '',
      r.project_code ?? '',
      r.project_name ?? '',
      r.loan_number,
      loanStatusLabel(r.loan_status),
      r.principal_amount,
      r.principal_paid,
      r.principal_outstanding,
      r.interest_paid,
      r.remaining_schedule_amount,
      formatDate(r.approved_date),
      formatDate(r.disbursed_date),
    ]);

    const memberHeader = [
      'Nomor Anggota',
      'Nama Anggota',
      'NIK',
      'Kode Proyek',
      'Nama Proyek',
      'Jumlah Pinjaman',
      'Total Pokok Pinjaman',
      'Total Pokok Terbayar',
      'Total Sisa Pokok',
      'Total Sisa Angsuran (Jadwal)',
    ];
    const memberRows = byMember.map((r) => [
      r.member_number,
      r.member_name,
      r.member_nik ?? '',
      r.project_code ?? '',
      r.project_name ?? '',
      r.loan_count,
      r.total_principal,
      r.total_principal_paid,
      r.total_principal_outstanding,
      r.total_remaining_schedule,
    ]);

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Per Pinjaman');
    const ws2 = XLSX.utils.aoa_to_sheet([memberHeader, ...memberRows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Rekap Per Anggota');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fname = `saldo-pinjaman-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Loan balance export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
