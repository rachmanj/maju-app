import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { StockService } from '@/lib/services/stock-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const warehouse_id = searchParams.get('warehouse_id') ? parseInt(searchParams.get('warehouse_id')!) : undefined;
    const product_id = searchParams.get('product_id') ? parseInt(searchParams.get('product_id')!) : undefined;
    const movement_type = searchParams.get('movement_type') || undefined;
    const date_from = searchParams.get('date_from') || undefined;
    const date_to = searchParams.get('date_to') || undefined;

    const result = await StockService.listMovements({
      page,
      limit,
      warehouse_id,
      product_id,
      movement_type,
      date_from,
      date_to,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching movements:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const roles = session ? (session.user as any)?.roles || [] : [];
    if (!session || (!hasPermission(roles, PERMISSIONS.INVENTORY_EDIT) && !hasPermission(roles, PERMISSIONS.INVENTORY_TRANSFER))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const movementDate = body.movement_date ? new Date(body.movement_date) : new Date();
    const id = await StockService.recordMovement({
      movement_type: body.movement_type,
      warehouse_id: body.warehouse_id,
      product_id: body.product_id,
      quantity: Number(body.quantity),
      unit_id: body.unit_id,
      to_warehouse_id: body.to_warehouse_id,
      notes: body.notes,
      movement_date: movementDate,
      created_by: parseInt(session.user.id),
    });
    return NextResponse.json({ id, message: 'Movement recorded successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording movement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record movement' },
      { status: 500 }
    );
  }
}
