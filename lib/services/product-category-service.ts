import { prisma } from '@/lib/db/prisma';

export interface ProductCategoryRow {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  parent_code?: string;
  parent_name?: string;
  is_active: boolean;
}

export class ProductCategoryService {
  static async create(data: {
    code: string;
    name: string;
    parent_id?: number | null;
  }): Promise<number> {
    const row = await prisma.product_categories.create({
      data: {
        code: data.code.trim(),
        name: data.name.trim(),
        parent_id: data.parent_id ?? null,
      },
    });
    return row.id;
  }

  static async getById(id: number): Promise<ProductCategoryRow | null> {
    const row = await prisma.product_categories.findFirst({
      where: { id, deleted_at: null },
    });
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      parent_id: row.parent_id,
      is_active: row.is_active ?? true,
    };
  }

  static async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    include_inactive?: boolean;
  }): Promise<{ categories: ProductCategoryRow[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: {
      deleted_at: null;
      is_active?: boolean;
      OR?: Array<{ code: { contains: string } } | { name: { contains: string } }>;
    } = { deleted_at: null };
    if (params.search) {
      where.OR = [
        { code: { contains: params.search } },
        { name: { contains: params.search } },
      ];
    }
    if (!params.include_inactive) {
      where.is_active = true;
    }

    const [categories, total] = await Promise.all([
      prisma.product_categories.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limit,
        include: { parent: { select: { code: true, name: true } } },
      }),
      prisma.product_categories.count({ where }),
    ]);
    return {
      categories: categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        parent_id: c.parent_id,
        parent_code: c.parent?.code,
        parent_name: c.parent?.name,
        is_active: c.is_active ?? true,
      })),
      total,
    };
  }

  static async update(
    id: number,
    data: Partial<{ code: string; name: string; parent_id: number | null; is_active: boolean }>
  ): Promise<void> {
    const update: Record<string, unknown> = { ...data };
    if (data.code != null) update.code = data.code.trim();
    if (data.name != null) update.name = data.name.trim();
    await prisma.product_categories.update({
      where: { id, deleted_at: null },
      data: update as Parameters<typeof prisma.product_categories.update>[0]['data'],
    });
  }

  static async deactivate(id: number): Promise<void> {
    await prisma.product_categories.update({
      where: { id, deleted_at: null },
      data: { is_active: false },
    });
  }
}
