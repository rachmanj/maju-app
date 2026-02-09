import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ExpenseService } from '@/lib/services/expense-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles ?? [], PERMISSIONS.ACCOUNTING_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const list = await ExpenseService.listCategories();
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Expense categories list:', error);
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
    const { code, name, account_id } = body;
    if (!code || !name) {
      return NextResponse.json({ error: 'code and name required' }, { status: 400 });
    }
    const id = await ExpenseService.createCategory({
      code: String(code).trim(),
      name: String(name).trim(),
      account_id: account_id != null ? parseInt(String(account_id)) : undefined,
      created_by: session.user?.id ? parseInt(String(session.user.id)) : undefined,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    console.error('Expense category create:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
