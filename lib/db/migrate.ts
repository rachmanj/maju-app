import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

function parseDbConfig(): { host: string; port: number; user: string; password: string; database: string } {
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
      // fall through to DB_* vars
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

function getDbConnection() {
  const cfg = parseDbConfig();
  return mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
  });
}

export async function runMigrations() {
  try {
    const cfg = parseDbConfig();
    const dbName = cfg.database;

    const adminConnection = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
    });
    
    try {
      // Create database if it doesn't exist
      await adminConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ Database '${dbName}' ready`);
    } finally {
      await adminConnection.end();
    }
    
    // Now connect to the database
    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Remove comments and split by semicolon
    const statements = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    const connection = await getDbConnection();
    
    try {
      await connection.beginTransaction();
      
      let executedCount = 0;
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed && trimmed.length > 10) { // Minimum length check
          try {
            await connection.query(trimmed);
            executedCount++;
          } catch (error: any) {
            // Ignore "table already exists" errors
            if (!error.message.includes('already exists')) {
              console.error(`Error executing statement: ${trimmed.substring(0, 50)}...`);
              throw error;
            }
          }
        }
      }
      
      await connection.commit();
      console.log(`✅ Database schema migrated successfully (${executedCount} statements executed)`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Seed initial data
export async function seedInitialData() {
  const connection = await getDbConnection();
  
  try {
    await connection.beginTransaction();
    
    // Insert default roles
    const roles = [
      { code: 'superadmin', name: 'Superadmin', description: 'Full access to all modules' },
      { code: 'manager', name: 'Manager', description: 'Approval pinjaman, laporan, konfigurasi operasional' },
      { code: 'pengurus', name: 'Pengurus', description: 'Akses ke modul keuangan dan laporan' },
      { code: 'kasir', name: 'Kasir', description: 'POS, input pembayaran' },
      { code: 'pengawas', name: 'Pengawas', description: 'Read-only/view saja - Monitoring dan audit' },
      { code: 'anggota', name: 'Anggota', description: 'Self-service portal' },
    ];
    
    for (const role of roles) {
      await connection.query(
        'INSERT IGNORE INTO roles (code, name, description) VALUES (?, ?, ?)',
        [role.code, role.name, role.description]
      );
    }
    
    // Insert default savings types
    const savingsTypes = [
      { code: 'POKOK', name: 'Simpanan Pokok', is_mandatory: true, is_withdrawable: false, minimum_amount: 200000, earns_interest: false },
      { code: 'WAJIB', name: 'Simpanan Wajib', is_mandatory: true, is_withdrawable: false, minimum_amount: 100000, earns_interest: false },
      { code: 'SUKARELA', name: 'Simpanan Sukarela', is_mandatory: false, is_withdrawable: true, minimum_amount: 0, earns_interest: true },
    ];
    
    for (const type of savingsTypes) {
      await connection.query(
        `INSERT IGNORE INTO savings_types 
         (code, name, is_mandatory, is_withdrawable, minimum_amount, earns_interest) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [type.code, type.name, type.is_mandatory, type.is_withdrawable, type.minimum_amount, type.earns_interest]
      );
    }

    const productUnits = [
      { code: 'PCS', name: 'Pieces' },
      { code: 'KG', name: 'Kilogram' },
      { code: 'L', name: 'Liter' },
      { code: 'KARTON', name: 'Karton' },
      { code: 'PAK', name: 'Pak' },
      { code: 'DUS', name: 'Dus' },
    ];
    for (const u of productUnits) {
      await connection.query(
        'INSERT IGNORE INTO product_units (code, name) VALUES (?, ?)',
        [u.code, u.name]
      );
    }
    
    // Insert Chart of Accounts
    const { COA_ACCOUNTS } = await import('../data/coa-seed');
    const accountMap = new Map<string, number>();
    
    // First pass: insert parent accounts
    for (const account of COA_ACCOUNTS) {
      if (!account.parent_code) {
        const [result] = await connection.query(
          `INSERT IGNORE INTO chart_of_accounts (code, name, account_type, is_active)
           VALUES (?, ?, ?, TRUE)`,
          [account.code, account.name, account.account_type]
        );
        const insertId = (result as any).insertId;
        if (insertId) {
          accountMap.set(account.code, insertId);
        } else {
          // Get existing ID
          const [existing] = await connection.query(
            'SELECT id FROM chart_of_accounts WHERE code = ?',
            [account.code]
          );
          accountMap.set(account.code, (existing as any[])[0]?.id);
        }
      }
    }
    
    // Second pass: insert child accounts
    for (const account of COA_ACCOUNTS) {
      if (account.parent_code) {
        const parentId = accountMap.get(account.parent_code);
        if (parentId) {
          await connection.query(
            `INSERT IGNORE INTO chart_of_accounts (code, name, account_type, parent_id, is_active)
             VALUES (?, ?, ?, ?, TRUE)`,
            [account.code, account.name, account.account_type, parentId]
          );
        }
      }
    }
    
    // Create default admin user (if not exists)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@koperasimaju.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrator';
    
    // Check if admin user exists
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );
    
    if ((existingUsers as any[]).length === 0) {
      // Hash password
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      // Get superadmin role ID
      const [roles] = await connection.query(
        'SELECT id FROM roles WHERE code = ?',
        ['superadmin']
      );
      const superadminRoleId = (roles as any[])[0]?.id;
      
      if (superadminRoleId) {
        // Insert admin user
        const [userResult] = await connection.query(
          `INSERT INTO users (email, password_hash, name, is_active)
           VALUES (?, ?, ?, TRUE)`,
          [adminEmail, passwordHash, adminName]
        );
        
        const userId = (userResult as any).insertId;
        
        // Assign superadmin role
        await connection.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, superadminRoleId]
        );
        
        console.log(`✅ Admin user created: ${adminEmail} / ${adminPassword}`);
      }
    } else {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    }
    
    await connection.commit();
    console.log('✅ Initial data seeded successfully');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}
