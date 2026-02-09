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
    });
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const schedules = await LoanService.getLoanSchedules(loanId);
    return NextResponse.json(schedules);
  } catch (error: unknown) {
    console.error('Member portal loan schedules:', error);
    const message = error instanceof Error ? error.message : 'Failed to load schedules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
