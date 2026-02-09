import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ProductService } from '@/lib/services/product-service';
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
    const list = await ProductService.getUnitConversions(parseInt(id));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch conversions' }, { status: 500 });
  }
}

export async function POST(
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
    const convId = await ProductService.addUnitConversion({
      product_id: parseInt(id),
      from_unit_id: body.from_unit_id,
      to_unit_id: body.to_unit_id,
      conversion_factor: Number(body.conversion_factor),
    });
    return NextResponse.json({ id: convId, message: 'Conversion added' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add conversion' }, { status: 500 });
  }
}
