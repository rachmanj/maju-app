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
    const supplier_id = sp.get('supplier_id') ? parseInt(sp.get('supplier_id')!) : undefined;
    const warehouse_id = sp.get('warehouse_id') ? parseInt(sp.get('warehouse_id')!) : undefined;
    const list = await ConsignmentService.getConsignmentStock({ supplier_id, warehouse_id });
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Consignment stock GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch consignment stock' }, { status: 500 });
  }
}
