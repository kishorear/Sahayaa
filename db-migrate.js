// Script to migrate the database schema
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Add integrationSettings column to tenants table
    console.log('Adding integrationSettings column to tenants table...');
    await db.execute(sql`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS "integrationSettings" JSONB DEFAULT '{}'::jsonb
    `);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();