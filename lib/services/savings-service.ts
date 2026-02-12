import { prisma } from '@/lib/db/prisma';
import type { SavingsAccount, SavingsTransaction, SavingsType } from '@/types/database';

function toAccount(rows: { id: bigint; member_id: bigint; savings_type_id: number; account_number: string | null; balance: unknown; opened_date: Date; closed_date: Date | null; created_at: Date | null; updated_at: Date | null } & { savings_type?: { code: string; name: string } }): SavingsAccount {
  return {
    ...rows,
    id: Number(rows.id),
    member_id: Number(rows.member_id),
    balance: Number(rows.balance),
    savings_type_code: (rows as any).savings_type?.code,
    savings_type_name: (rows as any).savings_type?.name,
  } as unknown as SavingsAccount;
}

export class SavingsService {
  static async getSavingsTypes(): Promise<SavingsType[]> {
    const rows = await prisma.savings_types.findMany({ orderBy: { code: 'asc' } });
    return rows as unknown as SavingsType[];
  }

  static async getSavingsAccount(memberId: number, savingsTypeId: number): Promise<SavingsAccount | null> {
    const row = await prisma.savings_accounts.findFirst({
      where: { member_id: memberId, savings_type_id: savingsTypeId, closed_date: null },
    });
    return row ? toAccount(row as any) : null;
  }

  static async getAccountsByType(savingsTypeId: number): Promise<(SavingsAccount & { member_name?: string; member_nik?: string })[]> {
    const rows = await prisma.savings_accounts.findMany({
      where: { savings_type_id: savingsTypeId, closed_date: null },
      include: {
        savings_type: { select: { code: true, name: true } },
        member: { select: { name: true, nik: true } },
      },
      orderBy: { account_number: 'asc' },
    });
    return rows.map((r) => ({
      ...toAccount(r as any),
      member_name: (r as any).member?.name,
      member_nik: (r as any).member?.nik,
    }));
  }

  static async getMemberSavingsAccounts(memberId: number): Promise<SavingsAccount[]> {
    const rows = await prisma.savings_accounts.findMany({
      where: { member_id: memberId, closed_date: null },
      include: { savings_type: { select: { code: true, name: true } } },
      orderBy: { savings_type: { code: 'asc' } },
    });
    return rows.map((r) => toAccount(r as any));
  }

  static async createSavingsAccount(
    memberId: number,
    savingsTypeId: number,
    initialAmount: number = 0
  ): Promise<number> {
    const account = await prisma.$transaction(async (tx) => {
      const count = await tx.savings_accounts.count({ where: { savings_type_id: savingsTypeId } });
      const accountNumber = `SAV${savingsTypeId}${(count + 1).toString().padStart(8, '0')}`;
      const acc = await tx.savings_accounts.create({
        data: {
          member_id: memberId,
          savings_type_id: savingsTypeId,
          account_number: accountNumber,
          balance: initialAmount,
          opened_date: new Date(),
        },
      });
      if (initialAmount > 0) {
        await tx.savings_transactions.create({
          data: {
            savings_account_id: acc.id,
            transaction_type: 'deposit',
            amount: initialAmount,
            balance_before: 0,
            balance_after: initialAmount,
            transaction_date: new Date(),
          },
        });
      }
      return acc;
    });
    return Number(account.id);
  }

  static async deposit(
    accountId: number,
    amount: number,
    referenceNumber?: string,
    notes?: string,
    createdBy?: number
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const acc = await tx.savings_accounts.findUniqueOrThrow({
        where: { id: accountId },
        select: { balance: true },
      });
      const currentBalance = Number(acc.balance ?? 0);
      const newBalance = currentBalance + amount;
      await tx.savings_accounts.update({
        where: { id: accountId },
        data: { balance: newBalance },
      });
      await tx.savings_transactions.create({
        data: {
          savings_account_id: accountId,
          transaction_type: 'deposit',
          amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          transaction_date: new Date(),
          reference_number: referenceNumber ?? null,
          notes: notes ?? null,
          created_by: createdBy != null ? BigInt(createdBy) : null,
        },
      });
    });
  }

  static async withdraw(
    accountId: number,
    amount: number,
    referenceNumber?: string,
    notes?: string,
    createdBy?: number
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const acc = await tx.savings_accounts.findUnique({
        where: { id: accountId },
        include: { savings_type: { select: { is_withdrawable: true } } },
      });
      if (!acc) throw new Error('Savings account not found');
      if (!acc.savings_type.is_withdrawable) throw new Error('This savings type is not withdrawable');
      const currentBalance = Number(acc.balance ?? 0);
      if (currentBalance < amount) throw new Error('Insufficient balance');
      const newBalance = currentBalance - amount;
      await tx.savings_accounts.update({
        where: { id: accountId },
        data: { balance: newBalance },
      });
      await tx.savings_transactions.create({
        data: {
          savings_account_id: accountId,
          transaction_type: 'withdrawal',
          amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          transaction_date: new Date(),
          reference_number: referenceNumber ?? null,
          notes: notes ?? null,
          created_by: createdBy != null ? BigInt(createdBy) : null,
        },
      });
    });
  }

  static async getTransactionHistory(
    accountId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: SavingsTransaction[]; total: number }> {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      prisma.savings_transactions.findMany({
        where: { savings_account_id: accountId },
        orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.savings_transactions.count({ where: { savings_account_id: accountId } }),
    ]);
    return {
      transactions: transactions.map((t) => ({ ...t, id: Number(t.id), amount: Number(t.amount), balance_before: Number(t.balance_before), balance_after: Number(t.balance_after) })) as unknown as SavingsTransaction[],
      total,
    };
  }
}
