import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await NotificationService.markAllAsRead(parseInt(String(session.user.id)));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Mark all read:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
