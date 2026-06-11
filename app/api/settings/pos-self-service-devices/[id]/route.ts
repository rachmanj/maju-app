import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSSelfServiceDeviceService } from '@/lib/services/pos-self-service-device-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { name, warehouse_id, is_active } = body;
    await POSSelfServiceDeviceService.update(parseInt(id), {
      name: name !== undefined ? (name?.trim() || null) : undefined,
      warehouse_id: warehouse_id !== undefined ? parseInt(warehouse_id) : undefined,
      is_active: is_active !== undefined ? !!is_active : undefined,
    });
    return NextResponse.json({ message: 'Device berhasil diubah' });
  } catch (error: unknown) {
    console.error('POS self-service device update:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    await POSSelfServiceDeviceService.delete(parseInt(id));
    return NextResponse.json({ message: 'Device berhasil dihapus' });
  } catch (error: unknown) {
    console.error('POS self-service device delete:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
