import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password saat ini dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(
      String(currentPassword),
      String(user.password_hash ?? '')
    );
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password saat ini salah' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await prisma.users.update({
      where: { id: userId },
      data: { password_hash: passwordHash, updated_at: new Date() },
    });

    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (error: unknown) {
    console.error('Change password error:', error);
    const message = error instanceof Error ? error.message : 'Gagal mengubah password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
