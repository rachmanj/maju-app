import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_PAYMENT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.chart_of_accounts.findMany({
      where: {
        is_active: true,
        account_type: 'asset',
        code: { in: ['1010', '1020', '1030', '1031', '1032'] },
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(accounts);
  } catch (error: unknown) {
    console.error('List loan payment debit accounts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list accounts' },
      { status: 500 }
    );
  }
}
