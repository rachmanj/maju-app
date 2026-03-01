import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_PAYMENT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headers = [
      'no pinjaman',
      'angsuran ke',
      'tanggal pembayaran',
      'jumlah pembayaran',
      'metode pembayaran',
      'referensi',
      'catatan',
    ];
    const sample1 = ['LOAN2026000001', 1, '2025-02-22', 3500000, 'cash', '', ''];
    const sample2 = ['LOAN2026000001', 2, '2025-03-22', '', 'transfer', 'TRF-001', ''];

    const ws = XLSX.utils.aoa_to_sheet([headers, sample1, sample2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pembayaran');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_pembayaran_pinjaman.xlsx"',
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
