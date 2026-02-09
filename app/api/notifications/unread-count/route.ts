import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 });
    }
    const count = await NotificationService.getUnreadCount(parseInt(String(session.user.id)));
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
