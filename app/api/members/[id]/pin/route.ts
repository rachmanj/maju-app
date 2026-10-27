import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { MemberService } from '@/lib/services/member-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_VIEW)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const memberId = Number(id);
    if (Number.isNaN(memberId)) {
      return NextResponse.json({ error: 'ID anggota tidak valid' }, { status: 400 });
    }

    const status = await MemberService.getPinStatus(memberId);
    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil status PIN';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
