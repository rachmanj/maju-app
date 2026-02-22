import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const loanId = parseInt(id);
    if (isNaN(loanId)) {
      return NextResponse.json({ error: 'Invalid loan ID' }, { status: 400 });
    }

    const loan = await LoanService.getLoanById(loanId);
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const schedules = await LoanService.getLoanSchedules(loanId);
    const serializedSchedules = schedules.map((s: { id: number; loan_id: number; installment_number: number; due_date: Date; installment_amount: number; principal_amount: number; interest_amount: number; paid_amount: number; status: string | null }) => ({
      id: Number(s.id),
      loan_id: Number(s.loan_id),
      installment_number: s.installment_number,
      due_date: s.due_date,
      installment_amount: Number(s.installment_amount),
      principal_amount: Number(s.principal_amount),
      interest_amount: Number(s.interest_amount),
      paid_amount: Number(s.paid_amount ?? 0),
      status: s.status,
    }));

    return NextResponse.json({
      id: Number(loan.id),
      loan_number: loan.loan_number,
      member_name: loan.member_name,
      member_nik: loan.member_nik,
      principal_amount: Number(loan.principal_amount),
      interest_rate: Number(loan.interest_rate),
      term_months: loan.term_months,
      status: loan.status,
      approved_date: loan.approved_date,
      disbursed_date: loan.disbursed_date,
      schedules: serializedSchedules,
    });
  } catch (error: unknown) {
    console.error('Error fetching loan:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch loan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
