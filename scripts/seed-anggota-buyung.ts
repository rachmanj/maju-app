#!/usr/bin/env npx ts-node
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
  const memberName = 'BUYUNG ALI';
  const memberNumber = 'MBR00000099';
  const username = 'BUYUNG ALI';
  const password = 'Member123';

  let member = await prisma.members.findFirst({
    where: { name: memberName, deleted_at: null },
  });

  if (!member) {
    const existingNumber = await prisma.members.findFirst({
      where: { member_number: memberNumber, deleted_at: null },
    });
    const num = existingNumber ? (await prisma.members.count()) + 1 : 99;
    const finalNumber = existingNumber ? `MBR${num.toString().padStart(8, '0')}` : memberNumber;

    member = await prisma.members.create({
      data: {
        member_number: finalNumber,
        name: memberName,
        status: 'active',
        joined_date: new Date(),
      },
    });
    console.log(`Created member: ${member.name} (${member.member_number})`);
  } else {
    await prisma.members.update({
      where: { id: member.id },
      data: { status: 'active' },
    });
    console.log(`Member exists: ${member.name} (${member.member_number})`);
  }

  let user = await prisma.users.findFirst({
    where: { member_id: member.id, deleted_at: null },
    include: { user_roles: { include: { role: true } } },
  });

  if (!user) {
    const role = await prisma.roles.findUnique({ where: { code: 'anggota' } });
    if (!role) throw new Error('Role anggota not found');

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.users.create({
      data: {
        username,
        email: `member-${member.id}@temp.local`,
        password_hash: passwordHash,
        name: memberName,
        is_active: true,
        member_id: member.id,
      },
    });
    await prisma.user_roles.create({
      data: { user_id: newUser.id, role_id: role.id },
    });
    console.log(`Created user: ${username} (anggota), password: ${password}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.users.update({
      where: { id: user.id },
      data: {
        username,
        password_hash: passwordHash,
        is_active: true,
      },
    });
    console.log(`Updated user: ${username}, password: ${password}`);
  }

  console.log('Done. Login with:');
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log(`  Or member_number: ${member.member_number}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
