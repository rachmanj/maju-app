import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth/config';
import { ProductUnitService } from '@/lib/services/product-unit-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const unit = await ProductUnitService.getById(parseInt(id));
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }
    return NextResponse.json(unit);
  } catch (error: unknown) {
    console.error('Error fetching unit:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch unit' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    await ProductUnitService.update(parseInt(id), {
      code: body.code,
      name: body.name,
      is_default_base: body.is_default_base,
      is_active: body.is_active,
    });
    return NextResponse.json({ message: 'Unit updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating unit:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Kode satuan sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update unit' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await ProductUnitService.deactivate(parseInt(id));
    return NextResponse.json({ message: 'Unit deactivated successfully' });
  } catch (error: unknown) {
    console.error('Error deactivating unit:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deactivate unit' },
      { status: 500 }
    );
  }
}
