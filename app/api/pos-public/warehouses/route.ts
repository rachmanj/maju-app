import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnggotaSession } from '@/lib/auth/require-anggota';

export async function GET() {
  const authResult = await requireAnggotaSession();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const rows = await prisma.warehouses.findMany({
      where: { is_active: true, deleted_at: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json(
      rows.map((r) => ({ id: Number(r.id), code: r.code, name: r.name }))
    );
  } catch (error: unknown) {
    console.error('POS public warehouses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
