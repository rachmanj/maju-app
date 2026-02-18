import { prisma } from '@/lib/db/prisma';

export interface ProjectRow {
  id: number;
  code: string;
  name: string;
  address?: string;
  is_active?: boolean;
}

export class ProjectService {
  static async create(data: {
    code: string;
    name: string;
    address?: string;
    is_active?: boolean;
    created_by?: number;
  }): Promise<number> {
    const row = await prisma.projects.create({
      data: {
        code: data.code.trim(),
        name: data.name.trim(),
        address: data.address?.trim() || null,
        is_active: data.is_active ?? true,
        created_by: data.created_by != null ? BigInt(data.created_by) : null,
      },
    });
    return row.id;
  }

  static async getById(id: number): Promise<ProjectRow | null> {
    const row = await prisma.projects.findFirst({
      where: { id, deleted_at: null },
    });
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address ?? undefined,
      is_active: row.is_active ?? true,
    };
  }

  static async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<{ projects: ProjectRow[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deleted_at: null };
    if (params.search) {
      where.OR = [{ name: { contains: params.search } }, { code: { contains: params.search } }];
    }
    if (params.is_active !== undefined) where.is_active = params.is_active;

    const [projects, total] = await Promise.all([
      prisma.projects.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.projects.count({ where }),
    ]);
    return {
      projects: projects.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        address: p.address ?? undefined,
        is_active: p.is_active ?? true,
      })),
      total,
    };
  }

  static async listAll(): Promise<ProjectRow[]> {
    const rows = await prisma.projects.findMany({
      where: { deleted_at: null, is_active: true },
      orderBy: { code: 'asc' },
    });
    return rows.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      address: p.address ?? undefined,
      is_active: p.is_active ?? true,
    }));
  }

  static async update(
    id: number,
    data: Partial<{ code: string; name: string; address?: string; is_active?: boolean }>,
    updatedBy?: number
  ): Promise<void> {
    const update: Record<string, unknown> = { ...data };
    if (data.code != null) update.code = data.code.trim();
    if (data.name != null) update.name = data.name.trim();
    if (data.address != null) update.address = data.address.trim() || null;
    if (updatedBy != null) update.updated_by = BigInt(updatedBy);
    await prisma.projects.update({
      where: { id },
      data: update as Parameters<typeof prisma.projects.update>[0]['data'],
    });
  }

  static async delete(id: number): Promise<void> {
    await prisma.projects.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
