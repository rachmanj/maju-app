import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

type AnggotaSession = { user?: { id?: string; memberId?: number; roles?: string[] } };

export async function requireAnggotaSession(): Promise<
  | { session: AnggotaSession; memberId: number }
  | NextResponse
> {
  const session = await auth();
  const memberId = (session?.user as { memberId?: number | null })?.memberId;
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (memberId == null || memberId === 0) {
    return NextResponse.json({ error: 'Member not linked' }, { status: 403 });
  }
  if (!roles.includes('anggota')) {
    return NextResponse.json({ error: 'Anggota only' }, { status: 403 });
  }

  return { session: session as AnggotaSession, memberId };
}
