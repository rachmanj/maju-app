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
    const result = await ConsignmentService.listSettlements({
      page: parseInt(sp.get('page') || '1'),
      limit: parseInt(sp.get('limit') || '20'),
      supplier_id: sp.get('supplier_id') ? parseInt(sp.get('supplier_id')!) : undefined,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Consignment settlements GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settlements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const settlement_date = body.settlement_date ? new Date(body.settlement_date) : new Date();
    const id = await ConsignmentService.createSettlement({
      supplier_id: body.supplier_id,
      settlement_date,
      sale_ids: body.sale_ids || [],
      notes: body.notes,
      created_by: parseInt(session.user.id),
    });
    return NextResponse.json({ id, message: 'Settlement created' }, { status: 201 });
  } catch (error: any) {
    console.error('Consignment settlements POST:', error);
    return NextResponse.json({ error: error.message || 'Failed to create settlement' }, { status: 500 });
  }
}
