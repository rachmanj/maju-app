import { prisma } from '@/lib/db/prisma';
import type { Loan, LoanApplication, LoanSchedule } from '@/types/database';
import { LoanCalculator } from '../utils/loan-calculator';

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
      interest_rate: number;
      approved_by: number;
      disbursed_date?: Date;
    }
  ): Promise<number> {
    const loan = await prisma.$transaction(async (tx) => {
      const app = await tx.loan_applications.findUniqueOrThrow({ where: { id: applicationId } });
      await tx.loan_applications.update({
        where: { id: applicationId },
        data: { status: 'approved', approved_at: new Date(), approved_by: BigInt(data.approved_by) },
      });
      const loanCount = await tx.loans.count();
      const loanNumber = `LOAN${new Date().getFullYear()}${(loanCount + 1).toString().padStart(6, '0')}`;
      const l = await tx.loans.create({
        data: {
          member_id: app.member_id,
          loan_application_id: applicationId,
          loan_number: loanNumber,
          principal_amount: app.requested_amount,
          interest_rate: data.interest_rate,
          interest_method: 'flat',
          term_months: app.requested_term_months,
          status: 'approved',
          approved_date: new Date(),
          disbursed_date: data.disbursed_date ?? new Date(),
          created_by: BigInt(data.approved_by),
        },
      });
      const calculation = LoanCalculator.calculateFlatRate({
        principalAmount: Number(app.requested_amount),
        interestRate: data.interest_rate,
        termMonths: app.requested_term_months,
      });
      for (const schedule of calculation.schedules) {
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
          },
        });
      }
      return l;
    });
    return Number(loan.id);
  }

  static async getLoanById(id: number): Promise<Loan | null> {
    const l = await prisma.loans.findUnique({
      where: { id },
      include: { member: { select: { name: true, nik: true } } },
    });
    if (!l) return null;
    return {
      ...l,
      id: Number(l.id),
      member_name: l.member.name,
      member_nik: l.member.nik,
    } as unknown as Loan;
  }

  static async listLoans(params: {
    page?: number;
    limit?: number;
    member_id?: number;
    status?: string;
  }): Promise<{ loans: Loan[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.member_id != null) where.member_id = params.member_id;
    if (params.status) where.status = params.status;

    const [loans, total] = await Promise.all([
      prisma.loans.findMany({
        where,
        include: { member: { select: { name: true, nik: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loans.count({ where }),
    ]);
    const list = loans.map((l) => ({
      ...l,
      id: Number(l.id),
      member_name: l.member.name,
      member_nik: l.member.nik,
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
    return Number(payment.id);
  }
}
