import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(String(session.user.id));
    const unreadOnly = request.nextUrl.searchParams.get('unread_only') === '1';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const result = await NotificationService.listForUser(userId, { unreadOnly, limit, page });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Notifications list:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
