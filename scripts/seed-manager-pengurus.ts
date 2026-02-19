import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url && typeof url === 'string' && url.startsWith('mysql://')) return url;
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '3306';
  const user = process.env.DB_USER ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database = process.env.DB_NAME ?? 'maju_app';
  return `mysql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getDatabaseUrl()),
});

async function main() {
  const testUsers = [
    { email: 'manager@example.com', name: 'Manager Test', roleCode: 'manager', password: 'password' },
    { email: 'pengurus@example.com', name: 'Pengurus Test', roleCode: 'pengurus', password: 'password' },
  ];
  for (const u of testUsers) {
    const existing = await prisma.users.findFirst({ where: { email: u.email, deleted_at: null } });
    if (!existing) {
      const role = await prisma.roles.findUnique({ where: { code: u.roleCode } });
      if (role) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        const user = await prisma.users.create({
          data: { email: u.email, password_hash: passwordHash, name: u.name, is_active: true },
        });
        await prisma.user_roles.create({ data: { user_id: user.id, role_id: role.id } });
        console.log(`Created: ${u.email} (${u.roleCode})`);
      } else {
        console.log(`Role ${u.roleCode} not found`);
      }
    } else {
      console.log(`User ${u.email} already exists`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
