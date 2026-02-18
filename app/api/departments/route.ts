import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { DepartmentService } from '@/lib/services/department-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.MEMBER_VIEW)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const departments = await DepartmentService.listAll();
    return NextResponse.json(departments);
  } catch (error: unknown) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}
