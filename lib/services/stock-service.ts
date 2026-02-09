import { prisma } from '@/lib/db/prisma';

export class StockService {
  static async getStockByWarehouse(warehouseId: number): Promise<
    { product_id: number; product_code: string; product_name: string; unit_code: string; quantity: number; min_stock: number }[]
  > {
    const rows = await prisma.warehouse_stock.findMany({
      where: {
        warehouse_id: warehouseId,
        product: { deleted_at: null },
      },
      include: {
        product: { include: { base_unit: { select: { code: true } } } },
      },
      orderBy: { product: { code: 'asc' } },
    });
    return rows.map((r) => ({
      product_id: Number(r.product_id),
      product_code: r.product.code,
      product_name: r.product.name,
      unit_code: r.product.base_unit.code,
      quantity: Number(r.quantity),
      min_stock: Number(r.product.min_stock ?? 0),
    }));
  }

  static async getStockByProduct(productId: number): Promise<
    { warehouse_id: number; warehouse_code: string; warehouse_name: string; quantity: number }[]
  > {
    const rows = await prisma.warehouse_stock.findMany({
      where: {
        product_id: productId,
        warehouse: { deleted_at: null },
      },
      include: { warehouse: true },
      orderBy: { warehouse: { code: 'asc' } },
    });
    return rows.map((r) => ({
      warehouse_id: Number(r.warehouse_id),
      warehouse_code: r.warehouse.code,
      warehouse_name: r.warehouse.name,
      quantity: Number(r.quantity),
    }));
  }

  static async getQuantity(warehouseId: number, productId: number): Promise<number> {
    const row = await prisma.warehouse_stock.findUnique({
      where: {
        warehouse_id_product_id: { warehouse_id: warehouseId, product_id: productId },
      },
    });
    return row ? Number(row.quantity) : 0;
  }

  static async recordMovement(params: {
    movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
    warehouse_id: number;
    product_id: number;
    quantity: number;
    unit_id: number;
    to_warehouse_id?: number;
    notes?: string;
    movement_date: Date;
    created_by?: number;
  }): Promise<number> {
    const movementNumber = `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const sign = params.movement_type === 'out' ? -1 : 1;
    const qtyDelta = params.quantity * sign;

    const movement = await prisma.$transaction(async (tx) => {
      const m = await tx.stock_movements.create({
        data: {
          movement_number: movementNumber,
          movement_type: params.movement_type,
          warehouse_id: params.warehouse_id,
          product_id: params.product_id,
          quantity: params.movement_type === 'out' ? -params.quantity : params.quantity,
          unit_id: params.unit_id,
          to_warehouse_id: params.to_warehouse_id ?? null,
          notes: params.notes ?? null,
          movement_date: params.movement_date,
          created_by: params.created_by ?? null,
        },
      });

      await tx.warehouse_stock.upsert({
        where: {
          warehouse_id_product_id: { warehouse_id: params.warehouse_id, product_id: params.product_id },
        },
        create: {
          warehouse_id: params.warehouse_id,
          product_id: params.product_id,
          quantity: qtyDelta,
        },
        update: { quantity: { increment: qtyDelta } },
      });

      if (params.movement_type === 'transfer' && params.to_warehouse_id) {
        await tx.warehouse_stock.upsert({
          where: {
            warehouse_id_product_id: { warehouse_id: params.to_warehouse_id, product_id: params.product_id },
          },
          create: {
            warehouse_id: params.to_warehouse_id,
            product_id: params.product_id,
            quantity: params.quantity,
          },
          update: { quantity: { increment: params.quantity } },
        });
      }
      return m;
    });
    return Number(movement.id);
  }

  static async listMovements(params: {
    warehouse_id?: number;
    product_id?: number;
    movement_type?: string;
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    movements: {
      id: number;
      movement_number: string;
      movement_type: string;
      warehouse_id: number;
      warehouse_name: string;
      product_id: number;
      product_code: string;
      product_name: string;
      quantity: number;
      unit_code: string;
      to_warehouse_name?: string;
      notes?: string;
      movement_date: string;
      created_at: string;
    }[];
    total: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.warehouse_id != null) where.warehouse_id = params.warehouse_id;
    if (params.product_id != null) where.product_id = params.product_id;
    if (params.movement_type) where.movement_type = params.movement_type;
    if (params.date_from || params.date_to) {
      where.movement_date = {
        ...(params.date_from && { gte: new Date(params.date_from) }),
        ...(params.date_to && { lte: new Date(params.date_to) }),
      };
    }

    const [movements, total] = await Promise.all([
      prisma.stock_movements.findMany({
        where,
        include: {
          warehouse: { select: { name: true } },
          product: { select: { code: true, name: true } },
          unit: { select: { code: true } },
          to_warehouse: { select: { name: true } },
        },
        orderBy: [{ movement_date: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.stock_movements.count({ where }),
    ]);
    return {
      movements: movements.map((m) => ({
        id: Number(m.id),
        movement_number: m.movement_number,
        movement_type: m.movement_type,
        warehouse_id: Number(m.warehouse_id),
        warehouse_name: m.warehouse.name,
        product_id: Number(m.product_id),
        product_code: m.product.code,
        product_name: m.product.name,
        quantity: Number(m.quantity),
        unit_code: m.unit.code,
        to_warehouse_name: m.to_warehouse?.name,
        notes: m.notes ?? undefined,
        movement_date: m.movement_date.toISOString().slice(0, 10),
        created_at: (m.created_at ?? new Date()).toISOString(),
      })),
      total,
    };
  }
}
