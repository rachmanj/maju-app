import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_USERS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = await prisma.roles.findMany({
      where: { deleted_at: null },
      select: { id: true, code: true, name: true, description: true },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(roles);
  } catch (error: unknown) {
    console.error('Error fetching roles:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch roles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
