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
    const warehouse_id = request.nextUrl.searchParams.get('warehouse_id');
    const list = await ProductService.getPrices(
      parseInt(id),
      warehouse_id ? parseInt(warehouse_id) : undefined
    );
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch prices' }, { status: 500 });
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
    const effective_date = body.effective_date ? new Date(body.effective_date) : new Date();
    const priceId = await ProductService.addPrice({
      product_id: parseInt(id),
      warehouse_id: body.warehouse_id,
      unit_id: body.unit_id,
      price: Number(body.price),
      effective_date,
      expiry_date: body.expiry_date ? new Date(body.expiry_date) : undefined,
      created_by: parseInt(session.user.id),
    });
    return NextResponse.json({ id: priceId, message: 'Price added' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add price' }, { status: 500 });
  }
}
