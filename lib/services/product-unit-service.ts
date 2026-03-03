import { prisma } from '@/lib/db/prisma';

export interface ProductUnitRow {
  id: number;
  code: string;
  name: string;
  is_default_base: boolean;
  is_active: boolean;
}

export class ProductUnitService {
  static async create(data: {
    code: string;
    name: string;
    is_default_base?: boolean;
  }): Promise<number> {
    if (data.is_default_base) {
      await prisma.product_units.updateMany({ data: { is_default_base: false } });
    }
    const row = await prisma.product_units.create({
      data: {
        code: data.code.trim(),
        name: data.name.trim(),
        is_default_base: data.is_default_base ?? false,
      },
    });
    return row.id;
  }

  static async getById(id: number): Promise<ProductUnitRow | null> {
    const row = await prisma.product_units.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      is_default_base: row.is_default_base ?? false,
      is_active: row.is_active ?? true,
    };
  }

  static async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    include_inactive?: boolean;
  }): Promise<{ units: ProductUnitRow[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: { OR?: { code: { contains: string } }[] | { name: { contains: string } }[]; is_active?: boolean } = {};
    if (params.search) {
      where.OR = [
        { code: { contains: params.search } },
        { name: { contains: params.search } },
      ] as { code: { contains: string } }[] | { name: { contains: string } }[];
    }
    if (!params.include_inactive) {
      where.is_active = true;
    }

    const [units, total] = await Promise.all([
      prisma.product_units.findMany({
        where,
        orderBy: [{ is_default_base: 'desc' }, { code: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.product_units.count({ where }),
    ]);
    return {
      units: units.map((u) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        is_default_base: u.is_default_base ?? false,
        is_active: u.is_active ?? true,
      })),
      total,
    };
  }

  static async listAll(activeOnly = true): Promise<ProductUnitRow[]> {
    const rows = await prisma.product_units.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: [{ is_default_base: 'desc' }, { code: 'asc' }],
    });
    return rows.map((u) => ({
      id: u.id,
      code: u.code,
      name: u.name,
      is_default_base: u.is_default_base ?? false,
      is_active: u.is_active ?? true,
    }));
  }

  static async getDefaultBaseUnitId(): Promise<number | null> {
    const row = await prisma.product_units.findFirst({
      where: { is_active: true, is_default_base: true },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  static async update(
    id: number,
    data: Partial<{ code: string; name: string; is_default_base: boolean; is_active: boolean }>
  ): Promise<void> {
    if (data.is_default_base === true) {
      await prisma.product_units.updateMany({
        where: { id: { not: id } },
        data: { is_default_base: false },
      });
    }
    const update: Record<string, unknown> = { ...data };
    if (data.code != null) update.code = data.code.trim();
    if (data.name != null) update.name = data.name.trim();
    await prisma.product_units.update({
      where: { id },
      data: update as Parameters<typeof prisma.product_units.update>[0]['data'],
    });
  }

  static async deactivate(id: number): Promise<void> {
    const unit = await prisma.product_units.findUnique({ where: { id } });
    if (!unit) return;
    if (unit.is_default_base) {
      const fallback = await prisma.product_units.findFirst({
        where: { id: { not: id }, is_active: true },
        orderBy: { code: 'asc' },
      });
      if (fallback) {
        await prisma.product_units.update({ where: { id: fallback.id }, data: { is_default_base: true } });
      }
    }
    await prisma.product_units.update({
      where: { id },
      data: { is_active: false, is_default_base: false },
    });
  }
}
