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
    const supplier_id = request.nextUrl.searchParams.get('supplier_id');
    if (!supplier_id) return NextResponse.json({ error: 'supplier_id required' }, { status: 400 });
    const list = await ConsignmentService.listUnsettledSales(parseInt(supplier_id));
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Consignment unsettled sales GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch unsettled sales' }, { status: 500 });
  }
}
