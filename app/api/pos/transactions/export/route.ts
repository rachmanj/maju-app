import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

function formatDateId(d: Date): string {
  const x = new Date(d);
  return x.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.POS_ACCESS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const { summary, detailLines } = await POSService.listTransactionsForExport({
      memberId: memberId ? parseInt(memberId, 10) : undefined,
      fromDate,
      toDate,
    });

    const summaryHeader = [
      'No',
      'Tanggal',
      'No. Transaksi',
      'ID Anggota',
      'No. Anggota',
      'Nama Anggota',
      'Kode Gudang',
      'Nama Gudang',
      'Subtotal',
      'Diskon',
      'Total',
      'Metode Pembayaran',
    ];
    const summaryRows = summary.map((r, i) => [
      i + 1,
      formatDateId(r.transaction_date),
      r.transaction_number,
      r.member_id,
      r.member_number ?? '',
      r.member_name,
      r.warehouse_code,
      r.warehouse_name,
      r.subtotal,
      r.discount_amount,
      r.total_amount,
      r.payment_methods,
    ]);

    const detailHeader = [
      'No. Transaksi',
      'Tanggal',
      'Nama Anggota',
      'Kode Produk',
      'Nama Produk',
      'Qty',
      'Satuan',
      'Harga Satuan',
      'Jumlah Baris',
    ];
    const detailRows = detailLines.map((r) => [
      r.transaction_number,
      formatDateId(r.transaction_date),
      r.member_name,
      r.product_code,
      r.product_name,
      r.quantity,
      r.unit_code,
      r.unit_price,
      r.line_total,
    ]);

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
    const ws2 = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Detail Barang');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fname = `laporan-pos-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}"`,
      },
    });
  } catch (error: unknown) {
    console.error('POS transactions export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
