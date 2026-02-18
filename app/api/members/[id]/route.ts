import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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
  } catch (error: unknown) {
    console.error('Error updating member:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.[0];
      if (target === 'member_number') {
        return NextResponse.json({ error: 'Nomor anggota sudah digunakan' }, { status: 400 });
      }
      if (target === 'nik') {
        return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update member' },
      { status: 500 }
    );
  }
}
