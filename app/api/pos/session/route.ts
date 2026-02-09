import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.POS_ACCESS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deviceId = request.nextUrl.searchParams.get('deviceId');
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
    }

    const activeSession = await POSService.getActiveSession(parseInt(deviceId));
    return NextResponse.json(activeSession);
  } catch (error: any) {
    console.error('Error getting POS session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.POS_TRANSACTION)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, deviceId, openingCash, sessionId, closingCash } = body;

    if (action === 'open') {
      if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
      const id = await POSService.openSession(parseInt(deviceId), parseInt(session.user.id), openingCash);
      return NextResponse.json({ sessionId: id });
    }

    if (action === 'close') {
      if (!sessionId || closingCash === undefined) {
        return NextResponse.json({ error: 'sessionId and closingCash required' }, { status: 400 });
      }
      await POSService.closeSession(parseInt(sessionId), parseFloat(closingCash));
      return NextResponse.json({ message: 'Session closed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing POS session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to manage session' },
      { status: 500 }
    );
  }
}
