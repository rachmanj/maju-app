import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { JournalService } from '@/lib/services/journal-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string[]> = {
  nomor_anggota: ['nomor anggota', 'nik', 'no anggota', 'nomor anggota'],
  jenis_simpanan: ['jenis simpanan', 'jenis', 'type', 'tipe'],
  tanggal_transaksi: ['tanggal transaksi', 'tanggal', 'date', 'tgl'],
  nominal: ['nominal', 'jumlah', 'amount', 'nilai'],
  keterangan: ['keterangan', 'notes', 'catatan'],
  referensi: ['referensi', 'reference', 'no ref', 'no referensi'],
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

function resolveSavingsTypeCode(val: unknown): string | null {
  const s = String(val ?? '').toUpperCase().trim();
  if (['POKOK', 'WAJIB', 'SUKARELA'].includes(s)) return s;
  const map: Record<string, string> = {
    'SIMPANAN POKOK': 'POKOK',
    'SIMPANAN WAJIB': 'WAJIB',
    'SIMPANAN SUKARELA': 'SUKARELA',
    POKOK: 'POKOK',
    WAJIB: 'WAJIB',
    SUKARELA: 'SUKARELA',
  };
  return map[s] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_DEPOSIT)) {
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
    if (colMap.nomor_anggota === undefined || colMap.jenis_simpanan === undefined || colMap.nominal === undefined) {
      return NextResponse.json(
        {
          error: 'Required columns not found. Expected: nomor anggota, jenis simpanan, nominal. Optional: tanggal transaksi, keterangan, referensi',
        },
        { status: 400 }
      );
    }

    const savingsTypes = await prisma.savings_types.findMany();
    const typeByCode = Object.fromEntries(savingsTypes.map((t) => [t.code, t]));

    const results: { row: number; status: 'success' | 'error'; message?: string }[] = [];
    let successCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const rowNum = i + 1;
      const nik = String(row[colMap.nomor_anggota] ?? '').trim();
      const jenisVal = row[colMap.jenis_simpanan];
      const nominalVal = row[colMap.nominal];
      const tglVal = colMap.tanggal_transaksi !== undefined ? row[colMap.tanggal_transaksi] : null;
      const keteranganVal = colMap.keterangan !== undefined ? row[colMap.keterangan] : null;
      const referensiVal = colMap.referensi !== undefined ? row[colMap.referensi] : null;

      if (!nik) {
        results.push({ row: rowNum, status: 'error', message: 'Nomor anggota kosong' });
        continue;
      }

      const amount = parseAmount(nominalVal);
      if (amount <= 0) {
        results.push({ row: rowNum, status: 'error', message: 'Nominal harus lebih dari 0' });
        continue;
      }

      const typeCode = resolveSavingsTypeCode(jenisVal);
      if (!typeCode || !typeByCode[typeCode]) {
        results.push({ row: rowNum, status: 'error', message: `Jenis simpanan tidak valid: ${jenisVal}` });
        continue;
      }

      const member = await prisma.members.findFirst({
        where: { nik, deleted_at: null },
        select: { id: true },
      });
      if (!member) {
        results.push({ row: rowNum, status: 'error', message: `Anggota tidak ditemukan: ${nik}` });
        continue;
      }

      const typeId = typeByCode[typeCode].id;
      let account = await SavingsService.getSavingsAccount(Number(member.id), typeId);
      if (!account) {
        try {
          const accountId = await SavingsService.createSavingsAccount(Number(member.id), typeId, 0);
          account = await SavingsService.getSavingsAccount(Number(member.id), typeId);
        } catch (e) {
          results.push({ row: rowNum, status: 'error', message: `Gagal membuat rekening: ${(e as Error).message}` });
          continue;
        }
      }

      const transactionDate = parseDate(tglVal) ?? new Date();
      const notes = keteranganVal != null ? String(keteranganVal).trim() || undefined : undefined;
      const referenceNumber = referensiVal != null ? String(referensiVal).trim() || undefined : undefined;

      try {
        await SavingsService.deposit(
          account!.id,
          amount,
          referenceNumber,
          notes,
          parseInt(session.user.id),
          transactionDate
        );

        try {
          await JournalService.createSavingsJournal({
            savingsTypeCode: typeCode,
            amount,
            isDeposit: true,
            referenceNumber,
            description: notes,
            createdBy: parseInt(session.user.id),
            entryDate: transactionDate,
          });
        } catch (je) {
          console.warn('Auto-journal failed for savings upload row', rowNum, je);
        }

        successCount++;
        results.push({ row: rowNum, status: 'success' });
      } catch (e) {
        results.push({ row: rowNum, status: 'error', message: (e as Error).message });
      }
    }

    return NextResponse.json({
      message: `Import selesai: ${successCount} berhasil, ${results.length - successCount} gagal`,
      successCount,
      failedCount: results.length - successCount,
      results,
    });
  } catch (error: unknown) {
    console.error('Savings upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
