import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_USERS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const editingUserId = request.nextUrl.searchParams.get('editing_user_id');
    const assignedUsers = await prisma.users.findMany({
      where: { member_id: { not: null }, deleted_at: null },
      select: { id: true, member_id: true },
    });
    const assignedMemberIds = assignedUsers
      .filter((u) => !editingUserId || Number(u.id) !== parseInt(editingUserId))
      .map((u) => u.member_id)
      .filter(Boolean) as bigint[];

    const members = await prisma.members.findMany({
      where: {
        status: 'active',
        deleted_at: null,
        id: { notIn: assignedMemberIds },
      },
      select: { id: true, member_number: true, name: true, email: true },
      orderBy: { member_number: 'asc' },
    });

    return NextResponse.json(
      members.map((m) => ({
        id: Number(m.id),
        member_number: m.member_number,
        name: m.name,
        email: m.email,
      }))
    );
  } catch (error: unknown) {
    console.error('Error fetching members for user assign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
