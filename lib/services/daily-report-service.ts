import { prisma } from '@/lib/db/prisma';

export class DailyReportService {
  static async getPosSalesReport(date: string): Promise<{
    date: string;
    transactionCount: number;
    totalAmount: number;
    byPaymentMethod: { method: string; count: number; amount: number }[];
    items: { transaction_number: string; member_name: string; total_amount: number; payment_methods: string }[];
  }> {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const transactions = await prisma.pos_transactions.findMany({
      where: {
        transaction_date: { gte: start, lte: end },
        status: 'completed',
      },
      include: {
        member: { select: { name: true } },
        pos_payments: true,
      },
      orderBy: { transaction_date: 'asc' },
    });

    const totalAmount = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
    const byMethod = new Map<string, { count: number; amount: number }>();
    for (const t of transactions) {
      for (const p of t.pos_payments) {
        const method = p.payment_method ?? 'cash';
        const cur = byMethod.get(method) ?? { count: 0, amount: 0 };
        cur.count += 1;
        cur.amount += Number(p.amount);
        byMethod.set(method, cur);
      }
    }
    if (transactions.length > 0 && byMethod.size === 0) {
      byMethod.set('cash', { count: transactions.length, amount: totalAmount });
    }

    const items = transactions.map((t) => ({
      transaction_number: t.transaction_number,
      member_name: (t.member as { name: string }).name,
      total_amount: Number(t.total_amount),
      payment_methods: [...new Set(t.pos_payments.map((p) => p.payment_method))].join(', ') || 'cash',
    }));

    return {
      date,
      transactionCount: transactions.length,
      totalAmount,
      byPaymentMethod: Array.from(byMethod.entries()).map(([method, v]) => ({
        method,
        count: v.count,
        amount: v.amount,
      })),
      items,
    };
  }

  static async getDailyCashReport(date: string): Promise<{
    date: string;
    posCash: number;
    paymentBreakdown: { method: string; amount: number }[];
  }> {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const payments = await prisma.pos_payments.findMany({
      where: {
        transaction: {
          transaction_date: { gte: start, lte: end },
          status: 'completed',
        },
      },
    });

    const byMethod = new Map<string, number>();
    let posCash = 0;
    for (const p of payments) {
      const method = (p.payment_method ?? 'cash').toLowerCase();
      const amt = Number(p.amount);
      byMethod.set(method, (byMethod.get(method) ?? 0) + amt);
      if (method === 'cash') posCash += amt;
    }

    return {
      date,
      posCash,
      paymentBreakdown: Array.from(byMethod.entries()).map(([method, amount]) => ({ method, amount })),
    };
  }

  static async getStockMovementReport(date: string): Promise<{
    date: string;
    totalMovements: number;
    byType: { movement_type: string; count: number }[];
    items: { movement_number: string; movement_type: string; warehouse_name: string; product_name: string; quantity: number; unit_code: string }[];
  }> {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const movements = await prisma.stock_movements.findMany({
      where: { movement_date: { gte: start, lte: end } },
      include: {
        warehouse: { select: { name: true } },
        product: { select: { name: true } },
        unit: { select: { code: true } },
      },
      orderBy: { movement_date: 'asc' },
    });

    const byType = new Map<string, number>();
    for (const m of movements) {
      const t = m.movement_type ?? 'other';
      byType.set(t, (byType.get(t) ?? 0) + 1);
    }

    const items = movements.map((m) => ({
      movement_number: m.movement_number,
      movement_type: m.movement_type,
      warehouse_name: (m.warehouse as { name: string }).name,
      product_name: (m.product as { name: string }).name,
      quantity: Number(m.quantity),
      unit_code: (m.unit as { code: string }).code,
    }));

    return {
      date,
      totalMovements: movements.length,
      byType: Array.from(byType.entries()).map(([movement_type, count]) => ({ movement_type, count })),
      items,
    };
  }
}
