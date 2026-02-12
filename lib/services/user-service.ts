import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export interface UserListItem {
  id: number;
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
      email: u.email,
      name: u.name,
      phone: u.phone,
      is_active: u.is_active,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      roles: u.user_roles.map((ur) => ur.role),
      user_roles: u.user_roles.map((ur) => ({
        role_id: ur.role_id,
        role: ur.role,
      })),
    } as UserDetail;
  }

  static async createUser(
    data: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      is_active?: boolean;
      role_ids: number[];
    },
    createdBy?: number
  ): Promise<number> {
    const existing = await prisma.users.findFirst({
      where: { email: data.email, deleted_at: null },
    });
    if (existing) {
      throw new Error('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.users.create({
        data: {
          email: data.email,
          password_hash: passwordHash,
          name: data.name,
          phone: data.phone ?? null,
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

    return Number(user.id);
  }

  static async updateUser(
    id: number,
    data: {
      email?: string;
      password?: string;
      name?: string;
      phone?: string;
      is_active?: boolean;
      role_ids?: number[];
    },
    updatedBy?: number
  ): Promise<void> {
    const existing = await prisma.users.findFirst({
      where: { id, deleted_at: null },
    });
    if (!existing) throw new Error('User tidak ditemukan');

    if (data.email && data.email !== existing.email) {
      const duplicate = await prisma.users.findFirst({
        where: { email: data.email, deleted_at: null },
      });
      if (duplicate) throw new Error('Email sudah terdaftar');
    }

    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        name: data.name ?? existing.name,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        is_active: data.is_active !== undefined ? data.is_active : existing.is_active,
        updated_by: updatedBy ?? null,
      };
      if (data.email) updateData.email = data.email;
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
  }
}
