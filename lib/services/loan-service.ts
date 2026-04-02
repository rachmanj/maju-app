import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { Loan, LoanApplication, LoanSchedule } from '@/types/database';
import { LoanCalculator } from '../utils/loan-calculator';
import { AuditService } from './audit-service';
import { JournalService } from './journal-service';

export class LoanService {
  static async createApplication(data: {
    member_id: number;
    requested_amount: number;
    requested_term_months: number;
    purpose?: string;
  }): Promise<number> {
    const count = await prisma.loan_applications.count();
    const applicationNumber = `APP${new Date().getFullYear()}${(count + 1).toString().padStart(6, '0')}`;
    const app = await prisma.loan_applications.create({
      data: {
        member_id: data.member_id,
        application_number: applicationNumber,
        requested_amount: data.requested_amount,
        requested_term_months: data.requested_term_months,
        purpose: data.purpose ?? null,
        status: 'pending',
      },
    });
    return Number(app.id);
  }

  static async approveAndCreateLoan(
    applicationId: number,
    data: {
      interest_method: 'flat' | 'flat_total' | 'manual';
      interest_rate?: number;
      monthly_amount?: number;
      approved_by: number;
      disbursed_date?: Date;
    }
  ): Promise<number> {
    const loan = await prisma.$transaction(async (tx) => {
      const app = await tx.loan_applications.findUniqueOrThrow({ where: { id: applicationId } });
      const principal = Number(app.requested_amount);
      const term = app.requested_term_months;

      await tx.loan_applications.update({
        where: { id: applicationId },
        data: { status: 'approved', approved_at: new Date(), approved_by: BigInt(data.approved_by) },
      });
      const loanCount = await tx.loans.count();
      const loanNumber = `LOAN${new Date().getFullYear()}${(loanCount + 1).toString().padStart(6, '0')}`;

      let schedules: { installmentNumber: number; dueDate: Date; installmentAmount: number; principalAmount: number; interestAmount: number }[];
      let interestRate: number;
      let interestMethod: string;

      if (data.interest_method === 'manual' && data.monthly_amount != null) {
        const calc = LoanCalculator.calculateManualAmount({
          principalAmount: principal,
          termMonths: term,
          monthlyAmount: data.monthly_amount,
        });
        schedules = calc.schedules;
        interestRate = calc.totalInterest > 0 ? (calc.totalInterest / principal) * 100 : 0;
        interestMethod = 'manual';
      } else if (data.interest_method === 'flat' && data.interest_rate != null) {
        const calc = LoanCalculator.calculateFlatRate({
          principalAmount: principal,
          interestRate: data.interest_rate,
          termMonths: term,
        });
        schedules = calc.schedules;
        interestRate = data.interest_rate;
        interestMethod = 'flat';
      } else {
        const rate = data.interest_rate ?? 0;
        const calc = LoanCalculator.calculateFlatTotalRate({
          principalAmount: principal,
          interestRateTotal: rate,
          termMonths: term,
        });
        schedules = calc.schedules;
        interestRate = rate;
        interestMethod = 'flat_total';
      }

      const l = await tx.loans.create({
        data: {
          member_id: app.member_id,
          loan_application_id: applicationId,
          loan_number: loanNumber,
          principal_amount: app.requested_amount,
          interest_rate: interestRate,
          interest_method: interestMethod,
          term_months: app.requested_term_months,
          status: 'approved',
          approved_date: new Date(),
          disbursed_date: data.disbursed_date ?? new Date(),
          created_by: BigInt(data.approved_by),
        },
      });
      for (const schedule of schedules) {
        await tx.loan_schedules.create({
          data: {
            loan_id: l.id,
            installment_number: schedule.installmentNumber,
            due_date: schedule.dueDate,
            original_due_date: schedule.dueDate,
            installment_amount: schedule.installmentAmount,
            principal_amount: schedule.principalAmount,
            interest_amount: schedule.interestAmount,
            status: 'pending',
            is_manual_amount: interestMethod === 'manual',
          },
        });
      }
      return l;
    });
    await AuditService.log({
      user_id: data.approved_by,
      action: 'loan.approve',
      entity_type: 'loan',
      entity_id: Number(loan.id),
      new_values: { loan_number: loan.loan_number, principal_amount: Number(loan.principal_amount) },
    });
    const disbursedDate = loan.disbursed_date ?? new Date();
    await JournalService.createLoanDisbursementJournal({
      principalAmount: Number(loan.principal_amount),
      referenceNumber: loan.loan_number,
      entryDate: disbursedDate.toISOString().split('T')[0],
      createdBy: data.approved_by,
    });
    return Number(loan.id);
  }

  static async deleteLoan(id: number, deletedBy: number): Promise<void> {
    const loan = await prisma.loans.findUnique({
      where: { id },
      select: { loan_number: true, principal_amount: true },
    });
    if (!loan) return;
    await prisma.loans.delete({ where: { id } });
    await AuditService.log({
      user_id: deletedBy,
      action: 'loan.delete',
      entity_type: 'loan',
      entity_id: id,
      old_values: { loan_number: loan.loan_number, principal_amount: Number(loan.principal_amount) },
    });
  }

  static async getLoanById(id: number): Promise<Loan | null> {
    const l = await prisma.loans.findUnique({
      where: { id },
      include: { member: { select: { name: true, nik: true, member_number: true } } },
    });
    if (!l) return null;
    return {
      ...l,
      id: Number(l.id),
      member_name: l.member.name,
      member_nik: l.member.nik ?? '',
      member_number: l.member.member_number ?? null,
    } as unknown as Loan;
  }

  static async listApplications(params: {
    page?: number;
    limit?: number;
    member_id?: number;
    status?: string;
  }): Promise<{ applications: Array<{
    id: number;
    application_number: string;
    member_id: number;
    member_name: string;
    member_nik: string;
    requested_amount: number;
    requested_term_months: number;
    purpose: string | null;
    status: string | null;
    applied_at: Date | null;
  }>; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.member_id != null) where.member_id = params.member_id;
    if (params.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.loan_applications.findMany({
        where,
        include: { member: { select: { name: true, nik: true } } },
        orderBy: { applied_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loan_applications.count({ where }),
    ]);
    const applications = rows.map((a) => ({
      id: Number(a.id),
      application_number: a.application_number,
      member_id: Number(a.member_id),
      member_name: a.member.name,
      member_nik: a.member.nik ?? '',
      requested_amount: Number(a.requested_amount),
      requested_term_months: a.requested_term_months,
      purpose: a.purpose,
      status: a.status,
      applied_at: a.applied_at,
    }));
    return { applications, total };
  }

  static async getApplicationById(id: number) {
    const app = await prisma.loan_applications.findUnique({
      where: { id },
      include: { member: { select: { name: true, nik: true } } },
    });
    if (!app) return null;
    return {
      ...app,
      id: Number(app.id),
      member_id: Number(app.member_id),
      requested_amount: Number(app.requested_amount),
      member_name: app.member.name,
      member_nik: app.member.nik,
    };
  }

  static async listLoans(params: {
    page?: number;
    limit?: number;
    member_id?: number;
    status?: string;
    member_search?: string;
    project_id?: number;
  }): Promise<{ loans: Loan[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Prisma.loansWhereInput = {};

    if (params.member_id != null) {
      where.member_id = params.member_id;
    } else {
      const search = params.member_search?.trim();
      const projectId = params.project_id;
      const memberFilter: Prisma.membersWhereInput = { deleted_at: null };
      if (projectId != null && projectId > 0) {
        memberFilter.project_id = projectId;
      }
      if (search) {
        memberFilter.OR = [
          { name: { contains: search } },
          { nik: { contains: search } },
          { member_number: { contains: search } },
        ];
      }
      where.member = memberFilter;
    }

    if (params.status) where.status = params.status;

    const [loans, total] = await Promise.all([
      prisma.loans.findMany({
        where,
        include: {
          member: {
            select: {
              name: true,
              nik: true,
              member_number: true,
              project: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loans.count({ where }),
    ]);
    const list = loans.map((l) => ({
      id: Number(l.id),
      member_id: Number(l.member_id),
      loan_application_id: l.loan_application_id != null ? Number(l.loan_application_id) : null,
      loan_number: l.loan_number,
      principal_amount: Number(l.principal_amount),
      interest_rate: Number(l.interest_rate),
      interest_method: l.interest_method,
      term_months: l.term_months,
      status: l.status,
      approved_date: l.approved_date,
      disbursed_date: l.disbursed_date,
      completed_date: l.completed_date,
      created_at: l.created_at,
      updated_at: l.updated_at,
      created_by: l.created_by != null ? Number(l.created_by) : null,
      member_name: l.member.name,
      member_nik: l.member.nik,
      member_number: l.member.member_number ?? null,
      project_code: l.member.project?.code ?? null,
      project_name: l.member.project?.name ?? null,
    }));
    return { loans: list as unknown as Loan[], total };
  }

  static async getLoanSchedules(loanId: number): Promise<LoanSchedule[]> {
    const rows = await prisma.loan_schedules.findMany({
      where: { loan_id: loanId },
      orderBy: { installment_number: 'asc' },
    });
    return rows.map((s) => ({
      ...s,
      id: Number(s.id),
      loan_id: Number(s.loan_id),
      installment_amount: Number(s.installment_amount),
      principal_amount: Number(s.principal_amount),
      interest_amount: Number(s.interest_amount),
      paid_amount: Number(s.paid_amount ?? 0),
    })) as unknown as LoanSchedule[];
  }

  static async updateScheduleDueDate(
    scheduleId: number,
    newDueDate: Date,
    reason?: string,
    updatedBy?: number
  ): Promise<void> {
    await prisma.loan_schedules.update({
      where: { id: scheduleId },
      data: {
        due_date: newDueDate,
        is_due_date_overridden: true,
        overridden_by: updatedBy != null ? BigInt(updatedBy) : null,
        overridden_at: new Date(),
        override_reason: reason ?? null,
      },
    });
  }

  static async updateScheduleAmount(
    scheduleId: number,
    newAmount: number,
    updatedBy?: number
  ): Promise<void> {
    const schedule = await prisma.loan_schedules.findUniqueOrThrow({ where: { id: scheduleId } });
    const interestAmount = Number(schedule.interest_amount);
    const principalAmount = Math.max(0, newAmount - interestAmount);
    await prisma.loan_schedules.update({
      where: { id: scheduleId },
      data: {
        installment_amount: newAmount,
        principal_amount: principalAmount,
        is_manual_amount: true,
      },
    });
  }

  static async recordPayment(data: {
    loan_id: number;
    loan_schedule_id?: number;
    payment_amount: number;
    principal_amount: number;
    interest_amount: number;
    payment_date: Date;
    payment_method: 'cash' | 'salary_deduction' | 'savings' | 'transfer';
    reference_number?: string;
    notes?: string;
    created_by?: number;
    debitAccountId?: number;
  }): Promise<number> {
    const payment = await prisma.$transaction(async (tx) => {
      const payCount = await tx.loan_payments.count();
      const paymentNumber = `PAY${new Date().getFullYear()}${(payCount + 1).toString().padStart(6, '0')}`;
      const pay = await tx.loan_payments.create({
        data: {
          loan_id: data.loan_id,
          loan_schedule_id: data.loan_schedule_id ?? null,
          payment_number: paymentNumber,
          payment_amount: data.payment_amount,
          principal_amount: data.principal_amount,
          interest_amount: data.interest_amount,
          payment_date: data.payment_date,
          payment_method: data.payment_method,
          reference_number: data.reference_number ?? null,
          notes: data.notes ?? null,
          created_by: data.created_by != null ? BigInt(data.created_by) : null,
        },
      });
      if (data.loan_schedule_id) {
        const sched = await tx.loan_schedules.findUniqueOrThrow({
          where: { id: data.loan_schedule_id },
          select: { paid_amount: true, installment_amount: true },
        });
        const newPaid = Number(sched.paid_amount ?? 0) + data.payment_amount;
        const isPaid = newPaid >= Number(sched.installment_amount);
        await tx.loan_schedules.update({
          where: { id: data.loan_schedule_id },
          data: {
            paid_amount: newPaid,
            status: isPaid ? 'paid' : 'pending',
            paid_at: isPaid ? new Date() : undefined,
          },
        });
      }
      const totalCount = await tx.loan_schedules.count({ where: { loan_id: data.loan_id } });
      const paidCount = await tx.loan_schedules.count({
        where: { loan_id: data.loan_id, status: 'paid' },
      });
      if (totalCount > 0 && paidCount === totalCount) {
        await tx.loans.update({
          where: { id: data.loan_id },
          data: { status: 'completed', completed_date: new Date() },
        });
      }
      return pay;
    });
    await AuditService.log({
      user_id: data.created_by,
      action: 'loan.payment',
      entity_type: 'loan',
      entity_id: data.loan_id,
      new_values: { payment_amount: data.payment_amount, payment_date: data.payment_date },
    });
    const paymentNumber = payment.payment_number ?? undefined;
    await JournalService.createLoanPaymentJournal({
      principalAmount: data.principal_amount,
      interestAmount: data.interest_amount,
      referenceNumber: paymentNumber,
      entryDate: data.payment_date.toISOString().split('T')[0],
      createdBy: data.created_by,
      debitAccountId: data.debitAccountId,
    });
    return Number(payment.id);
  }

  static async importLoanFromExcelRow(params: {
    memberIdentifier: string;
    principalAmount: number;
    interestRate: number;
    interestMethod: 'flat' | 'flat_total' | 'manual';
    termMonths: number;
    disbursedDate: Date;
    monthlyAmount?: number;
    sisaPokok?: number;
    angsuranTerakhirDibayar?: number;
    createdBy: number;
  }): Promise<{ loanId: number; loanNumber: string }> {
    const member = await prisma.members.findFirst({
      where: {
        deleted_at: null,
        OR: [{ nik: params.memberIdentifier }, { member_number: params.memberIdentifier }],
      },
      select: { id: true },
    });
    if (!member) {
      throw new Error(`Anggota tidak ditemukan: ${params.memberIdentifier}`);
    }

    const isModeB = params.sisaPokok != null && params.sisaPokok > 0 && (params.angsuranTerakhirDibayar ?? 0) > 0;
    const effectivePrincipal = isModeB ? params.sisaPokok! : params.principalAmount;
    const effectiveTerm = isModeB
      ? params.termMonths - (params.angsuranTerakhirDibayar ?? 0)
      : params.termMonths;

    if (effectivePrincipal <= 0 || effectiveTerm <= 0) {
      throw new Error('Pokok/sisa pokok dan tenor sisa harus positif');
    }

    let schedules: { installmentNumber: number; dueDate: Date; installmentAmount: number; principalAmount: number; interestAmount: number }[];
    let interestRate: number;
    let interestMethod: string;
    const scheduleStartDate = new Date(params.disbursedDate);
    scheduleStartDate.setDate(1);
    if (isModeB) {
      scheduleStartDate.setMonth(scheduleStartDate.getMonth() + (params.angsuranTerakhirDibayar ?? 0));
    }

    if (params.interestMethod === 'manual' && params.monthlyAmount != null) {
      const calc = LoanCalculator.calculateManualAmount({
        principalAmount: effectivePrincipal,
        termMonths: effectiveTerm,
        monthlyAmount: params.monthlyAmount,
        startDate: scheduleStartDate,
      });
      schedules = calc.schedules;
      interestRate = calc.totalInterest > 0 ? (calc.totalInterest / effectivePrincipal) * 100 : 0;
      interestMethod = 'manual';
    } else if (params.interestMethod === 'flat') {
      const calc = LoanCalculator.calculateFlatRate({
        principalAmount: effectivePrincipal,
        interestRate: params.interestRate,
        termMonths: effectiveTerm,
        startDate: scheduleStartDate,
      });
      schedules = calc.schedules;
      interestRate = params.interestRate;
      interestMethod = 'flat';
    } else {
      const calc = LoanCalculator.calculateFlatTotalRate({
        principalAmount: effectivePrincipal,
        interestRateTotal: params.interestRate,
        termMonths: effectiveTerm,
        startDate: scheduleStartDate,
      });
      schedules = calc.schedules;
      interestRate = params.interestRate;
      interestMethod = 'flat_total';
    }

    const loan = await prisma.$transaction(async (tx) => {
      const loanCount = await tx.loans.count();
      const loanNumber = `LOAN${new Date().getFullYear()}${(loanCount + 1).toString().padStart(6, '0')}`;

      const l = await tx.loans.create({
        data: {
          member_id: member.id,
          loan_application_id: null,
          loan_number: loanNumber,
          principal_amount: effectivePrincipal,
          interest_rate: interestRate,
          interest_method: interestMethod,
          term_months: effectiveTerm,
          status: 'approved',
          approved_date: params.disbursedDate,
          disbursed_date: params.disbursedDate,
          created_by: BigInt(params.createdBy),
        },
      });

      for (const schedule of schedules) {
        await tx.loan_schedules.create({
          data: {
            loan_id: l.id,
            installment_number: schedule.installmentNumber,
            due_date: schedule.dueDate,
            original_due_date: schedule.dueDate,
            installment_amount: schedule.installmentAmount,
            principal_amount: schedule.principalAmount,
            interest_amount: schedule.interestAmount,
            status: 'pending',
            is_manual_amount: interestMethod === 'manual',
          },
        });
      }
      return l;
    });

    await JournalService.createLoanOpeningBalanceJournal({
      principalAmount: effectivePrincipal,
      referenceNumber: loan.loan_number,
      entryDate: params.disbursedDate.toISOString().split('T')[0],
      createdBy: params.createdBy,
    });

    return { loanId: Number(loan.id), loanNumber: loan.loan_number };
  }
}
