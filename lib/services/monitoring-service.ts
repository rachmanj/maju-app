import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

const ONLINE_THRESHOLD_MINUTES = 5;

export class MonitoringService {
  static async upsertHeartbeat(params: {
    user_id: number;
    ip_address?: string | null;
    context?: string;
  }): Promise<void> {
    const now = new Date();
    await prisma.user_activity.upsert({
      where: { user_id: BigInt(params.user_id) },
      create: {
        user_id: BigInt(params.user_id),
        last_activity_at: now,
        ip_address: params.ip_address?.slice(0, 45) ?? undefined,
        context: params.context?.slice(0, 50) ?? undefined,
      },
      update: {
        last_activity_at: now,
        ip_address: params.ip_address?.slice(0, 45) ?? undefined,
        context: params.context?.slice(0, 50) ?? undefined,
      },
    });
  }

  static async getOnlineUsers(): Promise<
    { user_id: number; name: string; email: string; roles: string[]; last_activity_at: Date; context: string | null }[]
  > {
    const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MINUTES * 60 * 1000);
    const rows = await prisma.user_activity.findMany({
      where: { last_activity_at: { gte: threshold } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            deleted_at: true,
            user_roles: { include: { role: { select: { code: true } } } },
          },
        },
      },
    });
    return rows
      .filter((r) => !r.user.deleted_at)
      .map((r) => ({
        user_id: Number(r.user_id),
        name: r.user.name,
        email: r.user.email,
        roles: r.user.user_roles.map((ur) => ur.role.code),
        last_activity_at: r.last_activity_at,
        context: r.context,
      }));
  }

  static async getMemberActivityStats(params: {
    from_date?: string;
    to_date?: string;
    member_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    stats: {
      member_id: number;
      member_name: string;
      nik: string;
      last_login: string | null;
      savings_count: number;
      loan_payments_count: number;
      orders_count: number;
      pos_count: number;
      last_activity: string | null;
    }[];
    total: number;
  }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const fromDate = params.from_date ? new Date(params.from_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = params.to_date ? new Date(params.to_date + 'T23:59:59') : new Date();

    const membersWhere: Record<string, unknown> = {
      deleted_at: null,
    };
    if (params.member_id != null) membersWhere.id = params.member_id;
    if (params.search) {
      membersWhere.OR = [
        { name: { contains: params.search } },
        { nik: { contains: params.search } },
      ];
    }

    const members = await prisma.members.findMany({
      where: membersWhere as Prisma.membersWhereInput,
      select: { id: true, name: true, nik: true, email: true },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });
    const total = await prisma.members.count({ where: membersWhere as Prisma.membersWhereInput });

    const memberIds = members.map((m) => m.id);
    const memberEmails = members.map((m) => m.email).filter(Boolean) as string[];

    const [savingsTxns, loanPayments, orderCounts, posTxns, userLogins] = await Promise.all([
      prisma.savings_transactions.findMany({
        where: {
          transaction_date: { gte: fromDate, lte: toDate },
          savings_account: { member_id: { in: memberIds } },
        },
        select: { savings_account: { select: { member_id: true } } },
      }),
      prisma.loan_payments.findMany({
        where: {
          payment_date: { gte: fromDate, lte: toDate },
          loan: { member_id: { in: memberIds } },
        },
        select: { loan: { select: { member_id: true } } },
      }),
      prisma.member_orders.groupBy({
        by: ['member_id'],
        where: {
          created_at: { gte: fromDate, lte: toDate },
          member_id: { in: memberIds },
        },
        _count: true,
      }),
      prisma.pos_transactions.findMany({
        where: {
          transaction_date: { gte: fromDate, lte: toDate },
          member_id: { in: memberIds },
        },
        select: { member_id: true },
      }),
      memberEmails.length > 0
        ? prisma.users.findMany({
            where: { email: { in: memberEmails }, deleted_at: null },
            select: { email: true, last_login_at: true },
          })
        : [],
    ]);

    const savingsByMember: Record<number, number> = {};
    for (const t of savingsTxns) {
      const mid = Number(t.savings_account.member_id);
      savingsByMember[mid] = (savingsByMember[mid] ?? 0) + 1;
    }
    const loanByMember: Record<number, number> = {};
    for (const p of loanPayments) {
      const mid = Number(p.loan.member_id);
      loanByMember[mid] = (loanByMember[mid] ?? 0) + 1;
    }
    const orderByMember: Record<number, number> = {};
    for (const g of orderCounts) orderByMember[Number(g.member_id)] = g._count;
    const posByMember: Record<number, number> = {};
    for (const t of posTxns) {
      const mid = Number(t.member_id);
      posByMember[mid] = (posByMember[mid] ?? 0) + 1;
    }
    const lastLoginByEmail: Record<string, string> = {};
    for (const u of userLogins) {
      if (u.email && u.last_login_at) lastLoginByEmail[u.email] = u.last_login_at.toISOString();
    }

    const stats = members.map((m) => {
      const mid = Number(m.id);
      const lastLogin = m.email ? lastLoginByEmail[m.email] ?? null : null;
      const savingsCount = savingsByMember[mid] ?? 0;
      const loanCount = loanByMember[mid] ?? 0;
      const orderCount = orderByMember[mid] ?? 0;
      const posCount = posByMember[mid] ?? 0;
      const lastActivity =
        lastLogin ??
        (savingsCount || loanCount || orderCount || posCount ? toDate.toISOString() : null);
      return {
        member_id: mid,
        member_name: m.name,
        nik: m.nik,
        last_login: lastLogin,
        savings_count: savingsCount,
        loan_payments_count: loanCount,
        orders_count: orderCount,
        pos_count: posCount,
        last_activity: lastActivity,
      };
    });

    return { stats, total };
  }
}
