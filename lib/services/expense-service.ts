import { prisma } from '@/lib/db/prisma';
import { JournalService } from './journal-service';
import { AuditService } from './audit-service';

const EXPENSE_CASH_ACCOUNT = '1020';

export class ExpenseService {
  static async listCategories(): Promise<{ id: number; code: string; name: string; account_id: number | null }[]> {
    const rows = await prisma.expense_categories.findMany({
      where: { deleted_at: null },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, account_id: true },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      account_id: r.account_id,
    }));
  }

  static async createCategory(data: {
    code: string;
    name: string;
    account_id?: number;
    created_by?: number;
  }): Promise<number> {
    const row = await prisma.expense_categories.create({
      data: {
        code: data.code,
        name: data.name,
        account_id: data.account_id ?? null,
        is_active: true,
        created_by: data.created_by != null ? BigInt(data.created_by) : null,
      },
    });
    return row.id;
  }

  static async updateCategory(
    id: number,
    data: { code?: string; name?: string; account_id?: number | null },
    updatedBy?: number
  ): Promise<void> {
    await prisma.expense_categories.update({
      where: { id },
      data: {
        ...data,
        updated_by: updatedBy != null ? BigInt(updatedBy) : null,
      },
    });
  }

  static async generateExpenseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.cash_expenses.count({
      where: {
        expense_date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
        deleted_at: null,
      },
    });
    return `EXP${year}${(count + 1).toString().padStart(6, '0')}`;
  }

  static async createExpense(data: {
    category_id: number;
    amount: number;
    expense_date: string;
    description?: string;
    reference_number?: string;
    createJournal?: boolean;
    created_by?: number;
  }): Promise<{ id: number; journal_entry_id?: number }> {
    const category = await prisma.expense_categories.findFirst({
      where: { id: data.category_id, deleted_at: null },
      include: { account: true },
    });
    if (!category) throw new Error('Category not found');

    const expenseNumber = await this.generateExpenseNumber();
    const cashAccountId = await JournalService.getAccountIdByCode(EXPENSE_CASH_ACCOUNT);
    const expenseAccountId = category.account_id ?? null;
    const canCreateJournal = data.createJournal && expenseAccountId && cashAccountId;

    let journalEntryId: number | undefined;
    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.cash_expenses.create({
        data: {
          expense_number: expenseNumber,
          category_id: data.category_id,
          amount: data.amount,
          expense_date: new Date(data.expense_date),
          description: data.description ?? null,
          reference_number: data.reference_number ?? null,
          created_by: data.created_by != null ? BigInt(data.created_by) : null,
        },
      });

      if (canCreateJournal && expenseAccountId != null && cashAccountId != null) {
        const entryNumber = await JournalService.generateEntryNumber();
        const je = await tx.journal_entries.create({
          data: {
            entry_number: entryNumber,
            entry_date: new Date(data.expense_date),
            description: `Biaya: ${category.name} - ${expenseNumber}`,
            reference_type: 'cash_expense',
            reference_id: exp.id,
            status: 'posted',
            posted_at: new Date(),
            created_by: data.created_by != null ? BigInt(data.created_by) : null,
          },
        });
        await tx.journal_entry_lines.createMany({
          data: [
            { journal_entry_id: je.id, account_id: expenseAccountId, debit: data.amount, credit: 0 },
            { journal_entry_id: je.id, account_id: cashAccountId, debit: 0, credit: data.amount },
          ],
        });
        await tx.cash_expenses.update({
          where: { id: exp.id },
          data: { journal_entry_id: je.id },
        });
        journalEntryId = Number(je.id);
      }
      return exp;
    });

    await AuditService.log({
      user_id: data.created_by,
      action: 'cash_expense.create',
      entity_type: 'cash_expense',
      entity_id: Number(expense.id),
      new_values: { expense_number: expenseNumber, amount: data.amount, category_id: data.category_id },
    });
    return { id: Number(expense.id), journal_entry_id: journalEntryId };
  }

  static async listExpenses(params: {
    fromDate?: string;
    toDate?: string;
    category_id?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    expenses: {
      id: number;
      expense_number: string;
      category_name: string;
      amount: number;
      expense_date: Date;
      description: string | null;
      journal_entry_id: number | null;
    }[];
    total: number;
  }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: { deleted_at: null; category_id?: number; expense_date?: { gte?: Date; lte?: Date } } = {
      deleted_at: null,
    };
    if (params.category_id != null) where.category_id = params.category_id;
    if (params.fromDate || params.toDate) {
      where.expense_date = {};
      if (params.fromDate) where.expense_date.gte = new Date(params.fromDate);
      if (params.toDate) where.expense_date.lte = new Date(params.toDate + 'T23:59:59');
    }

    const [rows, total] = await Promise.all([
      prisma.cash_expenses.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: { expense_date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cash_expenses.count({ where }),
    ]);

    return {
      expenses: rows.map((r) => ({
        id: Number(r.id),
        expense_number: r.expense_number,
        category_name: (r.category as { name: string }).name,
        amount: Number(r.amount),
        expense_date: r.expense_date,
        description: r.description,
        journal_entry_id: r.journal_entry_id != null ? Number(r.journal_entry_id) : null,
      })),
      total,
    };
  }

  static async getExpenseById(id: number) {
    const row = await prisma.cash_expenses.findFirst({
      where: { id, deleted_at: null },
      include: { category: { select: { id: true, code: true, name: true } } },
    });
    if (!row) return null;
    return {
      id: Number(row.id),
      expense_number: row.expense_number,
      category_id: row.category_id,
      category: row.category,
      amount: Number(row.amount),
      expense_date: row.expense_date,
      description: row.description,
      reference_number: row.reference_number,
      journal_entry_id: row.journal_entry_id != null ? Number(row.journal_entry_id) : null,
    };
  }
}
