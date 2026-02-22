import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_APPROVE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_DISBURSE)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const applicationId = parseInt(id);
    if (isNaN(applicationId)) {
      return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { interest_rate, disbursed_date } = body;

    if (interest_rate == null || interest_rate < 0) {
      return NextResponse.json(
        { error: 'Bunga (interest_rate) wajib diisi dan harus >= 0' },
        { status: 400 }
      );
    }

    const userId = session.user?.id ? parseInt(session.user.id) : 0;
    const loanId = await LoanService.approveAndCreateLoan(applicationId, {
      interest_rate: Number(interest_rate),
      approved_by: userId,
      disbursed_date: disbursed_date ? new Date(disbursed_date) : undefined,
    });

    return NextResponse.json({ id: loanId, message: 'Pinjaman berhasil disetujui dan didisbursement' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error approving loan:', error);
    const message = error instanceof Error ? error.message : 'Failed to approve loan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
