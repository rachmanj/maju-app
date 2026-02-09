/**
 * Excel Data Migration Script
 *
 * Imports data from Excel files into the Koperasi Maju database.
 * Use after schema is applied (npm run migrate or prisma migrate deploy).
 *
 * Expected Excel format (sheet "Anggota"):
 * - Row 1: Headers (NIK, Nama, Email, Telepon, Alamat, TanggalBergabung)
 * - Row 2+: Data rows
 *
 * Usage:
 *   npx tsx scripts/migrate-excel-data.ts <path-to-file.xlsx> [--dry-run]
 *
 * Options:
 *   --dry-run  Log what would be imported without writing to DB
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as XLSX from 'xlsx';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url && typeof url === 'string' && url.startsWith('mysql://')) return url;
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '3306';
  const user = process.env.DB_USER ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database = process.env.DB_NAME ?? 'maju_app';
  return `mysql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getDatabaseUrl()),
});

interface MemberRow {
  NIK?: string;
  Nama?: string;
  Email?: string;
  Telepon?: string;
  Alamat?: string;
  TanggalBergabung?: string | number;
}

function parseSheet(filePath: string): MemberRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find((n) =>
    /anggota|member/i.test(n)
  ) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<MemberRow>(sheet, { defval: '' });
  return rows.filter((r) => r.NIK && String(r.NIK).trim());
}

async function importMembers(rows: MemberRow[], dryRun: boolean): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  const pokokType = await prisma.savings_types.findUnique({ where: { code: 'POKOK' } });
  if (!pokokType) {
    console.error('Savings type POKOK not found. Run seed first.');
    return { created: 0, skipped: 0 };
  }
  for (const row of rows) {
    const nik = String(row.NIK ?? '').trim();
    const name = String(row.Nama ?? '').trim();
    const email = (row.Email && String(row.Email).trim()) || null;
    const phone = (row.Telepon && String(row.Telepon).trim()) || null;
    const address = (row.Alamat && String(row.Alamat).trim()) || null;
    let joinedDate = new Date();
    if (row.TanggalBergabung) {
      const d = new Date(row.TanggalBergabung as string | number);
      if (!isNaN(d.getTime())) joinedDate = d;
    }
    const existing = await prisma.members.findFirst({
      where: { nik, deleted_at: null },
    });
    if (existing) {
      skipped++;
      if (!dryRun) continue;
      console.log(`Skip (exists): ${nik} ${name}`);
      continue;
    }
    if (dryRun) {
      console.log(`Would create: ${nik} ${name} ${email || '-'}`);
      created++;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const m = await tx.members.create({
        data: {
          nik,
          name: name || nik,
          email,
          phone,
          address,
          status: 'pending',
          joined_date: joinedDate,
        },
      });
      const memberId = Number(m.id);
      const barcode = `MBR${memberId.toString().padStart(8, '0')}`;
      await tx.member_barcodes.create({
        data: { member_id: m.id, barcode },
      });
      await tx.member_purchase_limits.create({
        data: { member_id: m.id, limit_amount: 0, effective_date: new Date() },
      });
      const accountNumber = `SAV${pokokType.id}${memberId.toString().padStart(8, '0')}`;
      await tx.savings_accounts.create({
        data: {
          member_id: m.id,
          savings_type_id: pokokType.id,
          account_number: accountNumber,
          balance: 0,
          opened_date: new Date(),
        },
      });
    });
    created++;
    console.log(`Created: ${nik} ${name}`);
  }
  return { created, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  if (!filePath) {
    console.error('Usage: npx tsx scripts/migrate-excel-data.ts <path-to-file.xlsx> [--dry-run]');
    process.exit(1);
  }
  console.log('Reading Excel:', filePath);
  const rows = parseSheet(filePath);
  console.log('Rows to process:', rows.length);
  if (rows.length === 0) {
    console.log('No data rows found. Ensure sheet has headers: NIK, Nama, Email, Telepon, Alamat, TanggalBergabung');
    process.exit(0);
  }
  if (dryRun) console.log('--- DRY RUN (no writes) ---');
  const { created, skipped } = await importMembers(rows, dryRun);
  console.log('Done. Created:', created, 'Skipped (existing):', skipped);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
