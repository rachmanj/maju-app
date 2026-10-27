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

    const { tempPin, expiresAt } = await MemberService.resetPin(
      memberId,
      Number(session.user.id)
    );

    const ctx = getRequestContext(request);
    await AuditService.log({
      user_id: Number(session.user.id),
      action: 'member.pin_reset',
      entity_type: 'members',
      entity_id: memberId,
      new_values: {
        must_change_pin: true,
        temp_pin_expires_at: expiresAt.toISOString(),
      },
      ip_address: ctx.ip_address,
      user_agent: ctx.user_agent,
    });

    return NextResponse.json(
      {
        temp_pin: tempPin,
        expires_at: expiresAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const { status, message } = mapPrismaError(error, 'Gagal mereset PIN');
    return NextResponse.json({ error: message }, { status });
  }
}
