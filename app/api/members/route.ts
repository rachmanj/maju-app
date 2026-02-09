import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MemberService } from '@/lib/services/member-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const result = await MemberService.listMembers({ page, limit, search, status });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_CREATE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const memberId = await MemberService.createMember({
      ...body,
      created_by: parseInt(session.user.id),
    });

    return NextResponse.json({ id: memberId, message: 'Member created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create member' },
      { status: 500 }
    );
  }
}
