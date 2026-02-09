import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MemberService } from '@/lib/services/member-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_APPROVE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await MemberService.approveMember(
      parseInt(id),
      parseInt(session.user.id)
    );

    return NextResponse.json({ message: 'Member approved successfully' });
  } catch (error: any) {
    console.error('Error approving member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve member' },
      { status: 500 }
    );
  }
}
