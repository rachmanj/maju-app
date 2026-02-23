import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MemberService } from '@/lib/services/member-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string[]> = {
  member_number: ['nomor anggota', 'nomor', 'member_number', 'no anggota'],
  name: ['nama', 'name', 'nama lengkap'],
  nik: ['nik', 'no ktp'],
  email: ['email'],
  phone: ['telepon', 'phone', 'hp', 'no telepon'],
  address: ['alamat', 'address'],
  job_title: ['jabatan', 'job_title', 'posisi'],
  project: ['proyek', 'project'],
  department: ['departemen', 'department'],
  joined_date: ['tanggal bergabung', 'joined_date', 'tgl bergabung', 'tanggal'],
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

function parseDate(val: unknown): Date | null {
  if (val == null || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number' && val > 0) {
    return new Date((val - 25569) * 86400000);
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function trim(val: unknown): string | null {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  return s || null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_CREATE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((n) => /anggota|member/i.test(n)) || workbook.SheetNames[0];
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
    if (colMap.member_number === undefined || colMap.name === undefined) {
      return NextResponse.json(
        {
          error: 'Required columns not found. Expected: nomor anggota, nama. Optional: nik, email, telepon, alamat, jabatan, proyek, departemen, tanggal bergabung',
        },
        { status: 400 }
      );
    }

    const [projects, departments] = await Promise.all([
      prisma.projects.findMany({ where: { deleted_at: null }, select: { id: true, code: true, name: true } }),
      prisma.departments.findMany({ where: { deleted_at: null }, select: { id: true, code: true, name: true } }),
    ]);
    const projectByCode = new Map(projects.flatMap((p) => [[p.code?.toUpperCase(), p.id], [p.name?.toUpperCase(), p.id]]));
    const projectByName = new Map(projects.map((p) => [p.name?.toLowerCase(), p.id]));
    const deptByCode = new Map(departments.flatMap((d) => [[d.code?.toUpperCase(), d.id], [d.name?.toUpperCase(), d.id]]));
    const deptByName = new Map(departments.map((d) => [d.name?.toLowerCase(), d.id]));

    const results: { row: number; status: 'success' | 'error'; message?: string }[] = [];
    let successCount = 0;
    const createdBy = parseInt(session.user.id);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const rowNum = i + 1;
      const memberNumberRaw = trim(row[colMap.member_number]);
      const nameRaw = trim(row[colMap.name]);

      if (!memberNumberRaw) {
        results.push({ row: rowNum, status: 'error', message: 'Nomor anggota kosong' });
        continue;
      }
      if (!nameRaw) {
        results.push({ row: rowNum, status: 'error', message: 'Nama kosong' });
        continue;
      }

      const existing = await prisma.members.findFirst({
        where: { member_number: memberNumberRaw, deleted_at: null },
        select: { id: true },
      });
      if (existing) {
        results.push({ row: rowNum, status: 'error', message: `Nomor anggota sudah terdaftar: ${memberNumberRaw}` });
        continue;
      }

      const nikRaw = colMap.nik !== undefined ? trim(row[colMap.nik]) : null;
      if (nikRaw) {
        const dupNik = await prisma.members.findFirst({
          where: { nik: nikRaw, deleted_at: null },
          select: { id: true },
        });
        if (dupNik) {
          results.push({ row: rowNum, status: 'error', message: `NIK sudah terdaftar: ${nikRaw}` });
          continue;
        }
      }

      const projectVal = colMap.project !== undefined ? trim(row[colMap.project]) : null;
      const departmentVal = colMap.department !== undefined ? trim(row[colMap.department]) : null;
      let projectId: number | undefined;
      let departmentId: number | undefined;
      if (projectVal) {
        projectId = projectByCode.get(projectVal.toUpperCase()) ?? projectByName.get(projectVal.toLowerCase());
      }
      if (departmentVal) {
        departmentId = deptByCode.get(departmentVal.toUpperCase()) ?? deptByName.get(departmentVal.toLowerCase());
      }

      const joinedDate = colMap.joined_date !== undefined
        ? parseDate(row[colMap.joined_date])
        : new Date();

      try {
        await MemberService.createMember({
          member_number: memberNumberRaw,
          nik: nikRaw ?? undefined,
          name: nameRaw,
          email: colMap.email !== undefined ? trim(row[colMap.email]) ?? undefined : undefined,
          phone: colMap.phone !== undefined ? trim(row[colMap.phone]) ?? undefined : undefined,
          address: colMap.address !== undefined ? trim(row[colMap.address]) ?? undefined : undefined,
          job_title: colMap.job_title !== undefined ? trim(row[colMap.job_title]) ?? undefined : undefined,
          project_id: projectId,
          department_id: departmentId,
          joined_date: joinedDate ?? new Date(),
          created_by: createdBy,
        });
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
    console.error('Members upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}
