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
    await POSSelfServiceDeviceService.unpair(parseInt(id));
    return NextResponse.json({ message: 'Pairing device berhasil dicabut' });
  } catch (error: unknown) {
    console.error('POS self-service unpair:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
