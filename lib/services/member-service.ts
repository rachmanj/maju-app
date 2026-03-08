import { prisma } from '@/lib/db/prisma';
import type { Member } from '@/types/database';
import bcrypt from 'bcryptjs';
import { AuditService } from './audit-service';

export class MemberService {
  static async createMember(data: {
    member_number: string;
    nik?: string | null;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    job_title?: string;
    project_id?: number;
    department_id?: number;
    joined_date?: Date;
    created_by?: number;
  }): Promise<number> {
    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.members.create({
        data: {
          member_number: data.member_number.trim(),
          nik: data.nik?.trim() || null,
          name: data.name,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          job_title: data.job_title ?? null,
          project_id: data.project_id ?? null,
          department_id: data.department_id ?? null,
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
      const savingsTypes = await tx.savings_types.findMany({
        where: { code: { in: ['POKOK', 'WAJIB', 'SUKARELA', 'SUKARELA_SHU', 'SUKARELA_REGULER'] } },
        orderBy: { code: 'asc' },
      });
      const { generateAccountNumber } = await import('@/lib/utils/savings-account-number');
      for (const st of savingsTypes) {
        const count = await tx.savings_accounts.count({
          where: { member_id: m.id, savings_type_id: st.id },
        });
        const accountNumber = generateAccountNumber(memberId, st.code, count + 1);
        await tx.savings_accounts.create({
          data: {
            member_id: m.id,
            savings_type_id: st.id,
            account_number: accountNumber,
            balance: 0,
            opened_date: new Date(),
          },
        });
      }
      return m;
    });
    await AuditService.log({
      user_id: data.created_by,
      action: 'member.create',
      entity_type: 'member',
      entity_id: Number(member.id),
      new_values: { nik: data.nik ?? null, name: data.name },
    });
    return Number(member.id);
  }

  static async getMemberById(id: number): Promise<Member | null> {
    const m = await prisma.members.findFirst({
      where: { id, deleted_at: null },
      include: {
        project: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
        member_barcodes: {
          where: { is_active: true },
          select: { barcode: true },
        },
      },
    });
    if (!m) return null;
    const barcode = m.member_barcodes?.barcode ?? null;
    const purchaseLimit = await this.getPurchaseLimit(Number(m.id));
    const orderLimit = await this.getOrderLimit(Number(m.id));
    return {
      id: Number(m.id),
      member_number: m.member_number ?? '',
      barcode: barcode ?? undefined,
      purchase_limit: purchaseLimit,
      order_limit: orderLimit ?? undefined,
      nik: m.nik ?? undefined,
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
      department_id: m.department_id != null ? Number(m.department_id) : undefined,
      department_name: m.department?.name,
      department_code: m.department?.code,
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
        { member_number: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }
    if (params.status) where.status = params.status;

    const [members, total] = await Promise.all([
      prisma.members.findMany({
        where,
        include: {
          project: { select: { name: true, code: true } },
          department: { select: { name: true, code: true } },
          member_barcodes: {
            where: { is_active: true },
            select: { barcode: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.members.count({ where }),
    ]);
    const list = members.map((m) => {
      const barcode = m.member_barcodes?.barcode ?? null;
      return {
      id: Number(m.id),
      member_number: m.member_number ?? '',
      barcode: barcode ?? undefined,
      nik: m.nik ?? undefined,
      name: m.name,
      email: m.email ?? undefined,
      phone: m.phone ?? undefined,
      address: m.address ?? undefined,
      job_title: m.job_title ?? undefined,
      status: m.status ?? 'pending',
      joined_date: m.joined_date ? m.joined_date.toISOString().split('T')[0] : undefined,
      project_id: m.project_id ?? undefined,
      project_name: m.project?.name,
      project_code: m.project?.code,
      department_id: m.department_id ?? undefined,
      department_name: m.department?.name,
      department_code: m.department?.code,
      created_at: m.created_at?.toISOString(),
      updated_at: m.updated_at?.toISOString(),
    };
    });
    return { members: list as unknown as Member[], total };
  }

  static async updateMember(id: number, data: Partial<Member>, updatedBy?: number): Promise<void> {
    const existing = await prisma.members.findUnique({
      where: { id },
      select: { name: true, nik: true, status: true },
    });
    const update: Record<string, unknown> = { ...data };
    delete update.id;
    delete update.created_at;
    if ('nik' in update) update.nik = (update.nik as string)?.trim() || null;
    if ('member_number' in update) update.member_number = (update.member_number as string)?.trim();
    delete update.project_name;
    delete update.project_code;
    delete update.department_name;
    delete update.department_code;
    if (updatedBy != null) update.updated_by = BigInt(updatedBy);
    await prisma.members.update({
      where: { id },
      data: update as Parameters<typeof prisma.members.update>[0]['data'],
    });
    await AuditService.log({
      user_id: updatedBy,
      action: 'member.update',
      entity_type: 'member',
      entity_id: id,
      old_values: existing ? { name: existing.name, nik: existing.nik } : undefined,
      new_values: { name: data.name, nik: data.nik },
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
      const email = m?.email?.trim() ?? `member-${id}@temp.local`;
      const role = await tx.roles.findUnique({ where: { code: 'anggota' }, select: { id: true } });
      if (role) {
        const existing = await tx.users.findFirst({
          where: { OR: [{ email }, { member_id: BigInt(id) }], deleted_at: null },
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
              member_id: BigInt(id),
              created_by: BigInt(approvedBy),
            },
          });
          await tx.user_roles.create({
            data: { user_id: newUser.id, role_id: role.id },
          });
        }
      }
    });
    await AuditService.log({
      user_id: approvedBy,
      action: 'member.approve',
      entity_type: 'member',
      entity_id: id,
      new_values: { status: 'active' },
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

  static async getOrderLimit(memberId: number): Promise<number | null> {
    const row = await prisma.member_purchase_limits.findFirst({
      where: {
        member_id: memberId,
        OR: [{ expiry_date: null }, { expiry_date: { gte: new Date() } }],
      },
      orderBy: { effective_date: 'desc' },
      select: { order_limit_amount: true },
    });
    if (!row || row.order_limit_amount == null) return null;
    return Number(row.order_limit_amount);
  }

  static async setOrderLimit(memberId: number, limitAmount: number | null, createdBy?: number): Promise<void> {
    const existing = await prisma.member_purchase_limits.findUnique({
      where: { member_id: memberId },
    });
    if (existing) {
      await prisma.member_purchase_limits.update({
        where: { member_id: memberId },
        data: {
          order_limit_amount: limitAmount,
          updated_by: createdBy != null ? BigInt(createdBy) : undefined,
        },
      });
    } else {
      await prisma.member_purchase_limits.create({
        data: {
          member_id: memberId,
          limit_amount: 0,
          order_limit_amount: limitAmount,
          effective_date: new Date(),
          created_by: createdBy != null ? BigInt(createdBy) : null,
        },
      });
    }
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
