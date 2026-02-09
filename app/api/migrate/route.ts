import { NextResponse } from 'next/server';
import { runMigrations, seedInitialData } from '@/lib/db/migrate';

export async function POST() {
  try {
    // In production, add authentication check here
    await runMigrations();
    await seedInitialData();
    return NextResponse.json({ 
      success: true, 
      message: 'Database migrated and seeded successfully' 
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
