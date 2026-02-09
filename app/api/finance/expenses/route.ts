import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ExpenseService } from '@/lib/services/expense-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles ?? [], PERMISSIONS.ACCOUNTING_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const fromDate = request.nextUrl.searchParams.get('from_date') ?? undefined;
    const toDate = request.nextUrl.searchParams.get('to_date') ?? undefined;
    const category_id = request.nextUrl.searchParams.get('category_id');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const result = await ExpenseService.listExpenses({
      fromDate,
      toDate,
      category_id: category_id ? parseInt(category_id) : undefined,
      page,
      limit,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Expenses list:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles ?? [], PERMISSIONS.ACCOUNTING_JOURNAL)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { category_id, amount, expense_date, description, reference_number, create_journal } = body;
    if (!category_id || amount == null || !expense_date) {
      return NextResponse.json(
        { error: 'category_id, amount, expense_date required' },
        { status: 400 }
      );
    }
    const result = await ExpenseService.createExpense({
      category_id: parseInt(String(category_id)),
      amount: parseFloat(String(amount)),
      expense_date: String(expense_date).slice(0, 10),
      description: description ? String(description) : undefined,
      reference_number: reference_number ? String(reference_number) : undefined,
      createJournal: !!create_journal,
      created_by: session.user?.id ? parseInt(String(session.user.id)) : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Expense create:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
