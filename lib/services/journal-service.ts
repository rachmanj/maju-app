import { prisma } from '@/lib/db/prisma';
import type { JournalEntry, JournalEntryLine } from '@/types/database';
import { AuditService } from './audit-service';

const ACCOUNT_CODES = {
  KAS: '1010',
  SIMPANAN_POKOK: '5110',
  SIMPANAN_WAJIB: '5210',
  SIMPANAN_SUKARELA: '3110',
  PIUTANG_PINJAMAN: '1211',
  PENDAPATAN_BUNGA: '6110',
};

export class JournalService {
  static async getAccountIdByCode(code: string): Promise<number | null> {
    const row = await prisma.chart_of_accounts.findUnique({
      where: { code },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  static async generateEntryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
    const count = await prisma.journal_entries.count({
      where: { entry_date: { gte: start, lte: end } },
    });
    return `J${year}${(count + 1).toString().padStart(6, '0')}`;
  }

  static async createManualEntry(data: {
    entry_date: string;
    description?: string;
    lines: { account_id: number; debit: number; credit: number; description?: string }[];
    created_by?: number;
  }): Promise<number> {
    const totalDebit = data.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = data.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Total debit must equal total credit');
    }
    if (data.lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines');
    }

    const entryNumber = await this.generateEntryNumber();
    const entry = await prisma.$transaction(async (tx) => {
      const je = await tx.journal_entries.create({
        data: {
          entry_number: entryNumber,
          entry_date: new Date(data.entry_date),
          description: data.description ?? null,
          status: 'draft',
          created_by: data.created_by != null ? BigInt(data.created_by) : null,
        },
      });
      for (const line of data.lines) {
        await tx.journal_entry_lines.create({
          data: {
            journal_entry_id: je.id,
            account_id: line.account_id,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description ?? null,
          },
        });
      }
      return je;
    });
    return Number(entry.id);
  }

  static async postEntry(journalId: number, userId?: number): Promise<void> {
    const entry = await prisma.journal_entries.findFirst({
      where: { id: journalId, status: 'draft' },
    });
    if (!entry) throw new Error('Journal entry not found or already posted');
    await prisma.journal_entries.update({
      where: { id: journalId },
      data: { status: 'posted', posted_at: new Date() },
    });
    await AuditService.log({
      user_id: userId,
      action: 'journal.post',
      entity_type: 'journal_entry',
      entity_id: journalId,
      new_values: { entry_number: entry.entry_number },
    });
  }

  static async createSavingsJournal(params: {
    savingsTypeCode: string;
    amount: number;
    isDeposit: boolean;
    referenceNumber?: string;
    description?: string;
    createdBy?: number;
  }): Promise<number> {
    const kasId = await this.getAccountIdByCode(ACCOUNT_CODES.KAS);
    let liabilityId: number | null = null;
    if (params.savingsTypeCode === 'POKOK') {
      liabilityId = await this.getAccountIdByCode(ACCOUNT_CODES.SIMPANAN_POKOK);
    } else if (params.savingsTypeCode === 'WAJIB') {
      liabilityId = await this.getAccountIdByCode(ACCOUNT_CODES.SIMPANAN_WAJIB);
    } else if (params.savingsTypeCode === 'SUKARELA') {
      liabilityId = await this.getAccountIdByCode(ACCOUNT_CODES.SIMPANAN_SUKARELA);
    }
    if (!kasId || !liabilityId) {
      throw new Error('Chart of accounts not configured');
    }

    const lines = params.isDeposit
      ? [
          { account_id: kasId, debit: params.amount, credit: 0, description: params.description },
          { account_id: liabilityId, debit: 0, credit: params.amount, description: params.description },
        ]
      : [
          { account_id: liabilityId, debit: params.amount, credit: 0, description: params.description },
          { account_id: kasId, debit: 0, credit: params.amount, description: params.description },
        ];

    return this.createManualEntry({
      entry_date: new Date().toISOString().split('T')[0],
      description: `${params.isDeposit ? 'Setor' : 'Tarik'} Simpanan ${params.savingsTypeCode} - ${params.referenceNumber || ''}`.trim(),
      lines,
      created_by: params.createdBy,
    });
  }

  static async createLoanDisbursementJournal(params: {
    principalAmount: number;
    referenceNumber?: string;
    createdBy?: number;
  }): Promise<number> {
    const kasId = await this.getAccountIdByCode(ACCOUNT_CODES.KAS);
    const piutangId = await this.getAccountIdByCode(ACCOUNT_CODES.PIUTANG_PINJAMAN);
    if (!kasId || !piutangId) {
      throw new Error('Chart of accounts not configured');
    }

    const lines = [
      { account_id: piutangId, debit: params.principalAmount, credit: 0, description: params.referenceNumber },
      { account_id: kasId, debit: 0, credit: params.principalAmount, description: params.referenceNumber },
    ];

    const journalId = await this.createManualEntry({
      entry_date: new Date().toISOString().split('T')[0],
      description: `Pencairan pinjaman - ${params.referenceNumber || ''}`.trim(),
      lines,
      created_by: params.createdBy,
    });
    await this.postEntry(journalId);
    return journalId;
  }

  static async createLoanPaymentJournal(params: {
    principalAmount: number;
    interestAmount: number;
    referenceNumber?: string;
    createdBy?: number;
  }): Promise<number> {
    const kasId = await this.getAccountIdByCode(ACCOUNT_CODES.KAS);
    const piutangId = await this.getAccountIdByCode(ACCOUNT_CODES.PIUTANG_PINJAMAN);
    const bungaId = await this.getAccountIdByCode(ACCOUNT_CODES.PENDAPATAN_BUNGA);
    if (!kasId || !piutangId || !bungaId) {
      throw new Error('Chart of accounts not configured');
    }

    const totalDebit = params.principalAmount + params.interestAmount;
    const lines: { account_id: number; debit: number; credit: number; description?: string }[] = [
      { account_id: kasId, debit: totalDebit, credit: 0, description: params.referenceNumber },
      { account_id: piutangId, debit: 0, credit: params.principalAmount, description: params.referenceNumber },
    ];
    if (params.interestAmount > 0) {
      lines.push({ account_id: bungaId, debit: 0, credit: params.interestAmount, description: params.referenceNumber });
    }

    const journalId = await this.createManualEntry({
      entry_date: new Date().toISOString().split('T')[0],
      description: `Angsuran pinjaman - ${params.referenceNumber || ''}`.trim(),
      lines,
      created_by: params.createdBy,
    });
    await this.postEntry(journalId);
    return journalId;
  }

  static async listJournalEntries(params: {
    page?: number;
    limit?: number;
    status?: 'draft' | 'posted';
    from_date?: string;
    to_date?: string;
  }): Promise<{ entries: JournalEntry[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.from_date || params.to_date) {
      where.entry_date = {
        ...(params.from_date && { gte: new Date(params.from_date) }),
        ...(params.to_date && { lte: new Date(params.to_date) }),
      };
    }

    const [entries, total] = await Promise.all([
      prisma.journal_entries.findMany({
        where,
        orderBy: [{ entry_date: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.journal_entries.count({ where }),
    ]);
    return { entries: entries as unknown as JournalEntry[], total };
  }

  static async getJournalEntry(id: number): Promise<(JournalEntry & { lines: (JournalEntryLine & { account_code: string; account_name: string })[] }) | null> {
    const entry = await prisma.journal_entries.findUnique({
      where: { id },
    });
    if (!entry) return null;

    const lines = await prisma.journal_entry_lines.findMany({
      where: { journal_entry_id: id },
      include: { account: { select: { code: true, name: true } } },
      orderBy: { id: 'asc' },
    });
    const lineList = lines.map((l) => ({
      ...l,
      account_code: l.account.code,
      account_name: l.account.name,
    }));
    return { ...entry, lines: lineList } as unknown as JournalEntry & { lines: (JournalEntryLine & { account_code: string; account_name: string })[] };
  }
}
