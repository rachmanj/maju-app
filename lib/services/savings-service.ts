import { prisma } from '@/lib/db/prisma';
import type { SavingsAccount, SavingsTransaction, SavingsType } from '@/types/database';
import { generateAccountNumber } from '@/lib/utils/savings-account-number';
import { AuditService } from './audit-service';

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
    initialAmount: number = 0,
    typeCode?: string
  ): Promise<number> {
    const account = await prisma.$transaction(async (tx) => {
      const type = await tx.savings_types.findUnique({ where: { id: savingsTypeId }, select: { code: true } });
      const code = typeCode ?? type?.code ?? 'POKOK';
      const count = await tx.savings_accounts.count({
        where: { member_id: memberId, savings_type_id: savingsTypeId },
      });
      const accountNumber = generateAccountNumber(memberId, code, count + 1);
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
    await AuditService.log({
      action: 'savings.account_create',
      entity_type: 'savings_account',
      entity_id: Number(account.id),
      new_values: { member_id: memberId, savings_type_id: savingsTypeId },
    });
    return Number(account.id);
  }

  static async deposit(
    accountId: number,
    amount: number,
    referenceNumber?: string,
    notes?: string,
    createdBy?: number,
    transactionDate?: Date,
    uploadBatchId?: number
  ): Promise<void> {
    const txDate = transactionDate ?? new Date();
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
          transaction_date: txDate,
          reference_number: referenceNumber ?? null,
          notes: notes ?? null,
          created_by: createdBy != null ? BigInt(createdBy) : null,
          upload_batch_id: uploadBatchId != null ? BigInt(uploadBatchId) : null,
        },
      });
    });
    await AuditService.log({
      user_id: createdBy,
      action: 'savings.deposit',
      entity_type: 'savings_account',
      entity_id: accountId,
      new_values: { amount },
    });
  }

  static async reduceSukarela(
    memberId: number,
    amount: number,
    transactionDate?: Date,
    referenceNumber?: string,
    notes?: string,
    createdBy?: number,
    uploadBatchId?: number
  ): Promise<{ accountId: number; typeCode: string; amount: number }[]> {
    const txDate = transactionDate ?? new Date();

    const portions = await prisma.$transaction(async (tx) => {
      const types = await tx.savings_types.findMany({
        where: { code: { in: ['SUKARELA_REGULER', 'SUKARELA_SHU'] } },
        select: { id: true, code: true },
      });
      const typeByCode = Object.fromEntries(types.map((t) => [t.code, t]));
      const regulerType = typeByCode['SUKARELA_REGULER'];
      const shuType = typeByCode['SUKARELA_SHU'];
      if (!regulerType || !shuType) {
        throw new Error('Jenis simpanan Sukarela tidak ditemukan');
      }

      const accounts = await tx.savings_accounts.findMany({
        where: {
          member_id: memberId,
          closed_date: null,
          savings_type_id: { in: [regulerType.id, shuType.id] },
        },
        include: { savings_type: { select: { code: true } } },
      });

      const regulerAcc = accounts.find((a) => a.savings_type.code === 'SUKARELA_REGULER');
      const shuAcc = accounts.find((a) => a.savings_type.code === 'SUKARELA_SHU');
      const regulerBalance = Number(regulerAcc?.balance ?? 0);
      const shuBalance = Number(shuAcc?.balance ?? 0);
      const combinedBalance = regulerBalance + shuBalance;

      if (combinedBalance < amount) {
        throw new Error(
          `Saldo Sukarela tidak cukup (tersedia: ${combinedBalance.toLocaleString('id-ID')}, diminta: ${amount.toLocaleString('id-ID')})`
        );
      }

      const regulerAmount = Math.min(regulerBalance, amount);
      const shuAmount = amount - regulerAmount;
      const planned: { accountId: number; typeCode: string; amount: number }[] = [];
      if (regulerAmount > 0 && regulerAcc) {
        planned.push({ accountId: Number(regulerAcc.id), typeCode: 'SUKARELA_REGULER', amount: regulerAmount });
      }
      if (shuAmount > 0 && shuAcc) {
        planned.push({ accountId: Number(shuAcc.id), typeCode: 'SUKARELA_SHU', amount: shuAmount });
      }

      const plannedTotal = planned.reduce((sum, p) => sum + p.amount, 0);
      if (plannedTotal !== amount) {
        throw new Error('Saldo Sukarela tidak cukup');
      }

      for (const portion of planned) {
        const acc = await tx.savings_accounts.findUniqueOrThrow({
          where: { id: portion.accountId },
          select: { balance: true },
        });
        const currentBalance = Number(acc.balance ?? 0);
        if (currentBalance < portion.amount) {
          throw new Error('Saldo Sukarela tidak cukup');
        }
        const newBalance = currentBalance - portion.amount;
        await tx.savings_accounts.update({
          where: { id: portion.accountId },
          data: { balance: newBalance },
        });
        await tx.savings_transactions.create({
          data: {
            savings_account_id: portion.accountId,
            transaction_type: 'withdrawal',
            amount: portion.amount,
            balance_before: currentBalance,
            balance_after: newBalance,
            transaction_date: txDate,
            reference_number: referenceNumber ?? null,
            notes: notes ?? null,
            created_by: createdBy != null ? BigInt(createdBy) : null,
            upload_batch_id: uploadBatchId != null ? BigInt(uploadBatchId) : null,
          },
        });
      }

      return planned;
    });

    await AuditService.log({
      user_id: createdBy,
      action: 'savings.reduce_sukarela',
      entity_type: 'member',
      entity_id: memberId,
      new_values: { amount, portions },
    });

    return portions;
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
    await AuditService.log({
      user_id: createdBy,
      action: 'savings.withdraw',
      entity_type: 'savings_account',
      entity_id: accountId,
      new_values: { amount },
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
