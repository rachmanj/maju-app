import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headers = [
      'nomor anggota',
      'nama',
      'nik',
      'email',
      'telepon',
      'alamat',
      'jabatan',
      'proyek',
      'departemen',
      'tanggal bergabung',
    ];
    const sampleRow = [
      'MBR00000001',
      'Ahmad Budi',
      '3201234567890001',
      'ahmad@example.com',
      '08123456789',
      'Jl. Contoh No. 1',
      'Karyawan',
      '',
      '',
      '2026-01-01',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Anggota');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_anggota.xlsx"',
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
