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
    const settlement = await ConsignmentService.getSettlementById(parseInt(id));
    if (!settlement) return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    const sales = await ConsignmentService.getSettlementSales(parseInt(id));
    return NextResponse.json({ ...settlement, sales });
  } catch (error: any) {
    console.error('Consignment settlement GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settlement' }, { status: 500 });
  }
}
