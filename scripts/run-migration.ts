// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Now import other modules that depend on environment variables
import { runMigrations, seedInitialData } from '../lib/db/migrate';

async function main() {
  try {
    console.log('🚀 Starting database migration...');
    console.log(`📊 Database: ${process.env.DB_NAME || 'maju_app'}`);
    console.log(`🔌 Host: ${process.env.DB_HOST || 'localhost'}`);
    await runMigrations();
    console.log('🌱 Seeding initial data...');
    await seedInitialData();
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 Default admin credentials:');
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@koperasimaju.com'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log(`   ⚠️  Please change the password after first login!`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
