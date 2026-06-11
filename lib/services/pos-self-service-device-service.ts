import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';

const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;

export type POSSelfServiceDevice = {
  id: number;
  device_token: string | null;
  is_paired: boolean;
  pairing_code: string | null;
  pairing_expires_at: string | null;
  name: string | null;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  is_active: boolean;
};

type DeviceWithWarehouse = {
  id: number;
  warehouse_id: number;
  warehouse_code: string;
  warehouse_name: string;
  name: string | null;
  device_token: string | null;
};

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function mapRow(r: {
  id: bigint;
  device_token: string | null;
  pairing_code: string | null;
  pairing_expires_at: Date | null;
  name: string | null;
  warehouse_id: bigint;
  is_active: boolean | null;
  warehouse?: { code: string; name: string } | null;
}): POSSelfServiceDevice {
  return {
    id: Number(r.id),
    device_token: r.device_token,
    is_paired: !!r.device_token && !r.pairing_code,
    pairing_code: r.pairing_code,
    pairing_expires_at: r.pairing_expires_at?.toISOString() ?? null,
    name: r.name,
    warehouse_id: Number(r.warehouse_id),
    warehouse_code: r.warehouse?.code,
    warehouse_name: r.warehouse?.name,
    is_active: r.is_active ?? true,
  };
}

function mapDeviceWithWarehouse(r: {
  id: bigint;
  device_token: string | null;
  name: string | null;
  warehouse_id: bigint;
  warehouse?: { code: string; name: string } | null;
}): DeviceWithWarehouse {
  return {
    id: Number(r.id),
    warehouse_id: Number(r.warehouse_id),
    warehouse_code: r.warehouse?.code ?? '',
    warehouse_name: r.warehouse?.name ?? '',
    name: r.name,
    device_token: r.device_token,
  };
}

export class POSSelfServiceDeviceService {
  static async list(): Promise<POSSelfServiceDevice[]> {
    const rows = await prisma.pos_self_service_devices.findMany({
      where: {},
      include: {
        warehouse: { select: { code: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(mapRow);
  }

  static async getByToken(token: string): Promise<DeviceWithWarehouse | null> {
    if (!token.trim()) return null;
    const row = await prisma.pos_self_service_devices.findFirst({
      where: {
        device_token: token.trim(),
        is_active: true,
      },
      include: {
        warehouse: { select: { code: true, name: true } },
      },
    });
    if (!row) return null;
    return mapDeviceWithWarehouse(row);
  }

  static async create(data: {
    name?: string;
    warehouse_id: number;
  }): Promise<number> {
    const row = await prisma.pos_self_service_devices.create({
      data: {
        name: data.name?.trim() || null,
        warehouse_id: BigInt(data.warehouse_id),
      },
    });
    return Number(row.id);
  }

  static async update(
    id: number,
    data: { name?: string; warehouse_id?: number; is_active?: boolean }
  ): Promise<void> {
    const update: Record<string, unknown> = {};
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

  static async generatePairingCode(id: number): Promise<{
    pairing_code: string;
    expires_at: string;
  }> {
    const existing = await prisma.pos_self_service_devices.findUnique({
      where: { id: BigInt(id) },
      select: { device_token: true },
    });
    if (!existing) throw new Error('Device tidak ditemukan');

    const pairingCode = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
    await prisma.pos_self_service_devices.update({
      where: { id: BigInt(id) },
      data: {
        device_token: existing.device_token ?? randomUUID(),
        pairing_code: pairingCode,
        pairing_expires_at: expiresAt,
      },
    });
    return {
      pairing_code: pairingCode,
      expires_at: expiresAt.toISOString(),
    };
  }

  static async claimPairingCode(code: string): Promise<DeviceWithWarehouse | null> {
    const normalized = code.trim();
    if (!/^\d{6}$/.test(normalized)) return null;

    const row = await prisma.pos_self_service_devices.findFirst({
      where: {
        pairing_code: normalized,
        is_active: true,
      },
      include: {
        warehouse: { select: { code: true, name: true } },
      },
    });
    if (!row || !row.device_token) return null;
    if (!row.pairing_expires_at || row.pairing_expires_at < new Date()) return null;

    await prisma.pos_self_service_devices.update({
      where: { id: row.id },
      data: {
        pairing_code: null,
        pairing_expires_at: null,
      },
    });

    return mapDeviceWithWarehouse(row);
  }

  static async unpair(id: number): Promise<void> {
    await prisma.pos_self_service_devices.update({
      where: { id: BigInt(id) },
      data: {
        pairing_code: null,
        pairing_expires_at: null,
        device_token: null,
      },
    });
  }
}
