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

    const product = await ProductService.getById(parseInt(id));
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const p = product as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === 'bigint') out[k] = Number(v);
      else if (v && typeof v === 'object' && typeof (v as { toNumber?: () => number }).toNumber === 'function')
        out[k] = (v as { toNumber: () => number }).toNumber();
      else out[k] = v;
    }
    return NextResponse.json(out);
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    await ProductService.update(parseInt(id), body, parseInt(session.user.id));
    return NextResponse.json({ message: 'Product updated successfully' });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}
