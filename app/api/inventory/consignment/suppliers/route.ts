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
    const result = await ConsignmentService.listSuppliers({
      page: parseInt(sp.get('page') || '1'),
      limit: parseInt(sp.get('limit') || '20'),
      search: sp.get('search') || undefined,
      is_active: sp.get('is_active') === 'true' ? true : sp.get('is_active') === 'false' ? false : undefined,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Consignment suppliers GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const id = await ConsignmentService.createSupplier({
      ...body,
      created_by: parseInt(session.user.id),
    });
    return NextResponse.json({ id, message: 'Supplier created' }, { status: 201 });
  } catch (error: any) {
    console.error('Consignment suppliers POST:', error);
    return NextResponse.json({ error: error.message || 'Failed to create supplier' }, { status: 500 });
  }
}
