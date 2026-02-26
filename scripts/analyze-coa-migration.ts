import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env') });

import mysql from 'mysql2/promise';

function parseDbConfig() {
  const url = process.env.DATABASE_URL;
  if (url && typeof url === 'string' && url.startsWith('mysql://')) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || 'localhost',
        port: parsed.port ? parseInt(parsed.port) : 3306,
        user: decodeURIComponent(parsed.username || 'root'),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname?.replace(/^\//, '') || 'maju_app',
      };
    } catch {
    }
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'maju_app',
  };
}

async function main() {
  const cfg = parseDbConfig();
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
  });

  try {
    console.log('=== Chart of Accounts Migration Analysis ===');
    console.log('');

    const [coaRows] = await conn.query('SELECT id, code, name, account_type FROM chart_of_accounts ORDER BY code');
    console.log('1. chart_of_accounts');
    console.log('   Total count:', (coaRows as any[]).length);
    console.log('   Codes with id:');
    for (const r of (coaRows as any[])) {
      console.log('     ' + r.code + ' (id=' + r.id + ')');
    }
    console.log('');

    const [jelRows] = await conn.query('SELECT account_id, COUNT(*) as cnt FROM journal_entry_lines GROUP BY account_id ORDER BY cnt DESC');
    const jelTotal = (jelRows as any[]).reduce((s, r) => s + Number(r.cnt), 0);
    console.log('2. journal_entry_lines');
    console.log('   Total lines:', jelTotal);
    console.log('   Count per account_id:');
    for (const r of (jelRows as any[])) {
      console.log('     account_id=' + r.account_id + ': ' + r.cnt + ' lines');
    }
    console.log('   Accounts with postings:', (jelRows as any[]).length);
    console.log('');

    const [jeTotal] = await conn.query('SELECT COUNT(*) as cnt FROM journal_entries');
    const [jeStatus] = await conn.query('SELECT status, COUNT(*) as cnt FROM journal_entries GROUP BY status');
    const [jeDateRange] = await conn.query('SELECT MIN(entry_date) as min_d, MAX(entry_date) as max_d FROM journal_entries');
    console.log('3. journal_entries');
    console.log('   Total count:', (jeTotal as any[])[0].cnt);
    console.log('   Status breakdown:');
    for (const r of (jeStatus as any[])) {
      console.log('     ' + (r.status ?? 'NULL') + ': ' + r.cnt);
    }
    const dr = (jeDateRange as any[])[0];
    console.log('   Date range:', dr.min_d ?? 'N/A', 'to', dr.max_d ?? 'N/A');
    console.log('');

    const [ecRows] = await conn.query('SELECT id, code, name, account_id FROM expense_categories WHERE account_id IS NOT NULL');
    const [ecNull] = await conn.query('SELECT COUNT(*) as cnt FROM expense_categories WHERE account_id IS NULL');
    console.log('4. expense_categories');
    console.log('   With account_id set:', (ecRows as any[]).length);
    console.log('   With account_id NULL:', (ecNull as any[])[0].cnt);
    if ((ecRows as any[]).length > 0) {
      console.log('   Mappings:');
      for (const r of (ecRows as any[])) {
        console.log('     ' + r.code + ' (' + r.name + '): account_id=' + r.account_id);
      }
    }
    console.log('');

    const [fkRows] = await conn.query('SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME = ? ORDER BY TABLE_NAME', [cfg.database, 'chart_of_accounts']);
    console.log('5. Tables with FK to chart_of_accounts');
    for (const r of (fkRows as any[])) {
      console.log('     ' + r.TABLE_NAME + '.' + r.COLUMN_NAME + ' (' + r.CONSTRAINT_NAME + ')');
    }
    console.log('');

    const [jelOrphan] = await conn.query('SELECT jel.account_id FROM journal_entry_lines jel LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id WHERE coa.id IS NULL');
    const [ecOrphan] = await conn.query('SELECT ec.id, ec.account_id FROM expense_categories ec WHERE ec.account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM chart_of_accounts coa WHERE coa.id = ec.account_id)');
    const coaArr = coaRows as any[];
    const jelArr = jelRows as any[];

    console.log('6. Summary: Full CoA Renumber Feasibility');
    console.log('   - chart_of_accounts count:', coaArr.length);
    console.log('   - journal_entry_lines referencing CoA:', jelArr.length, 'distinct accounts');
    console.log('   - Orphan journal_entry_lines (invalid account_id):', (jelOrphan as any[]).length);
    console.log('   - Orphan expense_categories (invalid account_id):', (ecOrphan as any[]).length);
    console.log('');
    console.log('   RISKS:');
    if (jelArr.length > 0) {
      console.log('   - Renumbering codes requires updating account_id in journal_entry_lines if you change IDs.');
      console.log('   - Codes are in chart_of_accounts.code; account_id references id. Full renumber of CODES is safe if IDs stay unchanged.');
    }
    console.log('   - Parent-child relationships use parent_id -> id. Renumbering IDs would break parent_id.');
    console.log('   - expense_categories.account_id must be updated if CoA ids change.');
    console.log('   - RECOMMENDATION: Renumber CODES only (keep ids). Or run migration that updates all FKs atomically if changing ids.');
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
