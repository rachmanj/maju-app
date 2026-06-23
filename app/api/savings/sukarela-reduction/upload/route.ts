import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { JournalService } from '@/lib/services/journal-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string[]> = {
  nomor_anggota: ['nomor anggota', 'nik', 'no anggota'],
  tanggal_transaksi: ['tanggal transaksi', 'tanggal', 'date', 'tgl'],
  amount: ['amount', 'nominal', 'jumlah', 'nilai'],
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

function isEmptyRow(row: string[]): boolean {
  return row.every((cell) => String(cell ?? '').trim() === '');
}

async function resolveMemberId(
  identifier: string,
  cache: Map<string, number | null>
): Promise<number | null> {
  const cached = cache.get(identifier);
  if (cached !== undefined) return cached;

  const member = await prisma.members.findFirst({
    where: {
      deleted_at: null,
      OR: [{ nik: identifier }, { member_number: identifier }],
    },
    select: { id: true },
  });
  const memberId = member ? Number(member.id) : null;
  cache.set(identifier, memberId);
  return memberId;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_WITHDRAW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    const creditAccountIdStr = formData.get('credit_account_id') as string | null;
    const creditAccountId = creditAccountIdStr ? parseInt(creditAccountIdStr, 10) : undefined;

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
    if (colMap.nomor_anggota === undefined || colMap.amount === undefined) {
      return NextResponse.json(
        {
          error: 'Required columns not found. Expected: nomor anggota, amount. Optional: tanggal transaksi',
        },
        { status: 400 }
      );
    }

    let batchId: number | undefined;
    let batch: { id: bigint } | null = null;
    const batchesModel = (prisma as any).savings_upload_batches;
    if (batchesModel) {
      try {
        batch = await batchesModel.create({
          data: {
            filename: file.name,
            batch_type: 'sukarela_reduction',
            transaction_count: rows.length - 1,
            success_count: 0,
            failed_count: 0,
            uploaded_by: session.user.id ? BigInt(session.user.id) : null,
          },
        });
        batchId = batch ? Number(batch.id) : undefined;
      } catch {
        batchId = undefined;
      }
    }

    const results: { row: number; status: 'success' | 'error'; message?: string }[] = [];
    let successCount = 0;
    const memberCache = new Map<string, number | null>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const rowNum = i + 1;

      if (isEmptyRow(row)) {
        continue;
      }

      const memberIdentifier = String(row[colMap.nomor_anggota] ?? '').trim();
      const amountVal = row[colMap.amount];
      const tglVal = colMap.tanggal_transaksi !== undefined ? row[colMap.tanggal_transaksi] : null;

      if (!memberIdentifier) {
        results.push({ row: rowNum, status: 'error', message: 'Nomor anggota kosong' });
        continue;
      }

      const amount = parseAmount(amountVal);
      if (amount <= 0) {
        results.push({ row: rowNum, status: 'error', message: 'Amount harus lebih dari 0' });
        continue;
      }

      const memberId = await resolveMemberId(memberIdentifier, memberCache);
      if (memberId == null) {
        results.push({ row: rowNum, status: 'error', message: `Anggota tidak ditemukan: ${memberIdentifier}` });
        continue;
      }

      const transactionDate = parseDate(tglVal) ?? new Date();

      try {
        const portions = await SavingsService.reduceSukarela(
          memberId,
          amount,
          transactionDate,
          undefined,
          'Pengurangan Sukarela via Excel',
          parseInt(session.user.id),
          batchId
        );

        for (const portion of portions) {
          try {
            await JournalService.createSavingsJournal({
              savingsTypeCode: portion.typeCode,
              amount: portion.amount,
              isDeposit: false,
              description: 'Pengurangan Sukarela via Excel',
              createdBy: parseInt(session.user.id),
              entryDate: transactionDate,
              uploadBatchId: batchId,
              debitAccountId: creditAccountId && !isNaN(creditAccountId) ? creditAccountId : undefined,
            });
          } catch (je) {
            console.warn('Auto-journal failed for sukarela reduction row', rowNum, portion.typeCode, je);
          }
        }

        successCount++;
        results.push({ row: rowNum, status: 'success' });
      } catch (e) {
        results.push({ row: rowNum, status: 'error', message: (e as Error).message });
      }
    }

    if (batch && batchesModel) {
      try {
        await batchesModel.update({
          where: { id: batch.id },
          data: { success_count: successCount, failed_count: results.length - successCount },
        });
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      message: `Import selesai: ${successCount} berhasil, ${results.length - successCount} gagal`,
      successCount,
      failedCount: results.length - successCount,
      batchId,
      results,
    });
  } catch (error: unknown) {
    console.error('Sukarela reduction upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
