import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string[]> = {
  no_pinjaman: ['no pinjaman', 'loan number', 'nomor pinjaman', 'loan_number'],
  angsuran_ke: ['angsuran ke', 'angsuran', 'installment', 'installment number'],
  tanggal_pembayaran: ['tanggal pembayaran', 'tanggal', 'tgl', 'date', 'payment date'],
  jumlah_pembayaran: ['jumlah pembayaran', 'nominal', 'jumlah', 'amount', 'payment amount'],
  metode_pembayaran: ['metode pembayaran', 'metode', 'payment method'],
  referensi: ['referensi', 'reference', 'no ref', 'reference number'],
  catatan: ['catatan', 'notes'],
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

function resolvePaymentMethod(val: unknown): 'cash' | 'transfer' | 'savings' | 'salary_deduction' {
  const s = String(val ?? '').toLowerCase().trim();
  if (['transfer'].includes(s)) return 'transfer';
  if (['savings', 'simpanan', 'potong simpanan'].includes(s)) return 'savings';
  if (['salary_deduction', 'gaji', 'potong gaji'].includes(s)) return 'salary_deduction';
  return 'cash';
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_PAYMENT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const debitAccountIdStr = formData.get('debit_account_id') as string | null;
    const debitAccountId = debitAccountIdStr ? parseInt(debitAccountIdStr, 10) : undefined;
    const validDebitAccountId = debitAccountId && !isNaN(debitAccountId) ? debitAccountId : undefined;

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
    if (
      colMap.no_pinjaman === undefined ||
      colMap.angsuran_ke === undefined ||
      colMap.tanggal_pembayaran === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'Required columns not found. Expected: no pinjaman, angsuran ke, tanggal pembayaran. Optional: jumlah pembayaran (default: sisa angsuran), metode pembayaran, referensi, catatan',
        },
        { status: 400 }
      );
    }

    const results: { row: number; status: 'success' | 'error'; message?: string; paymentNumber?: string }[] = [];
    let successCount = 0;
    const createdBy = parseInt(session.user?.id ?? '0', 10);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const rowNum = i + 1;
      const loanNumber = String(row[colMap.no_pinjaman] ?? '').trim();
      const angsuranKe = Math.floor(parseAmount(row[colMap.angsuran_ke]));
      const tglVal = colMap.tanggal_pembayaran !== undefined ? row[colMap.tanggal_pembayaran] : null;
      const jumlahVal = colMap.jumlah_pembayaran !== undefined ? parseAmount(row[colMap.jumlah_pembayaran]) : 0;
      const metodeVal = colMap.metode_pembayaran !== undefined ? row[colMap.metode_pembayaran] : 'cash';
      const referensiVal = colMap.referensi !== undefined ? row[colMap.referensi] : null;
      const catatanVal = colMap.catatan !== undefined ? row[colMap.catatan] : null;

      const isEmptyRow = !loanNumber && angsuranKe <= 0 && !tglVal && jumlahVal <= 0;
      if (isEmptyRow) continue;

      if (!loanNumber) {
        results.push({ row: rowNum, status: 'error', message: 'No. pinjaman kosong' });
        continue;
      }

      if (angsuranKe <= 0) {
        results.push({ row: rowNum, status: 'error', message: 'Angsuran ke harus lebih dari 0' });
        continue;
      }

      const paymentDate = parseDate(tglVal);
      if (!paymentDate) {
        results.push({ row: rowNum, status: 'error', message: 'Tanggal pembayaran tidak valid' });
        continue;
      }

      const loan = await prisma.loans.findUnique({
        where: { loan_number: loanNumber },
        select: { id: true, status: true },
      });

      if (!loan) {
        results.push({ row: rowNum, status: 'error', message: `Pinjaman tidak ditemukan: ${loanNumber}` });
        continue;
      }

      if (loan.status !== 'active' && loan.status !== 'approved') {
        results.push({ row: rowNum, status: 'error', message: 'Pinjaman tidak aktif' });
        continue;
      }

      const schedule = await prisma.loan_schedules.findFirst({
        where: {
          loan_id: loan.id,
          installment_number: angsuranKe,
        },
        select: {
          id: true,
          status: true,
          principal_amount: true,
          interest_amount: true,
          installment_amount: true,
          paid_amount: true,
        },
      });

      if (!schedule) {
        results.push({ row: rowNum, status: 'error', message: `Angsuran ke-${angsuranKe} tidak ditemukan` });
        continue;
      }

      if (schedule.status === 'paid') {
        results.push({ row: rowNum, status: 'error', message: `Angsuran ke-${angsuranKe} sudah dibayar` });
        continue;
      }

      const remaining = Number(schedule.installment_amount) - Number(schedule.paid_amount ?? 0);
      const paymentAmount = jumlahVal > 0 ? jumlahVal : remaining;
      if (paymentAmount <= 0) {
        results.push({ row: rowNum, status: 'error', message: 'Jumlah pembayaran harus lebih dari 0' });
        continue;
      }

      const principalAmount = Number(schedule.principal_amount);
      const interestAmount = Number(schedule.interest_amount);
      const paymentMethod = resolvePaymentMethod(metodeVal);
      const referenceNumber = referensiVal != null ? String(referensiVal).trim() || undefined : undefined;
      const notes = catatanVal != null ? String(catatanVal).trim() || undefined : undefined;

      try {
        const paymentId = await LoanService.recordPayment({
          loan_id: Number(loan.id),
          loan_schedule_id: Number(schedule.id),
          payment_amount: paymentAmount,
          principal_amount: principalAmount,
          interest_amount: interestAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes,
          created_by: createdBy,
          debitAccountId: validDebitAccountId,
        });

        const payment = await prisma.loan_payments.findUnique({
          where: { id: paymentId },
          select: { payment_number: true },
        });
        results.push({
          row: rowNum,
          status: 'success',
          paymentNumber: payment?.payment_number ?? undefined,
        });
        successCount++;
      } catch (err) {
        results.push({
          row: rowNum,
          status: 'error',
          message: err instanceof Error ? err.message : 'Gagal mencatat pembayaran',
        });
      }
    }

    return NextResponse.json({
      successCount,
      failedCount: results.filter((r) => r.status === 'error').length,
      results,
      message: `Import selesai: ${successCount} berhasil, ${results.filter((r) => r.status === 'error').length} gagal`,
    });
  } catch (error: unknown) {
    console.error('Loan payment upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
