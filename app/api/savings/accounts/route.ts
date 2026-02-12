import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.SAVINGS_DEPOSIT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { member_id, savings_type_id, initial_amount } = body;

    if (!member_id || !savings_type_id) {
      return NextResponse.json(
        { error: 'member_id and savings_type_id are required' },
        { status: 400 }
      );
    }

    const accountId = await SavingsService.createSavingsAccount(
      parseInt(member_id),
      parseInt(savings_type_id),
      initial_amount ? parseFloat(initial_amount) : 0
    );

    return NextResponse.json({ id: accountId, message: 'Rekening simpanan berhasil dibuat' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating savings account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create savings account' },
      { status: 500 }
    );
  }
}
