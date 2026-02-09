import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { JournalService } from '@/lib/services/journal-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ACCOUNTING_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await JournalService.getJournalEntry(parseInt(id));
    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Error fetching journal entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch journal entry' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ACCOUNTING_JOURNAL)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.action === 'post') {
      const userId = session.user?.id ? parseInt(String(session.user.id)) : undefined;
      await JournalService.postEntry(parseInt(id), userId);
      return NextResponse.json({ message: 'Journal entry posted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error posting journal entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post journal entry' },
      { status: 500 }
    );
  }
}
