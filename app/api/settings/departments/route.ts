import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth/config';
import { DepartmentService } from '@/lib/services/department-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const all = searchParams.get('all') === 'true';
    if (all) {
      const departments = await DepartmentService.listAll();
      return NextResponse.json(departments);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;

    const result = await DepartmentService.list({ page, limit, search });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as { roles?: string[] })?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = await DepartmentService.create({
      ...body,
      created_by: parseInt(session.user.id),
    });
    return NextResponse.json({ id, message: 'Department created successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating department:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Kode departemen sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create department' },
      { status: 500 }
    );
  }
}
