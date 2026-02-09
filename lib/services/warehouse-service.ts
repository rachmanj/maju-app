import { prisma } from '@/lib/db/prisma';
import type { Warehouse } from '@/types/database';

export class WarehouseService {
  static async create(data: {
    code: string;
    name: string;
    address?: string;
    created_by?: number;
  }): Promise<number> {
    const row = await prisma.warehouses.create({
      data: {
        code: data.code,
        name: data.name,
        address: data.address ?? null,
        created_by: data.created_by ?? null,
      },
    });
    return Number(row.id);
  }

  static async getById(id: number): Promise<Warehouse | null> {
    const row = await prisma.warehouses.findFirst({
      where: { id, deleted_at: null },
    });
    return row ? ({ ...row, id: Number(row.id) } as unknown as Warehouse) : null;
  }

  static async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<{ warehouses: Warehouse[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deleted_at: null };
    if (params.search) {
      where.OR = [{ name: { contains: params.search } }, { code: { contains: params.search } }];
    }
    if (params.is_active !== undefined) where.is_active = params.is_active;

    const [warehouses, total] = await Promise.all([
      prisma.warehouses.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.warehouses.count({ where }),
    ]);
    return { warehouses: warehouses as unknown as Warehouse[], total };
  }

  static async listAll(): Promise<Warehouse[]> {
    const rows = await prisma.warehouses.findMany({
      where: { deleted_at: null, is_active: true },
      orderBy: { code: 'asc' },
    });
    return rows as unknown as Warehouse[];
  }

  static async update(
    id: number,
    data: Partial<Pick<Warehouse, 'code' | 'name' | 'address' | 'is_active'>>,
    updatedBy?: number
  ): Promise<void> {
    const update: Record<string, unknown> = { ...data };
    if (updatedBy != null) update.updated_by = updatedBy;
    await prisma.warehouses.update({
      where: { id },
      data: update as Parameters<typeof prisma.warehouses.update>[0]['data'],
    });
  }
}
