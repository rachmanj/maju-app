import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await prisma.warehouses.findMany({
      where: { is_active: true, deleted_at: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json(
      rows.map((r: (typeof rows)[number]) => ({ id: Number(r.id), code: r.code, name: r.name }))
    );
  } catch (error: unknown) {
    console.error('Member portal warehouses:', error);
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
