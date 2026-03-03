import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth/config';
import { ProductUnitService } from '@/lib/services/product-unit-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const all = searchParams.get('all') === 'true';
    if (all) {
      const units = await ProductUnitService.listAll(false);
      return NextResponse.json(units);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const include_inactive = searchParams.get('include_inactive') === 'true';

    const result = await ProductUnitService.list({ page, limit, search, include_inactive });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch units' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = await ProductUnitService.create({
      code: body.code,
      name: body.name,
      is_default_base: body.is_default_base,
    });
    return NextResponse.json({ id, message: 'Unit created successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating unit:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Kode satuan sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create unit' },
      { status: 500 }
    );
  }
}
