import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ExpenseService } from '@/lib/services/expense-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles ?? [], PERMISSIONS.ACCOUNTING_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const expense = await ExpenseService.getExpenseById(parseInt(id));
    if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(expense);
  } catch (error: any) {
    console.error('Expense get:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
