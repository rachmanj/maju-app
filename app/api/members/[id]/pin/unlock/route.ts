import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { AuditService, getRequestContext } from '@/lib/services/audit-service';
import { MemberService } from '@/lib/services/member-service';
import { mapPrismaError } from '@/lib/utils/prisma-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission((session.user as any)?.roles || [], PERMISSIONS.MEMBER_RESET_PIN)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const memberId = Number(id);
    if (Number.isNaN(memberId)) {
      return NextResponse.json({ error: 'ID anggota tidak valid' }, { status: 400 });
    }

    const pinStatus = await MemberService.getPinStatus(memberId);
    await MemberService.unlockPin(memberId);

    const ctx = getRequestContext(request);
    await AuditService.log({
      user_id: Number(session.user.id),
      action: 'member.pin_unlock',
      entity_type: 'members',
      entity_id: memberId,
      old_values: {
        locked_until: pinStatus.locked_until?.toISOString() ?? null,
        failed_attempts: pinStatus.failed_attempts,
      },
      ip_address: ctx.ip_address,
      user_agent: ctx.user_agent,
    });

    return NextResponse.json({ message: 'Blokir PIN berhasil dibuka' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PIN anggota tidak ditemukan') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const { status, message } = mapPrismaError(error, 'Gagal membuka blokir PIN');
    return NextResponse.json({ error: message }, { status });
  }
}
