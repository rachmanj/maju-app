import { prisma } from '@/lib/db/prisma';

export class NotificationService {
  static async create(data: {
    user_id?: number | null;
    title: string;
    message?: string;
    type?: string;
    entity_type?: string;
    entity_id?: number;
  }): Promise<number> {
    const row = await prisma.notifications.create({
      data: {
        user_id: data.user_id != null ? BigInt(data.user_id) : null,
        title: data.title,
        message: data.message ?? null,
        type: (data.type ?? 'info').slice(0, 50),
        entity_type: data.entity_type ?? null,
        entity_id: data.entity_id != null ? BigInt(data.entity_id) : null,
      },
    });
    return Number(row.id);
  }

  static async listForUser(
    userId: number,
    params: { unreadOnly?: boolean; limit?: number; page?: number }
  ): Promise<{ notifications: { id: number; title: string; message: string | null; type: string; is_read: boolean; created_at: Date }[]; total: number }> {
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const skip = (page - 1) * limit;
    const where: { user_id: bigint; is_read?: boolean } = { user_id: BigInt(userId) };
    if (params.unreadOnly) where.is_read = false;

    const [rows, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: { id: true, title: true, message: true, type: true, is_read: true, created_at: true },
      }),
      prisma.notifications.count({ where }),
    ]);

    return {
      notifications: rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        message: r.message,
        type: r.type ?? 'info',
        is_read: r.is_read ?? false,
        created_at: r.created_at!,
      })),
      total,
    };
  }

  static async getUnreadCount(userId: number): Promise<number> {
    return prisma.notifications.count({
      where: { user_id: BigInt(userId), is_read: false },
    });
  }

  static async markAsRead(id: number, userId: number): Promise<void> {
    await prisma.notifications.updateMany({
      where: { id: BigInt(id), user_id: BigInt(userId) },
      data: { is_read: true, read_at: new Date() },
    });
  }

  static async markAllAsRead(userId: number): Promise<void> {
    await prisma.notifications.updateMany({
      where: { user_id: BigInt(userId), is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
  }
}
