import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { POSService } from '@/lib/services/pos-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.POS_ACCESS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { barcodeOrEmail } = body;
    if (!barcodeOrEmail) {
      return NextResponse.json({ error: 'barcodeOrEmail required' }, { status: 400 });
    }

    const member = await POSService.lookupMember(barcodeOrEmail);
    return NextResponse.json(member);
  } catch (error: any) {
    console.error('Error looking up member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lookup member' },
      { status: 500 }
    );
  }
}
