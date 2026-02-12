import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { UserService } from '@/lib/services/user-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_USERS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const isActive = searchParams.get('is_active');
    const is_active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    const result = await UserService.listUsers({ page, limit, search, is_active });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_USERS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, name, phone, is_active, role_ids } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, dan nama wajib diisi' },
        { status: 400 }
      );
    }
    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      return NextResponse.json(
        { error: 'Minimal satu role harus dipilih' },
        { status: 400 }
      );
    }

    const userId = await UserService.createUser(
      {
        email,
        password,
        name,
        phone,
        is_active: is_active ?? true,
        role_ids: role_ids.map((r: number) => Number(r)),
      },
      parseInt(session.user.id)
    );

    return NextResponse.json({ id: userId, message: 'User berhasil dibuat' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
