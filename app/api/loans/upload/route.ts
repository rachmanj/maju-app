import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string[]> = {
  nomor_anggota: ['nomor anggota', 'nik', 'no anggota', 'member_number'],
  pokok: ['pokok', 'principal', 'jumlah pinjaman', 'nominal'],
  sisa_pokok: ['sisa pokok', 'outstanding', 'saldo pokok'],
  bunga_persen: ['bunga persen', 'bunga %', 'bunga', 'interest rate', 'rate'],
  metode_bunga: ['metode bunga', 'metode', 'interest method', 'flat', 'flat_total', 'manual'],
  tenor: ['tenor', 'term', 'jangka waktu', 'bulan'],
  tanggal_cair: ['tanggal cair', 'disbursed date', 'tanggal disbursement', 'tgl cair'],
  angsuran_terakhir_dibayar: ['angsuran terakhir dibayar', 'angsuran dibayar', 'paid installments'],
  angsuran_per_bulan: ['angsuran per bulan', 'monthly amount', 'cicilan'],
};

function normalizeHeader(h: string): string {
  return String(h ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function findColumnIndex(headers: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  const normalized = headers.map(normalizeHeader);
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalized.findIndex((h) => h === alias || h.includes(alias));
      if (idx >= 0) {
        result[key] = idx;
        break;
      }
    }
  }
  return result;
}

function parseAmount(val: unknown): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: unknown): Date | null {
  if (val == null || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number' && val > 0) {
    return new Date((val - 25569) * 86400000);
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function resolveInterestMethod(val: unknown): 'flat' | 'flat_total' | 'manual' | null {
  const s = String(val ?? '').toLowerCase().trim();
  if (s === 'flat') return 'flat';
  if (['flat_total', 'flat total', 'flattotal'].includes(s)) return 'flat_total';
  if (s === 'manual') return 'manual';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_CREATE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      return NextResponse.json({ error: 'File must have header row and at least one data row' }, { status: 400 });
    }

    const headers = rows[0] as string[];
    const colMap = findColumnIndex(headers);
    if (colMap.nomor_anggota === undefined || colMap.pokok === undefined || colMap.tenor === undefined) {
      return NextResponse.json(
        {
          error:
            'Required columns not found. Expected: nomor anggota, pokok, tenor. Optional: sisa pokok, angsuran terakhir dibayar, bunga persen, metode bunga, tanggal cair, angsuran per bulan (untuk manual)',
        },
        { status: 400 }
      );
    }

    const results: { row: number; status: 'success' | 'error'; message?: string; loanNumber?: string }[] = [];
    let successCount = 0;
    const createdBy = parseInt(session.user?.id ?? '0', 10);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const rowNum = i + 1;
      const memberId = String(row[colMap.nomor_anggota] ?? '').trim();
      const pokok = parseAmount(row[colMap.pokok]);
      const tenor = Math.floor(parseAmount(row[colMap.tenor]));

      const isEmptyRow = !memberId && pokok <= 0 && tenor <= 0;
      if (isEmptyRow) continue;

      const sisaPokokVal = colMap.sisa_pokok !== undefined ? parseAmount(row[colMap.sisa_pokok]) : 0;
      const angsuranDibayarVal = colMap.angsuran_terakhir_dibayar !== undefined
        ? Math.floor(parseAmount(row[colMap.angsuran_terakhir_dibayar]))
        : 0;
      const bungaVal = colMap.bunga_persen !== undefined ? parseAmount(row[colMap.bunga_persen]) : 0;
      const metodeVal = colMap.metode_bunga !== undefined ? row[colMap.metode_bunga] : 'flat_total';
      const tglCairVal = colMap.tanggal_cair !== undefined ? row[colMap.tanggal_cair] : null;
      const angsuranBulanVal = colMap.angsuran_per_bulan !== undefined ? parseAmount(row[colMap.angsuran_per_bulan]) : 0;

      if (!memberId) {
        results.push({ row: rowNum, status: 'error', message: 'Nomor anggota kosong' });
        continue;
      }

      if (pokok <= 0) {
        results.push({ row: rowNum, status: 'error', message: 'Pokok harus lebih dari 0' });
        continue;
      }

      if (tenor <= 0) {
        results.push({ row: rowNum, status: 'error', message: 'Tenor harus lebih dari 0' });
        continue;
      }

      const interestMethod = resolveInterestMethod(metodeVal) ?? 'flat_total';
      if (interestMethod === 'manual' && angsuranBulanVal <= 0) {
        results.push({ row: rowNum, status: 'error', message: 'Metode manual memerlukan angsuran per bulan' });
        continue;
      }

      const disbursedDate = parseDate(tglCairVal) ?? new Date();
      const sisaPokok = sisaPokokVal > 0 ? sisaPokokVal : undefined;
      const angsuranTerakhirDibayar = angsuranDibayarVal > 0 ? angsuranDibayarVal : undefined;

      if (sisaPokok != null && angsuranTerakhirDibayar != null) {
        if (angsuranTerakhirDibayar >= tenor) {
          results.push({ row: rowNum, status: 'error', message: 'Angsuran terakhir dibayar harus kurang dari tenor' });
          continue;
        }
        if (sisaPokok >= pokok) {
          results.push({ row: rowNum, status: 'error', message: 'Sisa pokok harus kurang dari pokok' });
          continue;
        }
      }

      try {
        const result = await LoanService.importLoanFromExcelRow({
          memberIdentifier: memberId,
          principalAmount: pokok,
          interestRate: bungaVal,
          interestMethod,
          termMonths: tenor,
          disbursedDate,
          monthlyAmount: interestMethod === 'manual' ? angsuranBulanVal : undefined,
          sisaPokok,
          angsuranTerakhirDibayar,
          createdBy,
        });
        results.push({ row: rowNum, status: 'success', loanNumber: result.loanNumber });
        successCount++;
      } catch (err) {
        results.push({
          row: rowNum,
          status: 'error',
          message: err instanceof Error ? err.message : 'Gagal import',
        });
      }
    }

    return NextResponse.json({
      successCount,
      failedCount: results.filter((r) => r.status === 'error').length,
      results,
      message: `Import selesai: ${successCount} berhasil, ${results.length - successCount} gagal`,
    });
  } catch (error: unknown) {
    console.error('Loan upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
