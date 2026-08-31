import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
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
      take: 200,
    });

    const inStockRows = stockRows.filter((r) => Number(r.quantity) > 0);
    const productIds = inStockRows.map((r) => r.product_id);

    const priceRows =
      productIds.length > 0
        ? await prisma.product_prices.findMany({
            where: {
              product_id: { in: productIds },
              is_active: true,
              OR: [{ warehouse_id: BigInt(wid) }, { warehouse_id: null }],
            },
            include: {
              unit: { select: { code: true } },
            },
            orderBy: [{ effective_date: 'desc' }, { id: 'desc' }],
          })
        : [];

    const priceByProductId = new Map<bigint, (typeof priceRows)[number]>();
    for (const row of priceRows) {
      if (!priceByProductId.has(row.product_id)) {
        priceByProductId.set(row.product_id, row);
      }
    }

    const result = inStockRows.map((r) => {
      const productId = Number(r.product_id);
      const qty = Number(r.quantity);
      const priceRow = priceByProductId.get(r.product_id);

      if (priceRow) {
        return {
          product_id: productId,
          product_code: r.product.code,
          product_name: r.product.name,
          unit_id: priceRow.unit_id,
          unit_code: priceRow.unit.code || r.product.base_unit.code,
          unit_price: Number(priceRow.price),
          stock: qty,
        };
      }

      const salesPrice = r.product.sales_price != null ? Number(r.product.sales_price) : 0;
      if (salesPrice > 0) {
        return {
          product_id: productId,
          product_code: r.product.code,
          product_name: r.product.name,
          unit_id: r.product.base_unit.id,
          unit_code: r.product.base_unit.code,
          unit_price: salesPrice,
          stock: qty,
        };
      }

      return null;
    });

    const items = result.filter((x): x is NonNullable<typeof x> => x != null);
    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error('Member portal order-products:', error);
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
