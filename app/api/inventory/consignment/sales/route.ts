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
    const result = await ConsignmentService.listSales({
      page: parseInt(sp.get('page') || '1'),
      limit: parseInt(sp.get('limit') || '20'),
      supplier_id: sp.get('supplier_id') ? parseInt(sp.get('supplier_id')!) : undefined,
      settlement_id: sp.get('settlement_id') !== undefined && sp.get('settlement_id') !== '' && sp.get('settlement_id') !== 'null' ? parseInt(sp.get('settlement_id')!) : undefined,
      date_from: sp.get('date_from') || undefined,
      date_to: sp.get('date_to') || undefined,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Consignment sales GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const sale_date = body.sale_date ? new Date(body.sale_date) : new Date();
    const id = await ConsignmentService.addManualSale({
      supplier_id: body.supplier_id,
      product_id: body.product_id,
      warehouse_id: body.warehouse_id,
      quantity: Number(body.quantity),
      unit_id: body.unit_id,
      unit_price: Number(body.unit_price),
      sale_date,
    });
    return NextResponse.json({ id, message: 'Sale recorded' }, { status: 201 });
  } catch (error: any) {
    console.error('Consignment sales POST:', error);
    return NextResponse.json({ error: error.message || 'Failed to record sale' }, { status: 500 });
  }
}
