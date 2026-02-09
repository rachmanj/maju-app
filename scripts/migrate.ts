#!/usr/bin/env ts-node
import { runMigrations, seedInitialData } from '../lib/db/migrate';

async function main() {
  try {
    console.log('🚀 Starting database migration...');
    await runMigrations();
    console.log('🌱 Seeding initial data...');
    await seedInitialData();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
