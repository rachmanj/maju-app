import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSSelfServiceDeviceService } from '@/lib/services/pos-self-service-device-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const result = await POSSelfServiceDeviceService.generatePairingCode(parseInt(id));
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('POS self-service generate pairing code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
