import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ExpenseService } from '@/lib/services/expense-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles ?? [], PERMISSIONS.ACCOUNTING_JOURNAL)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const body = await request.json();
    const { code, name, account_id } = body;
    const updateData: { code?: string; name?: string; account_id?: number | null } = {};
    if (code != null) updateData.code = String(code).trim();
    if (name != null) updateData.name = String(name).trim();
    if (account_id !== undefined) {
      updateData.account_id = account_id == null ? null : parseInt(String(account_id));
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    const userId = session.user?.id ? parseInt(String(session.user.id)) : undefined;
    await ExpenseService.updateCategory(categoryId, updateData, userId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Expense category update:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
