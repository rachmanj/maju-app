import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { MemberService } from '@/lib/services/member-service';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pinRecord = await prisma.member_pins.findUnique({
      where: { member_id: memberId, is_active: true },
      select: { id: true },
    });

    return NextResponse.json({ hasPin: !!pinRecord });
  } catch (error: unknown) {
    console.error('PIN status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memeriksa status PIN' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { newPin, currentPin } = body;

    if (!newPin || typeof newPin !== 'string') {
      return NextResponse.json(
        { error: 'PIN baru wajib diisi' },
        { status: 400 }
      );
    }

    const pinStr = newPin.trim();
    if (pinStr.length < 4 || pinStr.length > 8) {
      return NextResponse.json(
        { error: 'PIN harus 4–8 digit' },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(pinStr)) {
      return NextResponse.json(
        { error: 'PIN hanya boleh berisi angka' },
        { status: 400 }
      );
    }

    const existingPin = await prisma.member_pins.findUnique({
      where: { member_id: memberId },
    });

    if (existingPin?.is_active) {
      if (!currentPin || typeof currentPin !== 'string') {
        return NextResponse.json(
          { error: 'PIN saat ini wajib diisi untuk mengubah PIN' },
          { status: 400 }
        );
      }
      const isValid = await MemberService.verifyPin(memberId, currentPin.trim());
      if (!isValid) {
        return NextResponse.json(
          { error: 'PIN saat ini salah' },
          { status: 400 }
        );
      }
    }

    await MemberService.setPin(memberId, pinStr);

    return NextResponse.json({ message: 'PIN berhasil disimpan' });
  } catch (error: unknown) {
    console.error('Set PIN error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menyimpan PIN' },
      { status: 500 }
    );
  }
}
