import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { AuditService } from './audit-service';

export interface UserListItem {
  id: number;
  username: string | null;
  email: string;
  name: string;
  phone: string | null;
  is_active: boolean | null;
  last_login_at: Date | null;
  created_at: Date | null;
  roles: { code: string; name: string }[];
}

export interface UserDetail extends UserListItem {
  user_roles: { role_id: number; role: { id: number; code: string; name: string } }[];
  member_id?: number | null;
}

export class UserService {
  static async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<{ users: UserListItem[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deleted_at: null };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { email: { contains: params.search } },
        { username: { contains: params.search } },
        { phone: { contains: params.search } },
      ];
    }
    if (params.is_active !== undefined) where.is_active = params.is_active;

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        include: {
          user_roles: {
            include: { role: { select: { code: true, name: true } } },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.users.count({ where }),
    ]);

    const items: UserListItem[] = users.map((u) => ({
      id: Number(u.id),
      username: u.username,
      email: u.email,
      name: u.name,
      phone: u.phone,
      is_active: u.is_active,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      roles: u.user_roles.map((ur) => ur.role),
    }));

    return { users: items, total };
  }

  static async getUserById(id: number): Promise<UserDetail | null> {
    const u = await prisma.users.findFirst({
      where: { id, deleted_at: null },
      include: {
        user_roles: {
          include: { role: { select: { id: true, code: true, name: true } } },
        },
      },
    });
    if (!u) return null;

    return {
      id: Number(u.id),
      username: u.username,
      email: u.email,
      name: u.name,
      phone: u.phone,
      member_id: u.member_id != null ? Number(u.member_id) : null,
      is_active: u.is_active,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      roles: u.user_roles.map((ur) => ur.role),
      user_roles: u.user_roles.map((ur) => ({
        role_id: ur.role_id,
        role: ur.role,
      })),
    } as unknown as UserDetail;
  }

  static async createUser(
    data: {
      username?: string;
      email: string;
      password: string;
      name: string;
      phone?: string;
      is_active?: boolean;
      role_ids: number[];
      member_id?: number;
    },
    createdBy?: number
  ): Promise<number> {
    const existingEmail = await prisma.users.findFirst({
      where: { email: data.email, deleted_at: null },
    });
    if (existingEmail) throw new Error('Email sudah terdaftar');

    if (data.username) {
      const existingUsername = await prisma.users.findFirst({
        where: { username: data.username, deleted_at: null },
      });
      if (existingUsername) throw new Error('Username sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const roleIds = data.role_ids;
    const anggotaRole = await prisma.roles.findUnique({ where: { code: 'anggota' }, select: { id: true } });
    const hasAnggotaRole = anggotaRole && roleIds.includes(anggotaRole.id);
    if (hasAnggotaRole && !data.member_id) {
      throw new Error('Anggota harus memilih member');
    }
    if (data.member_id) {
      const existing = await prisma.users.findFirst({
        where: { member_id: BigInt(data.member_id), deleted_at: null },
      });
      if (existing) throw new Error('Member sudah ditetapkan ke pengguna lain');
    }

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.users.create({
        data: {
          username: data.username ?? null,
          email: data.email,
          password_hash: passwordHash,
          name: data.name,
          phone: data.phone ?? null,
          member_id: data.member_id != null ? BigInt(data.member_id) : null,
          is_active: data.is_active ?? true,
          created_by: createdBy ?? null,
        },
      });
      for (const roleId of data.role_ids) {
        await tx.user_roles.create({
          data: { user_id: u.id, role_id: roleId },
        });
      }
      return u;
    });

    await AuditService.log({
      user_id: createdBy,
      action: 'user.create',
      entity_type: 'user',
      entity_id: Number(user.id),
      new_values: { email: data.email, name: data.name },
    });
    return Number(user.id);
  }

  static async updateUser(
    id: number,
    data: {
      username?: string;
      email?: string;
      password?: string;
      name?: string;
      phone?: string;
      is_active?: boolean;
      role_ids?: number[];
      member_id?: number | null;
    },
    updatedBy?: number
  ): Promise<void> {
    const existing = await prisma.users.findFirst({
      where: { id, deleted_at: null },
      include: { user_roles: { select: { role_id: true } } },
    });
    if (!existing) throw new Error('User tidak ditemukan');

    if (data.email && data.email !== existing.email) {
      const duplicate = await prisma.users.findFirst({
        where: { email: data.email, deleted_at: null },
      });
      if (duplicate) throw new Error('Email sudah terdaftar');
    }

    if (data.username !== undefined && data.username !== existing.username) {
      if (data.username) {
        const duplicate = await prisma.users.findFirst({
          where: { username: data.username, deleted_at: null },
        });
        if (duplicate) throw new Error('Username sudah terdaftar');
      }
    }

    const roleIds = data.role_ids ?? existing.user_roles.map((ur) => ur.role_id);
    const anggotaRole = await prisma.roles.findUnique({ where: { code: 'anggota' }, select: { id: true } });
    const hasAnggotaRole = anggotaRole && roleIds.includes(anggotaRole.id);
    if (hasAnggotaRole && data.member_id == null) {
      const existingMemberId = existing.member_id;
      if (existingMemberId == null) throw new Error('Anggota harus memilih member');
    }
    if (data.member_id != null) {
      const existingWithMember = await prisma.users.findFirst({
        where: { member_id: BigInt(data.member_id), deleted_at: null },
      });
      if (existingWithMember && Number(existingWithMember.id) !== id) {
        throw new Error('Member sudah ditetapkan ke pengguna lain');
      }
    }

    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        name: data.name ?? existing.name,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        is_active: data.is_active !== undefined ? data.is_active : existing.is_active,
        updated_by: updatedBy ?? null,
      };
      if (data.username !== undefined) updateData.username = data.username || null;
      if (data.email) updateData.email = data.email;
      if (data.member_id !== undefined) updateData.member_id = data.member_id != null ? BigInt(data.member_id) : null;
      if (data.password) {
        updateData.password_hash = await bcrypt.hash(data.password, 10);
      }

      await tx.users.update({
        where: { id: existing.id },
        data: updateData,
      });

      if (data.role_ids !== undefined) {
        await tx.user_roles.deleteMany({ where: { user_id: existing.id } });
        for (const roleId of data.role_ids) {
          await tx.user_roles.create({
            data: { user_id: existing.id, role_id: roleId },
          });
        }
      }
    });

    const oldRoles = existing.user_roles.map((ur) => ur.role_id);
    const newRoles = data.role_ids ?? oldRoles;
    await AuditService.log({
      user_id: updatedBy,
      action: 'user.update',
      entity_type: 'user',
      entity_id: id,
      old_values: { name: existing.name, email: existing.email, role_ids: oldRoles },
      new_values: {
        name: data.name ?? existing.name,
        email: data.email ?? existing.email,
        role_ids: newRoles,
      },
    });
  }

  static async deleteUser(id: number, deletedBy?: number): Promise<void> {
    const existing = await prisma.users.findFirst({
      where: { id, deleted_at: null },
    });
    if (!existing) throw new Error('User tidak ditemukan');

    await prisma.users.update({
      where: { id },
      data: { deleted_at: new Date(), updated_by: deletedBy ?? null },
    });

    await AuditService.log({
      user_id: deletedBy,
      action: 'user.delete',
      entity_type: 'user',
      entity_id: id,
      old_values: { email: existing.email, name: existing.name },
    });
  }
}
