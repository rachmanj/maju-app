import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { LoanService } from '@/lib/services/loan-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_PAYMENT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const loanId = parseInt(id);
    if (isNaN(loanId)) {
      return NextResponse.json({ error: 'Invalid loan ID' }, { status: 400 });
    }

    const quote = await LoanService.getEarlySettlementQuote(loanId);
    return NextResponse.json(quote);
  } catch (error: unknown) {
    console.error('Error fetching early settlement quote:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch quote';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles ?? [], PERMISSIONS.LOAN_PAYMENT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const loanId = parseInt(id);
    if (isNaN(loanId)) {
      return NextResponse.json({ error: 'Invalid loan ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      payment_date,
      payment_method = 'cash',
      reference_number,
      notes,
      debit_account_id,
    } = body;

    if (!payment_date) {
      return NextResponse.json({ error: 'payment_date wajib diisi' }, { status: 400 });
    }

    const debitAccountId =
      debit_account_id != null && !isNaN(parseInt(debit_account_id, 10))
        ? parseInt(debit_account_id, 10)
        : undefined;

    const paymentId = await LoanService.processEarlySettlement({
      loan_id: loanId,
      payment_date: new Date(payment_date),
      payment_method: ['cash', 'salary_deduction', 'savings', 'transfer'].includes(payment_method)
        ? payment_method
        : 'cash',
      reference_number: reference_number || undefined,
      notes: notes || undefined,
      created_by: session.user?.id ? parseInt(session.user.id) : undefined,
      debitAccountId,
    });

    return NextResponse.json(
      { id: paymentId, message: 'Pelunasan dini berhasil dicatat' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error processing early settlement:', error);
    const message = error instanceof Error ? error.message : 'Failed to process early settlement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
