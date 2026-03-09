import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const loanId = parseInt(id);
    const loan = await prisma.loans.findFirst({
      where: { id: loanId, member_id: memberId },
      include: { member: { select: { name: true, nik: true, member_number: true } } },
    });
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const schedules = await LoanService.getLoanSchedules(loanId);
    const serializedSchedules = schedules.map((s) => ({
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
      member_name: loan.member.name,
      member_nik: loan.member.nik ?? '',
      member_number: loan.member.member_number ?? null,
      principal_amount: Number(loan.principal_amount),
      interest_rate: Number(loan.interest_rate),
      term_months: loan.term_months,
      status: loan.status,
      approved_date: loan.approved_date,
      disbursed_date: loan.disbursed_date,
      schedules: serializedSchedules,
    });
  } catch (error: unknown) {
    console.error('Member portal loan detail:', error);
    const message = error instanceof Error ? error.message : 'Failed to load loan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
