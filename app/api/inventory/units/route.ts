import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ProductService } from '@/lib/services/product-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const units = await ProductService.getUnits();
    return NextResponse.json(units);
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch units' },
      { status: 500 }
    );
  }
}
