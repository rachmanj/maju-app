import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const u = await prisma.users.findFirst({
          where: { email: String(credentials.email), deleted_at: null, is_active: true },
          include: {
            user_roles: { include: { role: { select: { code: true } } } },
          },
        });
        if (!u) return null;

        const password = String(credentials.password ?? '');
        const isValid = await bcrypt.compare(password, String(u.password_hash ?? ''));
        if (!isValid) return null;

        await prisma.users.update({
          where: { id: u.id },
          data: { last_login_at: new Date() },
        });

        const roles = u.user_roles.map((ur) => ur.role.code);
        let memberId: number | null = null;
        if (roles.includes('anggota') && u.email) {
          const member = await prisma.members.findFirst({
            where: { email: u.email, status: 'active', deleted_at: null },
            select: { id: true },
          });
          if (member) memberId = Number(member.id);
        }
        return {
          id: String(u.id),
          email: u.email,
          name: u.name,
          roles,
          memberId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user as any).roles || [];
        token.memberId = (user as any).memberId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles || [];
        session.user.memberId = token.memberId ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
});
