import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth/config';
import { POSSelfServiceDeviceService } from '@/lib/services/pos-self-service-device-service';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const list = await POSSelfServiceDeviceService.list();
    return NextResponse.json(list);
  } catch (error: unknown) {
    console.error('POS self-service devices list:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !hasPermission((session.user as any)?.roles || [], PERMISSIONS.ADMIN_SETTINGS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { ip_address, name, warehouse_id } = body;
    if (!ip_address || !warehouse_id) {
      return NextResponse.json(
        { error: 'ip_address dan warehouse_id wajib' },
        { status: 400 }
      );
    }
    const id = await POSSelfServiceDeviceService.create({
      ip_address: String(ip_address).trim(),
      name: name?.trim() || undefined,
      warehouse_id: parseInt(warehouse_id),
    });
    return NextResponse.json({ id, message: 'Device berhasil ditambahkan' }, { status: 201 });
  } catch (error: unknown) {
    console.error('POS self-service device create:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'IP address sudah terdaftar' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
