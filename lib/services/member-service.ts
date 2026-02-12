import { prisma } from '@/lib/db/prisma';
import type { Member } from '@/types/database';
import bcrypt from 'bcryptjs';

export class MemberService {
  static async createMember(data: {
    nik: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    job_title?: string;
    project_id?: number;
    joined_date?: Date;
    created_by?: number;
  }): Promise<number> {
    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.members.create({
        data: {
          nik: data.nik,
          name: data.name,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          job_title: data.job_title ?? null,
          project_id: data.project_id ?? null,
          status: 'pending',
          joined_date: data.joined_date ?? new Date(),
          created_by: data.created_by ?? null,
        },
      });
      const memberId = Number(m.id);
      const barcode = `MBR${memberId.toString().padStart(8, '0')}`;
      await tx.member_barcodes.create({
        data: { member_id: m.id, barcode },
      });
      await tx.member_purchase_limits.create({
        data: { member_id: m.id, limit_amount: 0, effective_date: new Date() },
      });
      const pokokType = await tx.savings_types.findUnique({ where: { code: 'POKOK' } });
      if (pokokType) {
        const accountNumber = `SAV${pokokType.id}${memberId.toString().padStart(8, '0')}`;
        await tx.savings_accounts.create({
          data: {
            member_id: m.id,
            savings_type_id: pokokType.id,
            account_number: accountNumber,
            balance: 0,
            opened_date: new Date(),
          },
        });
      }
      return m;
    });
    return Number(member.id);
  }

  static async getMemberById(id: number): Promise<Member | null> {
    const m = await prisma.members.findFirst({
      where: { id, deleted_at: null },
      include: { project: { select: { name: true, code: true } } },
    });
    if (!m) return null;
    return {
      id: Number(m.id),
      nik: m.nik,
      name: m.name,
      email: m.email ?? undefined,
      phone: m.phone ?? undefined,
      address: m.address ?? undefined,
      job_title: m.job_title ?? undefined,
      status: m.status ?? 'pending',
      joined_date: m.joined_date ? m.joined_date.toISOString().split('T')[0] : undefined,
      project_id: m.project_id != null ? Number(m.project_id) : undefined,
      project_name: m.project?.name,
      project_code: m.project?.code,
      created_by: m.created_by != null ? Number(m.created_by) : undefined,
      updated_by: m.updated_by != null ? Number(m.updated_by) : undefined,
      created_at: m.created_at?.toISOString(),
      updated_at: m.updated_at?.toISOString(),
    } as unknown as Member;
  }

  static async listMembers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ members: Member[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deleted_at: null };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { nik: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }
    if (params.status) where.status = params.status;

    const [members, total] = await Promise.all([
      prisma.members.findMany({
        where,
        include: { project: { select: { name: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.members.count({ where }),
    ]);
    const list = members.map((m) => ({
      id: Number(m.id),
      nik: m.nik,
      name: m.name,
      email: m.email ?? undefined,
      phone: m.phone ?? undefined,
      address: m.address ?? undefined,
      job_title: m.job_title ?? undefined,
      status: m.status ?? 'pending',
      joined_date: m.joined_date ? m.joined_date.toISOString().split('T')[0] : undefined,
      project_id: m.project_id ?? undefined,
      project_name: m.project?.name,
      created_at: m.created_at?.toISOString(),
      updated_at: m.updated_at?.toISOString(),
    }));
    return { members: list as unknown as Member[], total };
  }

  static async updateMember(id: number, data: Partial<Member>, updatedBy?: number): Promise<void> {
    const update: Record<string, unknown> = { ...data };
    delete update.id;
    delete update.created_at;
    if (updatedBy != null) update.updated_by = BigInt(updatedBy);
    await prisma.members.update({
      where: { id },
      data: update as Parameters<typeof prisma.members.update>[0]['data'],
    });
  }

  static async approveMember(id: number, approvedBy: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const m = await tx.members.findUnique({
        where: { id },
        select: { status: true, email: true, name: true, nik: true },
      });
      const oldStatus = m?.status ?? null;
      await tx.members.update({
        where: { id },
        data: { status: 'active', updated_by: BigInt(approvedBy) },
      });
      await tx.member_status_history.create({
        data: {
          member_id: BigInt(id),
          old_status: oldStatus,
          new_status: 'active',
          changed_by: BigInt(approvedBy),
        },
      });
      const email = m?.email?.trim();
      if (email) {
        const role = await tx.roles.findUnique({ where: { code: 'anggota' }, select: { id: true } });
        if (role) {
          const existing = await tx.users.findFirst({
            where: { email, deleted_at: null },
            select: { id: true },
          });
          if (!existing) {
            const defaultPassword = m?.nik ?? 'Member123';
            const password_hash = await bcrypt.hash(defaultPassword, 10);
            const newUser = await tx.users.create({
              data: {
                email,
                name: m?.name ?? email,
                password_hash,
                is_active: true,
                created_by: BigInt(approvedBy),
              },
            });
            await tx.user_roles.create({
              data: { user_id: newUser.id, role_id: role.id },
            });
          }
        }
      }
    });
  }

  static async setPurchaseLimit(memberId: number, limitAmount: number, createdBy?: number): Promise<void> {
    await prisma.member_purchase_limits.upsert({
      where: { member_id: memberId },
      create: {
        member_id: memberId,
        limit_amount: limitAmount,
        effective_date: new Date(),
        created_by: createdBy != null ? BigInt(createdBy) : null,
      },
      update: {
        limit_amount: limitAmount,
        effective_date: new Date(),
        updated_by: createdBy != null ? BigInt(createdBy) : undefined,
      },
    });
  }

  static async getPurchaseLimit(memberId: number): Promise<number> {
    const row = await prisma.member_purchase_limits.findFirst({
      where: {
        member_id: memberId,
        OR: [{ expiry_date: null }, { expiry_date: { gte: new Date() } }],
      },
      orderBy: { effective_date: 'desc' },
      select: { limit_amount: true },
    });
    return row ? Number(row.limit_amount) : 0;
  }

  static async setPin(memberId: number, pin: string): Promise<void> {
    const pinHash = await bcrypt.hash(pin, 10);
    await prisma.member_pins.upsert({
      where: { member_id: memberId },
      create: { member_id: memberId, pin_hash: pinHash },
      update: {
        pin_hash: pinHash,
        is_active: true,
        failed_attempts: 0,
        locked_until: null,
      },
    });
  }

  static async verifyPin(memberId: number, pin: string): Promise<boolean> {
    const pinData = await prisma.member_pins.findUnique({
      where: { member_id: memberId },
      select: { pin_hash: true, is_active: true, locked_until: true, failed_attempts: true },
    });
    if (!pinData?.is_active) return false;
    if (pinData.locked_until && new Date(pinData.locked_until) > new Date()) return false;

    const isValid = await bcrypt.compare(pin, pinData.pin_hash);
    if (!isValid) {
      const newFailedAttempts = (pinData.failed_attempts ?? 0) + 1;
      const lockedUntil = newFailedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await prisma.member_pins.update({
        where: { member_id: memberId },
        data: { failed_attempts: newFailedAttempts, locked_until: lockedUntil },
      });
    } else {
      await prisma.member_pins.update({
        where: { member_id: memberId },
        data: { failed_attempts: 0, locked_until: null },
      });
    }
    return isValid;
  }

  static async getMemberBarcode(memberId: number): Promise<string | null> {
    const row = await prisma.member_barcodes.findFirst({
      where: { member_id: memberId, is_active: true },
      select: { barcode: true },
    });
    return row?.barcode ?? null;
  }
}
