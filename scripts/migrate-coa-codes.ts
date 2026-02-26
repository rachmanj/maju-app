import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

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

const OLD_TO_NEW: [string, string][] = [
  ['2110', '1610'], ['2120', '1620'], ['2130', '1630'],
  ['2210', '1710'], ['2220', '1720'], ['2221', '1721'], ['2230', '1730'], ['2231', '1731'],
  ['2240', '1740'], ['2241', '1741'], ['2250', '1750'], ['2251', '1751'],
  ['2260', '1760'], ['2261', '1761'], ['2270', '1770'], ['2271', '1771'],
  ['2310', '1810'], ['2320', '1820'], ['2330', '1821'],
  ['2410', '1840'], ['2420', '1850'],
  ['3110', '2110'], ['3120', '2111'], ['3210', '2120'], ['3220', '2121'], ['3230', '2122'],
  ['3310', '2210'], ['3320', '2211'], ['3330', '2212'],
  ['3410', '2220'], ['3420', '2221'], ['3430', '2222'], ['3440', '2223'], ['3450', '2224'],
  ['3510', '2230'], ['3520', '2231'], ['3530', '2232'], ['3540', '2233'],
  ['3610', '2240'], ['3620', '2241'],
  ['4110', '2310'], ['4120', '2311'], ['4130', '2312'],
  ['5110', '3110'], ['5210', '3111'], ['5310', '3210'], ['5320', '3211'],
  ['5410', '3310'], ['5420', '3311'], ['5510', '3410'], ['5520', '3411'],
  ['6110', '4110'], ['6120', '4111'], ['6130', '4112'],
  ['6210', '4210'], ['6211', '4211'], ['6220', '4212'],
  ['6310', '4310'], ['6320', '4311'],
  ['8310', '5110'],
  ['8110', '6110'], ['8120', '6111'], ['8130', '6112'],
  ['8210', '6210'], ['8211', '6211'], ['8212', '6212'], ['8213', '6213'], ['8214', '6214'],
  ['8220', '6220'], ['8230', '6221'], ['8240', '6222'], ['8250', '6223'], ['8260', '6224'],
  ['8270', '6225'], ['8280', '6226'], ['8290', '6227'],
  ['8320', '6310'], ['8330', '6311'], ['8340', '6312'],
  ['8410', '6410'], ['8420', '6411'], ['8430', '6412'], ['8440', '6413'], ['8450', '6414'], ['8460', '6415'],
  ['8510', '6510'], ['8520', '6511'], ['8530', '6512'], ['8540', '6513'], ['8550', '6514'], ['8560', '6515'],
  ['8610', '6610'], ['8620', '6611'],
  ['7120', '7111'], ['7130', '7112'], ['7140', '7113'],
  ['9110', '7210'], ['9120', '7211'], ['9130', '7212'], ['9140', '7213'],
];

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(getDatabaseUrl()),
  });

  try {
    console.log('=== CoA Code Migration ===');
    const before = await prisma.chart_of_accounts.count();
    console.log('Accounts before:', before);

    for (const [oldCode, newCode] of OLD_TO_NEW) {
      if (oldCode === newCode) continue;
      const result = await prisma.chart_of_accounts.updateMany({
        where: { code: oldCode },
        data: { code: `TMP_${oldCode}` },
      });
      if (result.count > 0) {
        await prisma.chart_of_accounts.updateMany({
          where: { code: `TMP_${oldCode}` },
          data: { code: newCode },
        });
        console.log(`  ${oldCode} → ${newCode}`);
      }
    }

    const existing3900 = await prisma.chart_of_accounts.findUnique({ where: { code: '3900' } });
    if (!existing3900) {
      await prisma.chart_of_accounts.create({
        data: { code: '3900', name: 'Saldo Awal', account_type: 'equity', is_active: true },
      });
      console.log('  Inserted 3900 Saldo Awal');
    }

    const after = await prisma.chart_of_accounts.count();
    console.log('Accounts after:', after);
    console.log('Migration completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
