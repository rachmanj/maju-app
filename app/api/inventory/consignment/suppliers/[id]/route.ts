import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ConsignmentService } from '@/lib/services/consignment-service';
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
    const supplier = await ConsignmentService.getSupplierById(parseInt(id));
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error('Consignment supplier GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch supplier' }, { status: 500 });
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
    await ConsignmentService.updateSupplier(parseInt(id), body, parseInt(session.user.id));
    return NextResponse.json({ message: 'Supplier updated' });
  } catch (error: any) {
    console.error('Consignment supplier PATCH:', error);
    return NextResponse.json({ error: error.message || 'Failed to update supplier' }, { status: 500 });
  }
}
