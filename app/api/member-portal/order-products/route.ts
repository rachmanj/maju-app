import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ProductService } from '@/lib/services/product-service';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warehouseId = request.nextUrl.searchParams.get('warehouse_id');
    const search = request.nextUrl.searchParams.get('search') || '';
    if (!warehouseId) {
      return NextResponse.json({ error: 'warehouse_id required' }, { status: 400 });
    }

    const wid = parseInt(warehouseId);
    const stockRows = await prisma.warehouse_stock.findMany({
      where: {
        warehouse_id: wid,
        product: {
          deleted_at: null,
          is_active: true,
          ...(search
            ? {
                OR: [
                  { name: { contains: search } },
                  { code: { contains: search } },
                  { barcode: { contains: search } },
                ],
              }
            : {}),
        },
      },
      include: {
        product: {
          include: { base_unit: { select: { id: true, code: true, name: true } } },
        },
      },
      orderBy: { product: { code: 'asc' } },
      take: 50,
    });

    const result = await Promise.all(
      stockRows.map(async (r: (typeof stockRows)[number]) => {
        const productId = Number(r.product_id);
        const qty = Number(r.quantity);
        if (qty <= 0) return null;
        const prices = await ProductService.getPrices(productId, wid);
        const basePrices = prices.length > 0 ? prices : await ProductService.getPrices(productId);
        const priceRow = basePrices[0];
        if (!priceRow) return null;
        return {
          product_id: productId,
          product_code: r.product.code,
          product_name: r.product.name,
          unit_id: priceRow.unit_id,
          unit_code: priceRow.unit_code || r.product.base_unit.code,
          unit_price: priceRow.price,
          stock: qty,
        };
      })
    );

    const items = result.filter(Boolean);
    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error('Member portal order-products:', error);
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
