import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ProductUnitService } from '@/lib/services/product-unit-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = await ProductUnitService.getDefaultBaseUnitId();
    return NextResponse.json({ id });
  } catch (error: unknown) {
    console.error('Error fetching default base unit:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch default base unit' },
      { status: 500 }
    );
  }
}
