import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ACCOUNTING_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await prisma.chart_of_accounts.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true, account_type: true, parent_id: true },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error fetching chart of accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chart of accounts' },
      { status: 500 }
    );
  }
}
