import { prisma } from '@/lib/db/prisma';

export interface DepartmentRow {
  id: number;
  code: string;
  name: string;
}

export class DepartmentService {
  static async create(data: { code: string; name: string; created_by?: number }): Promise<number> {
    const row = await prisma.departments.create({
      data: {
        code: data.code.trim(),
        name: data.name.trim(),
      },
    });
    return row.id;
  }

  static async getById(id: number): Promise<DepartmentRow | null> {
    const row = await prisma.departments.findFirst({
      where: { id, deleted_at: null },
    });
    if (!row) return null;
    return { id: row.id, code: row.code, name: row.name };
  }

  static async list(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ departments: DepartmentRow[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deleted_at: null };
    if (params.search) {
      where.OR = [{ name: { contains: params.search } }, { code: { contains: params.search } }];
    }

    const [departments, total] = await Promise.all([
      prisma.departments.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.departments.count({ where }),
    ]);
    return {
      departments: departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
      total,
    };
  }

  static async listAll(): Promise<DepartmentRow[]> {
    const rows = await prisma.departments.findMany({
      where: { deleted_at: null },
      orderBy: { code: 'asc' },
    });
    return rows.map((d) => ({ id: d.id, code: d.code, name: d.name }));
  }

  static async update(
    id: number,
    data: Partial<{ code: string; name: string }>,
    updatedBy?: number
  ): Promise<void> {
    const update: Record<string, unknown> = { ...data };
    if (data.code != null) update.code = data.code.trim();
    if (data.name != null) update.name = data.name.trim();
    await prisma.departments.update({
      where: { id },
      data: update as Parameters<typeof prisma.departments.update>[0]['data'],
    });
  }

  static async delete(id: number): Promise<void> {
    await prisma.departments.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
