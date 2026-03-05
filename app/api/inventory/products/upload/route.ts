import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ProductService } from '@/lib/services/product-service';
import { ProductUnitService } from '@/lib/services/product-unit-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string[]> = {
  code: ['kode', 'code', 'kode produk', 'sku'],
  name: ['nama', 'name', 'nama produk'],
  unit: ['satuan', 'unit', 'satuan dasar'],
  category: ['kategori', 'category', 'kategori produk'],
  barcode: ['barcode'],
  description: ['deskripsi', 'description'],
  min_stock: ['min_stok', 'min stok', 'min_stock', 'stok minimum'],
  sales_price: ['harga_jual', 'harga jual', 'sales_price', 'harga'],
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

function trim(val: unknown): string | null {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  return s || null;
}

function parseNumber(val: unknown): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((n) => /produk|product/i.test(n)) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      return NextResponse.json(
        { error: 'File must have header row and at least one data row' },
        { status: 400 }
      );
    }

    const headers = rows[0] as string[];
    const colMap = findColumnIndex(headers);
    if (colMap.code === undefined || colMap.name === undefined) {
      return NextResponse.json(
        {
          error: 'Required columns not found. Expected: kode, nama, satuan. Optional: kategori, barcode, deskripsi, min_stok, harga_jual',
        },
        { status: 400 }
      );
    }

    const [categories, units, defaultBaseId] = await Promise.all([
      ProductService.getCategories(),
      ProductService.getUnits(),
      ProductUnitService.getDefaultBaseUnitId(),
    ]);
    const categoryByCode = new Map(categories.map((c) => [c.code.toUpperCase(), c.id]));
    const unitByCode = new Map(units.map((u) => [u.code.toUpperCase(), u.id]));

    const batch = await prisma.product_upload_batches.create({
      data: {
        filename: file.name,
        product_count: rows.length - 1,
        success_count: 0,
        failed_count: 0,
        uploaded_by: session.user.id ? BigInt(session.user.id) : null,
      },
    });
    const batchId = Number(batch.id);

    const results: { row: number; status: 'success' | 'error'; message?: string }[] = [];
    let successCount = 0;
    const createdBy = parseInt(session.user.id);
    const seenCodes = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const rowNum = i + 1;
      const codeRaw = trim(row[colMap.code]);
      const nameRaw = trim(row[colMap.name]);

      if (!codeRaw) {
        results.push({ row: rowNum, status: 'error', message: 'Kode produk kosong' });
        continue;
      }
      if (!nameRaw) {
        results.push({ row: rowNum, status: 'error', message: 'Nama produk kosong' });
        continue;
      }
      if (seenCodes.has(codeRaw.toUpperCase())) {
        results.push({ row: rowNum, status: 'error', message: `Kode duplikat dalam file: ${codeRaw}` });
        continue;
      }
      seenCodes.add(codeRaw.toUpperCase());

      const unitRaw = colMap.unit !== undefined ? trim(row[colMap.unit]) : null;
      let baseUnitId: number | undefined;
      if (unitRaw) {
        baseUnitId = unitByCode.get(unitRaw.toUpperCase());
        if (!baseUnitId) {
          results.push({ row: rowNum, status: 'error', message: `Satuan tidak valid: ${unitRaw}. Gunakan kode yang ada di Pengaturan > Satuan` });
          continue;
        }
      } else if (defaultBaseId) {
        baseUnitId = defaultBaseId;
      } else {
        results.push({ row: rowNum, status: 'error', message: 'Satuan wajib diisi atau atur satuan dasar default di Pengaturan' });
        continue;
      }

      const existing = await prisma.products.findFirst({
        where: { code: codeRaw, deleted_at: null },
        select: { id: true },
      });
      if (existing) {
        results.push({ row: rowNum, status: 'error', message: `Kode produk sudah terdaftar: ${codeRaw}` });
        continue;
      }

      const categoryRaw = colMap.category !== undefined ? trim(row[colMap.category]) : null;
      const categoryId = categoryRaw ? categoryByCode.get(categoryRaw.toUpperCase()) : undefined;

      try {
        await ProductService.create({
          code: codeRaw,
          name: nameRaw,
          barcode: colMap.barcode !== undefined ? trim(row[colMap.barcode]) ?? undefined : undefined,
          category_id: categoryId,
          base_unit_id: baseUnitId,
          description: colMap.description !== undefined ? trim(row[colMap.description]) ?? undefined : undefined,
          min_stock: colMap.min_stock !== undefined ? parseNumber(row[colMap.min_stock]) : 0,
          sales_price: colMap.sales_price !== undefined ? parseNumber(row[colMap.sales_price]) || undefined : undefined,
          created_by: createdBy,
          upload_batch_id: batchId,
        });
        successCount++;
        results.push({ row: rowNum, status: 'success' });
      } catch (e) {
        results.push({ row: rowNum, status: 'error', message: (e as Error).message });
      }
    }

    await prisma.product_upload_batches.update({
      where: { id: batch.id },
      data: { success_count: successCount, failed_count: results.length - successCount },
    });

    return NextResponse.json({
      message: `Import selesai: ${successCount} berhasil, ${results.length - successCount} gagal`,
      successCount,
      failedCount: results.length - successCount,
      batchId,
      results,
    });
  } catch (error: unknown) {
    console.error('Product upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
