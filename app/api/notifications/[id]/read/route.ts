import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    await NotificationService.markAsRead(parseInt(id), parseInt(String(session.user.id)));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Mark read:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
