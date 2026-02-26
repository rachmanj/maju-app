import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headers = [
      'nomor anggota',
      'pokok',
      'sisa pokok',
      'bunga persen',
      'metode bunga',
      'tenor',
      'angsuran terakhir dibayar',
      'tanggal cair',
      'angsuran per bulan',
    ];
    const sampleModeA = ['19212', 6000000, '', 3.6, 'flat_total', 6, '', '2026-02-01', ''];
    const sampleModeB = ['19212', 6000000, 4000000, 3.6, 'flat_total', 6, 2, '2025-08-01', ''];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleModeA, sampleModeB]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pinjaman');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_pinjaman.xlsx"',
      },
    });
  } catch (error: unknown) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate template' },
      { status: 500 }
    );
  }
}
