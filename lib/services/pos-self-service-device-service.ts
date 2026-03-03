import { prisma } from '@/lib/db/prisma';

export type POSSelfServiceDevice = {
  id: number;
  ip_address: string;
  name: string | null;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  is_active: boolean;
};

export class POSSelfServiceDeviceService {
  static async list(): Promise<POSSelfServiceDevice[]> {
    const rows = await prisma.pos_self_service_devices.findMany({
      where: {},
      include: {
        warehouse: { select: { code: true, name: true } },
      },
      orderBy: { ip_address: 'asc' },
    });
    return rows.map((r) => ({
      id: Number(r.id),
      ip_address: r.ip_address,
      name: r.name,
      warehouse_id: Number(r.warehouse_id),
      warehouse_code: r.warehouse?.code,
      warehouse_name: r.warehouse?.name,
      is_active: r.is_active ?? true,
    }));
  }

  static async getByIp(ipAddress: string): Promise<{
    id: number;
    warehouse_id: number;
    warehouse_code: string;
    warehouse_name: string;
    name: string | null;
  } | null> {
    const row = await prisma.pos_self_service_devices.findFirst({
      where: {
        ip_address: ipAddress,
        is_active: true,
      },
      include: {
        warehouse: { select: { code: true, name: true } },
      },
    });
    if (!row) return null;
    return {
      id: Number(row.id),
      warehouse_id: Number(row.warehouse_id),
      warehouse_code: row.warehouse?.code ?? '',
      warehouse_name: row.warehouse?.name ?? '',
      name: row.name,
    };
  }

  static async create(data: {
    ip_address: string;
    name?: string;
    warehouse_id: number;
  }): Promise<number> {
    const row = await prisma.pos_self_service_devices.create({
      data: {
        ip_address: data.ip_address.trim(),
        name: data.name?.trim() || null,
        warehouse_id: BigInt(data.warehouse_id),
      },
    });
    return Number(row.id);
  }

  static async update(
    id: number,
    data: { ip_address?: string; name?: string; warehouse_id?: number; is_active?: boolean }
  ): Promise<void> {
    const update: Record<string, unknown> = {};
    if (data.ip_address !== undefined) update.ip_address = data.ip_address.trim();
    if (data.name !== undefined) update.name = data.name?.trim() || null;
    if (data.warehouse_id !== undefined) update.warehouse_id = BigInt(data.warehouse_id);
    if (data.is_active !== undefined) update.is_active = data.is_active;
    await prisma.pos_self_service_devices.update({
      where: { id: BigInt(id) },
      data: update as Parameters<typeof prisma.pos_self_service_devices.update>[0]['data'],
    });
  }

  static async delete(id: number): Promise<void> {
    await prisma.pos_self_service_devices.delete({
      where: { id: BigInt(id) },
    });
  }
}
