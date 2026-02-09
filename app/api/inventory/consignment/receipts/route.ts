import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ConsignmentService } from '@/lib/services/consignment-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sp = request.nextUrl.searchParams;
    const result = await ConsignmentService.listReceipts({
      page: parseInt(sp.get('page') || '1'),
      limit: parseInt(sp.get('limit') || '20'),
      supplier_id: sp.get('supplier_id') ? parseInt(sp.get('supplier_id')!) : undefined,
      warehouse_id: sp.get('warehouse_id') ? parseInt(sp.get('warehouse_id')!) : undefined,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Consignment receipts GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch receipts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const receipt_date = body.receipt_date ? new Date(body.receipt_date) : new Date();
    const id = await ConsignmentService.createReceipt({
      supplier_id: body.supplier_id,
      warehouse_id: body.warehouse_id,
      receipt_date,
      notes: body.notes,
      items: body.items || [],
      created_by: parseInt(session.user.id),
    });
    return NextResponse.json({ id, message: 'Receipt created' }, { status: 201 });
  } catch (error: any) {
    console.error('Consignment receipts POST:', error);
    return NextResponse.json({ error: error.message || 'Failed to create receipt' }, { status: 500 });
  }
}
