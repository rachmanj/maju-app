import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { JournalService } from '@/lib/services/journal-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ACCOUNTING_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as 'draft' | 'posted' | undefined;
    const from_date = searchParams.get('from_date') || undefined;
    const to_date = searchParams.get('to_date') || undefined;

    const result = await JournalService.listJournalEntries({
      page,
      limit,
      status,
      from_date,
      to_date,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error listing journal entries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list journal entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ACCOUNTING_JOURNAL)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entry_date, description, lines } = body;

    if (!entry_date || !lines || !Array.isArray(lines)) {
      return NextResponse.json({ error: 'entry_date and lines are required' }, { status: 400 });
    }

    const journalId = await JournalService.createManualEntry({
      entry_date,
      description,
      lines: lines.map((l: any) => ({
        account_id: l.account_id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description,
      })),
      created_by: parseInt(session.user.id),
    });

    return NextResponse.json({ id: journalId, message: 'Journal entry created' });
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}
