/**
 * Ensures all members have 3 savings accounts (POKOK, WAJIB, SUKARELA).
 * Run: npm run ensure-savings-accounts
 */
import './load-env';
import { prisma } from '../lib/db/prisma';
import { SavingsService } from '../lib/services/savings-service';

async function main() {
  const members = await prisma.members.findMany({
    where: { deleted_at: null },
    select: { id: true },
  });
  const types = await prisma.savings_types.findMany({
    where: { code: { in: ['POKOK', 'WAJIB', 'SUKARELA'] } },
    select: { id: true, code: true },
  });
  let created = 0;
  for (const member of members) {
    const memberId = Number(member.id);
    for (const st of types) {
      const existing = await prisma.savings_accounts.findFirst({
        where: { member_id: memberId, savings_type_id: st.id, closed_date: null },
      });
      if (!existing) {
        await SavingsService.createSavingsAccount(memberId, st.id, 0, st.code);
        created++;
        console.log(`Created ${st.code} account for member ${memberId}`);
      }
    }
  }
  console.log(`Done. Created ${created} accounts.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
