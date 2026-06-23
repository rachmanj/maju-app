import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headers = ['nomor anggota', 'tanggal transaksi', 'amount'];
    const sampleRows = [
      ['3201234567890001', '2026-06-01', 500000],
      ['3201234567890001', '2026-06-15', 250000],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengurangan Sukarela');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_pengurangan_sukarela.xlsx"',
      },
    });
  } catch (error: unknown) {
    console.error('Sukarela reduction template generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate template' },
      { status: 500 }
    );
  }
}
