import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.POS_ACCESS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const devices = await POSService.listDevices();
    return NextResponse.json(devices);
  } catch (error: any) {
    console.error('Error fetching POS devices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, device_fingerprint } = body;
    if (!code || !name) {
      return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
    }

    const id = await POSService.registerDevice({ code, name, device_fingerprint });
    return NextResponse.json({ id, message: 'Device registered' }, { status: 201 });
  } catch (error: any) {
    console.error('Error registering POS device:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register device' },
      { status: 500 }
    );
  }
}
