#!/usr/bin/env ts-node
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import db from '../lib/db';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@koperasimaju.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrator';
    
    // Check if admin user exists
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );
    
    if ((existingUsers as any[]).length > 0) {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
      await connection.rollback();
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Get superadmin role ID
    const [roles] = await connection.query(
      'SELECT id FROM roles WHERE code = ?',
      ['superadmin']
    );
    const superadminRoleId = (roles as any[])[0]?.id;
    
    if (!superadminRoleId) {
      throw new Error('Superadmin role not found. Please run migrations first.');
    }
    
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
    
    await connection.commit();
    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ⚠️  Please change the password after first login!`);
  } catch (error: any) {
    await connection.rollback();
    console.error('❌ Failed to create admin user:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

createAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
