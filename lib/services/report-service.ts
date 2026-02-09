import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export class ReportService {
  static async getTrialBalance(fromDate: string, toDate: string): Promise<
    { account_id: number; code: string; name: string; debit: number; credit: number }[]
  > {
    const rows = await prisma.$queryRaw<
      { account_id: number; code: string; name: string; net: number }[]
    >(Prisma.sql`
      SELECT coa.id as account_id, coa.code, coa.name,
             COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as net
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date BETWEEN ${new Date(fromDate)} AND ${new Date(toDate)}
      WHERE coa.is_active = TRUE
      GROUP BY coa.id, coa.code, coa.name
      HAVING COALESCE(SUM(jel.debit), 0) <> 0 OR COALESCE(SUM(jel.credit), 0) <> 0
      ORDER BY coa.code
    `);
    return rows.map((r) => ({
      account_id: r.account_id,
      code: r.code,
      name: r.name,
      debit: r.net > 0 ? r.net : 0,
      credit: r.net < 0 ? -r.net : 0,
    }));
  }

  static async getGeneralLedger(accountId: number, fromDate: string, toDate: string): Promise<{
    account: { code: string; name: string };
    lines: { entry_number: string; entry_date: string; description?: string; debit: number; credit: number; balance: number }[];
    totalDebit: number;
    totalCredit: number;
    balance: number;
  }> {
    const account = await prisma.chart_of_accounts.findUnique({
      where: { id: accountId },
      select: { code: true, name: true },
    });
    if (!account) throw new Error('Account not found');

    const lines = await prisma.journal_entry_lines.findMany({
      where: {
        account_id: accountId,
        journal_entry: {
          status: 'posted',
          entry_date: { gte: new Date(fromDate), lte: new Date(toDate) },
        },
      },
      include: {
        journal_entry: {
          select: { entry_number: true, entry_date: true, description: true },
        },
      },
      orderBy: [
        { journal_entry: { entry_date: 'asc' } },
        { journal_entry_id: 'asc' },
        { id: 'asc' },
      ],
    });

    let balance = 0;
    const result = lines.map((l) => {
      const debit = Number(l.debit ?? 0);
      const credit = Number(l.credit ?? 0);
      balance += debit - credit;
      return {
        entry_number: l.journal_entry.entry_number,
        entry_date: l.journal_entry.entry_date.toISOString().slice(0, 10),
        description: l.journal_entry.description ?? undefined,
        debit,
        credit,
        balance,
      };
    });

    const totalDebit = result.reduce((s, l) => s + l.debit, 0);
    const totalCredit = result.reduce((s, l) => s + l.credit, 0);

    return {
      account: { code: account.code, name: account.name },
      lines: result,
      totalDebit,
      totalCredit,
      balance,
    };
  }

  static async getPayrollDeductionReport(month: string): Promise<{
    members: { member_id: number; nik: string; name: string; simpanan_wajib: number; loan_installment: number; total: number }[];
    summary: { total_simpanan_wajib: number; total_loan_installment: number; total: number };
  }> {
    const [startDate, endDate] = [
      `${month}-01`,
      new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 0)
        .toISOString()
        .split('T')[0],
    ];

    const rows = await prisma.$queryRaw<
      { member_id: number; nik: string; name: string; simpanan_wajib: number; loan_installment: number }[]
    >(Prisma.sql`
      SELECT m.id as member_id, m.nik, m.name,
             COALESCE(sw.amount, 0) as simpanan_wajib,
             COALESCE(loan.installment, 0) as loan_installment
      FROM members m
      LEFT JOIN (
        SELECT sa.member_id, st.minimum_amount as amount
        FROM savings_accounts sa
        JOIN savings_types st ON sa.savings_type_id = st.id
        WHERE st.code = 'WAJIB'
      ) sw ON sw.member_id = m.id
      LEFT JOIN (
        SELECT l.member_id, SUM(ls.installment_amount - ls.paid_amount) as installment
        FROM loans l
        JOIN loan_schedules ls ON ls.loan_id = l.id AND ls.status = 'pending'
        WHERE l.status = 'active' AND ls.due_date BETWEEN ${new Date(startDate)} AND ${new Date(endDate)}
        GROUP BY l.member_id
      ) loan ON loan.member_id = m.id
      WHERE m.status = 'active' AND m.deleted_at IS NULL
      HAVING COALESCE(sw.amount, 0) > 0 OR COALESCE(loan.installment, 0) > 0
      ORDER BY m.name
    `);

    const members = rows.map((r) => {
      const sw = Number(r.simpanan_wajib || 0);
      const inst = Number(r.loan_installment || 0);
      return {
        member_id: r.member_id,
        nik: r.nik,
        name: r.name,
        simpanan_wajib: sw,
        loan_installment: inst,
        total: sw + inst,
      };
    });

    const summary = members.reduce(
      (s, m) => ({
        total_simpanan_wajib: s.total_simpanan_wajib + m.simpanan_wajib,
        total_loan_installment: s.total_loan_installment + m.loan_installment,
        total: s.total + m.total,
      }),
      { total_simpanan_wajib: 0, total_loan_installment: 0, total: 0 }
    );

    return { members, summary };
  }

  static async getBalanceSheet(asOfDate: string): Promise<{
    assets: { code: string; name: string; amount: number }[];
    liabilities: { code: string; name: string; amount: number }[];
    equity: { code: string; name: string; amount: number }[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }> {
    const rows = await prisma.$queryRaw<
      { account_id: number; code: string; name: string; account_type: string; net: number }[]
    >(Prisma.sql`
      SELECT coa.id as account_id, coa.code, coa.name, coa.account_type,
             COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as net
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date <= ${new Date(asOfDate)}
      WHERE coa.is_active = TRUE
      GROUP BY coa.id, coa.code, coa.name, coa.account_type
      HAVING COALESCE(SUM(jel.debit), 0) <> 0 OR COALESCE(SUM(jel.credit), 0) <> 0
      ORDER BY coa.account_type, coa.code
    `);

    const assets: { code: string; name: string; amount: number }[] = [];
    const liabilities: { code: string; name: string; amount: number }[] = [];
    const equity: { code: string; name: string; amount: number }[] = [];
    for (const r of rows) {
      const amount = r.account_type === 'asset' ? Number(r.net) : -Number(r.net);
      if (amount === 0) continue;
      const item = { code: r.code, name: r.name, amount };
      if (r.account_type === 'asset') assets.push(item);
      else if (r.account_type === 'liability') liabilities.push(item);
      else if (r.account_type === 'equity') equity.push(item);
    }

    const totalAssets = assets.reduce((s, x) => s + x.amount, 0);
    const totalLiabilities = liabilities.reduce((s, x) => s + x.amount, 0);
    const totalEquity = equity.reduce((s, x) => s + x.amount, 0);
    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }

  static async getProfitLoss(fromDate: string, toDate: string): Promise<{
    revenue: { code: string; name: string; amount: number }[];
    expenses: { code: string; name: string; amount: number }[];
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }> {
    const rows = await prisma.$queryRaw<
      { account_id: number; code: string; name: string; account_type: string; net: number }[]
    >(Prisma.sql`
      SELECT coa.id as account_id, coa.code, coa.name, coa.account_type,
             COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0) as net
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date BETWEEN ${new Date(fromDate)} AND ${new Date(toDate)}
      WHERE coa.is_active = TRUE AND coa.account_type IN ('revenue', 'expense')
      GROUP BY coa.id, coa.code, coa.name, coa.account_type
      HAVING COALESCE(SUM(jel.debit), 0) <> 0 OR COALESCE(SUM(jel.credit), 0) <> 0
      ORDER BY coa.account_type, coa.code
    `);

    const revenue: { code: string; name: string; amount: number }[] = [];
    const expenses: { code: string; name: string; amount: number }[] = [];
    for (const r of rows) {
      const amount = Number(r.net);
      if (amount === 0) continue;
      const item = { code: r.code, name: r.name, amount };
      if (r.account_type === 'revenue') revenue.push(item);
      else expenses.push(item);
    }
    const totalRevenue = revenue.reduce((s, x) => s + x.amount, 0);
    const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
    return {
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }
}
