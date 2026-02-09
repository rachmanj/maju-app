import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { WarehouseService } from '@/lib/services/warehouse-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import type { Warehouse } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const all = searchParams.get('all') === 'true';
    if (all) {
      const warehouses = await WarehouseService.listAll();
      const serialized = warehouses.map((w: Warehouse) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(w as unknown as Record<string, unknown>)) {
          out[k] = typeof v === 'bigint' ? Number(v) : v;
        }
        return out;
      });
      return NextResponse.json(serialized);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const is_active = searchParams.get('is_active');
    const isActive = is_active === 'true' ? true : is_active === 'false' ? false : undefined;

    const result = await WarehouseService.list({ page, limit, search, is_active: isActive });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = await WarehouseService.create({
      ...body,
      created_by: parseInt(session.user.id),
    });
    return NextResponse.json({ id, message: 'Warehouse created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create warehouse' },
      { status: 500 }
    );
  }
}
