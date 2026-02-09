import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { WarehouseService } from '@/lib/services/warehouse-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warehouse = await WarehouseService.getById(parseInt(id));
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }
    return NextResponse.json(warehouse);
  } catch (error: any) {
    console.error('Error fetching warehouse:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouse' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await WarehouseService.update(parseInt(id), body, parseInt(session.user.id));
    return NextResponse.json({ message: 'Warehouse updated successfully' });
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update warehouse' },
      { status: 500 }
    );
  }
}
