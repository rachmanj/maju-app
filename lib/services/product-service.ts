import { prisma } from '@/lib/db/prisma';
import type { Product } from '@/types/database';

export class ProductService {
  static async create(data: {
    code: string;
    name: string;
    barcode?: string;
    category_id?: number;
    base_unit_id: number;
    description?: string;
    min_stock?: number;
    created_by?: number;
  }): Promise<number> {
    const row = await prisma.products.create({
      data: {
        code: data.code,
        name: data.name,
        barcode: data.barcode ?? null,
        category_id: data.category_id ?? null,
        base_unit_id: data.base_unit_id,
        description: data.description ?? null,
        min_stock: data.min_stock ?? 0,
        created_by: data.created_by ?? null,
      },
    });
    return Number(row.id);
  }

  static async getById(id: number): Promise<(Product & { category_name?: string; base_unit_code?: string }) | null> {
    const p = await prisma.products.findFirst({
      where: { id, deleted_at: null },
      include: {
        category: { select: { name: true } },
        base_unit: { select: { code: true, name: true } },
      },
    });
    if (!p) return null;
    return {
      ...p,
      id: Number(p.id),
      category_name: p.category?.name,
      base_unit_code: p.base_unit?.code,
      base_unit_name: p.base_unit?.name,
    } as unknown as Product & { category_name?: string; base_unit_code?: string };
  }

  static async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    is_active?: boolean;
  }): Promise<{ products: (Product & { category_name?: string; base_unit_code?: string })[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deleted_at: null };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { code: { contains: params.search } },
        { barcode: { contains: params.search } },
      ];
    }
    if (params.category_id != null) where.category_id = params.category_id;
    if (params.is_active !== undefined) where.is_active = params.is_active;

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        include: {
          category: { select: { name: true } },
          base_unit: { select: { code: true, name: true } },
        },
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.products.count({ where }),
    ]);
    const list = products.map((p) => ({
      ...p,
      category_name: p.category?.name,
      base_unit_code: p.base_unit?.code,
      base_unit_name: p.base_unit?.name,
    }));
    return { products: list as unknown as (Product & { category_name?: string; base_unit_code?: string })[], total };
  }

  static async update(
    id: number,
    data: Partial<Pick<Product, 'code' | 'name' | 'barcode' | 'category_id' | 'base_unit_id' | 'description' | 'min_stock' | 'is_active'>>,
    updatedBy?: number
  ): Promise<void> {
    const update: Record<string, unknown> = { ...data };
    if (updatedBy != null) update.updated_by = updatedBy;
    await prisma.products.update({
      where: { id },
      data: update as Parameters<typeof prisma.products.update>[0]['data'],
    });
  }

  static async getCategories(): Promise<{ id: number; code: string; name: string }[]> {
    const rows = await prisma.product_categories.findMany({
      where: { deleted_at: null, is_active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
    return rows;
  }

  static async getUnits(): Promise<{ id: number; code: string; name: string }[]> {
    const rows = await prisma.product_units.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
    return rows;
  }

  static async getUnitConversions(productId: number): Promise<
    { id: number; product_id: number; from_unit_id: number; to_unit_id: number; conversion_factor: number; from_unit_code?: string; to_unit_code?: string }[]
  > {
    const rows = await prisma.product_unit_conversions.findMany({
      where: { product_id: productId },
      include: {
        from_unit: { select: { code: true } },
        to_unit: { select: { code: true } },
      },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => ({
      id: Number(r.id),
      product_id: Number(r.product_id),
      from_unit_id: r.from_unit_id,
      to_unit_id: r.to_unit_id,
      conversion_factor: Number(r.conversion_factor),
      from_unit_code: r.from_unit.code,
      to_unit_code: r.to_unit.code,
    }));
  }

  static async addUnitConversion(data: { product_id: number; from_unit_id: number; to_unit_id: number; conversion_factor: number }): Promise<number> {
    const r = await prisma.product_unit_conversions.create({
      data: {
        product_id: data.product_id,
        from_unit_id: data.from_unit_id,
        to_unit_id: data.to_unit_id,
        conversion_factor: data.conversion_factor,
      },
    });
    return Number(r.id);
  }

  static async deleteUnitConversion(id: number): Promise<void> {
    await prisma.product_unit_conversions.delete({ where: { id } });
  }

  static async getPrices(productId: number, warehouseId?: number): Promise<
    { id: number; product_id: number; warehouse_id?: number; warehouse_code?: string; unit_id: number; unit_code?: string; price: number; effective_date: Date; expiry_date?: Date; is_active: boolean }[]
  > {
    const where: { product_id: bigint; is_active: boolean; warehouse_id?: number | null } = {
      product_id: BigInt(productId),
      is_active: true,
    };
    if (warehouseId !== undefined) where.warehouse_id = warehouseId;
    const rows = await prisma.product_prices.findMany({
      where,
      include: {
        warehouse: { select: { code: true } },
        unit: { select: { code: true } },
      },
      orderBy: [{ effective_date: 'desc' }, { id: 'desc' }],
    });
    return rows.map((r) => ({
      id: Number(r.id),
      product_id: Number(r.product_id),
      warehouse_id: r.warehouse_id != null ? Number(r.warehouse_id) : undefined,
      warehouse_code: r.warehouse?.code,
      unit_id: r.unit_id,
      unit_code: r.unit.code,
      price: Number(r.price),
      effective_date: r.effective_date,
      expiry_date: r.expiry_date ?? undefined,
      is_active: r.is_active ?? true,
    }));
  }

  static async addPrice(data: {
    product_id: number;
    warehouse_id?: number;
    unit_id: number;
    price: number;
    effective_date: Date;
    expiry_date?: Date;
    created_by?: number;
  }): Promise<number> {
    const r = await prisma.product_prices.create({
      data: {
        product_id: data.product_id,
        warehouse_id: data.warehouse_id ?? null,
        unit_id: data.unit_id,
        price: data.price,
        effective_date: data.effective_date,
        expiry_date: data.expiry_date ?? null,
        created_by: data.created_by ?? null,
      },
    });
    return Number(r.id);
  }
}
