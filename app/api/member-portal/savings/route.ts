import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SavingsService } from '@/lib/services/savings-service';

export async function GET() {
  try {
    const session = await auth();
    const memberId = (session?.user as { memberId?: number | null })?.memberId;
    if (!session || memberId == null || memberId === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await SavingsService.getMemberSavingsAccounts(memberId);
    return NextResponse.json(
      accounts.map((a) => ({
        id: a.id,
        account_number: a.account_number,
        savings_type_code: (a as any).savings_type_code,
        savings_type_name: (a as any).savings_type_name,
        balance: Number(a.balance),
        opened_date: a.opened_date,
      }))
    );
  } catch (error: any) {
    console.error('Member portal savings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load savings' },
      { status: 500 }
    );
  }
}
