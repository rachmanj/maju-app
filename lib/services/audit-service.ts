import { prisma } from '@/lib/db/prisma';

export function getRequestContext(request: { headers: { get: (name: string) => string | null } }): {
  ip_address: string | null;
  user_agent: string | null;
} {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip_address = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null;
  const user_agent = request.headers.get('user-agent') ?? null;
  return { ip_address, user_agent };
}

export class AuditService {
  static async log(params: {
    user_id?: number | null;
    action: string;
    entity_type: string;
    entity_id?: number | null;
    old_values?: object | null;
    new_values?: object | null;
    ip_address?: string | null;
    user_agent?: string | null;
  }): Promise<void> {
    try {
      await prisma.audit_logs.create({
        data: {
          user_id: params.user_id != null ? BigInt(params.user_id) : null,
          action: params.action.slice(0, 100),
          entity_type: params.entity_type.slice(0, 100),
          entity_id: params.entity_id != null ? BigInt(params.entity_id) : null,
          old_values: params.old_values ?? undefined,
          new_values: params.new_values ?? undefined,
          ip_address: params.ip_address?.slice(0, 45) ?? undefined,
          user_agent: params.user_agent ?? undefined,
        },
      });
    } catch (e) {
      console.error('Audit log failed:', e);
    }
  }

  static async listLogs(params: {
    page?: number;
    limit?: number;
    user_id?: number;
    entity_type?: string;
    action?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<{
    logs: {
      id: number;
      user_id: number | null;
      user_name: string | null;
      action: string;
      entity_type: string;
      entity_id: number | null;
      old_values: unknown;
      new_values: unknown;
      ip_address: string | null;
      created_at: Date | null;
    }[];
    total: number;
  }> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: {
      user_id?: bigint;
      entity_type?: string;
      action?: string;
      created_at?: { gte?: Date; lte?: Date };
    } = {};

    if (params.user_id != null) where.user_id = BigInt(params.user_id);
    if (params.entity_type) where.entity_type = params.entity_type;
    if (params.action) where.action = params.action;
    if (params.from_date || params.to_date) {
      where.created_at = {};
      if (params.from_date) where.created_at.gte = new Date(params.from_date);
      if (params.to_date) where.created_at.lte = new Date(params.to_date + 'T23:59:59.999');
    }

    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.audit_logs.count({ where }),
    ]);

    return {
      logs: logs.map((l) => ({
        id: Number(l.id),
        user_id: l.user_id != null ? Number(l.user_id) : null,
        user_name: l.user?.name ?? null,
        action: l.action,
        entity_type: l.entity_type,
        entity_id: l.entity_id != null ? Number(l.entity_id) : null,
        old_values: l.old_values,
        new_values: l.new_values,
        ip_address: l.ip_address,
        created_at: l.created_at,
      })),
      total,
    };
  }
}
