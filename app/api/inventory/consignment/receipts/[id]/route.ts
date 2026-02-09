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
    const receipt = await ConsignmentService.getReceiptById(parseInt(id));
    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    const items = await ConsignmentService.getReceiptItems(parseInt(id));
    return NextResponse.json({ ...receipt, items });
  } catch (error: any) {
    console.error('Consignment receipt GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch receipt' }, { status: 500 });
  }
}
