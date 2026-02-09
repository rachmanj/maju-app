import { prisma } from '@/lib/db/prisma';

export class ReceivablesService {
  static async listReceivables(params: {
    memberId?: number;
    status?: 'pending' | 'paid';
    year?: number;
    month?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    receivables: {
      id: number;
      member_id: number;
      member_name: string;
      transaction_number: string;
      amount: number;
      due_month: number;
      due_year: number;
      status: string;
      paid_at: Date | null;
      created_at: Date | null;
    }[];
    total: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.memberId) where.member_id = params.memberId;
    if (params.status) where.status = params.status;
    if (params.year) where.due_year = params.year;
    if (params.month) where.due_month = params.month;

    const [rows, total] = await Promise.all([
      prisma.member_receivables.findMany({
        where,
        include: {
          member: { select: { name: true } },
          pos_transaction: { select: { transaction_number: true } },
        },
        orderBy: [{ due_year: 'asc' }, { due_month: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.member_receivables.count({ where }),
    ]);

    const receivables = rows.map((r) => ({
      id: Number(r.id),
      member_id: Number(r.member_id),
      member_name: r.member.name,
      transaction_number: r.pos_transaction.transaction_number,
      amount: Number(r.amount),
      due_month: r.due_month,
      due_year: r.due_year,
      status: r.status ?? 'pending',
      paid_at: r.paid_at,
      created_at: r.created_at,
    }));

    return { receivables, total };
  }

  static async getPayrollDeductionData(year: number, month: number): Promise<{
    members: { member_id: number; member_name: string; total_receivable: number }[];
    total: number;
  }> {
    const rows = await prisma.member_receivables.findMany({
      where: { due_year: year, due_month: month, status: 'pending' },
      include: { member: { select: { name: true } } },
      orderBy: { member_id: 'asc' },
    });

    const byMember = new Map<number, { name: string; total: number }>();
    for (const r of rows) {
      const mid = Number(r.member_id);
      const existing = byMember.get(mid);
      const amt = Number(r.amount);
      if (existing) {
        existing.total += amt;
      } else {
        byMember.set(mid, { name: r.member.name, total: amt });
      }
    }

    const members = Array.from(byMember.entries()).map(([member_id, v]) => ({
      member_id,
      member_name: v.name,
      total_receivable: v.total,
    }));
    const total = members.reduce((s, m) => s + m.total_receivable, 0);
    return { members, total };
  }

  static async getAgingReport(memberId?: number): Promise<{
    buckets: { bucket: string; amount: number; count: number }[];
  }> {
    const where: Record<string, unknown> = { status: 'pending' };
    if (memberId) where.member_id = memberId;

    const rows = await prisma.member_receivables.findMany({
      where,
      select: { due_year: true, due_month: true, amount: true },
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const buckets: Record<string, number> = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    for (const r of rows) {
      const amt = Number(r.amount);
      const monthsPast = (currentYear - r.due_year) * 12 + (currentMonth - r.due_month);
      if (monthsPast <= 0) buckets.current += amt;
      else if (monthsPast <= 1) buckets['1-30'] += amt;
      else if (monthsPast <= 2) buckets['31-60'] += amt;
      else if (monthsPast <= 3) buckets['61-90'] += amt;
      else buckets['90+'] += amt;
    }

    return {
      buckets: Object.entries(buckets).map(([bucket, amount]) => ({
        bucket,
        amount,
        count: 0,
      })),
    };
  }
}
