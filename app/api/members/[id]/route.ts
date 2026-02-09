import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MemberService } from '@/lib/services/member-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = await MemberService.getMemberById(parseInt(id));
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error: any) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await MemberService.updateMember(
      parseInt(id),
      body,
      parseInt(session.user.id)
    );

    return NextResponse.json({ message: 'Member updated successfully' });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member' },
      { status: 500 }
    );
  }
}
