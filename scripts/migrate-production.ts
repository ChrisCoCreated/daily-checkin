#!/usr/bin/env ts-node
/**
 * Production migration script to add contacts table
 * Run: npx ts-node scripts/migrate-production.ts
 * 
 * Make sure CHECKIN_DATABASE_URL is set to your production database
 */

import { Pool } from 'pg';

const databaseUrl = process.env.CHECKIN_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ CHECKIN_DATABASE_URL environment variable is not set');
  console.error('   Set it to your production database connection string');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  // TypeScript assertion: databaseUrl is guaranteed to be defined here
  // because we exit early if it's not set
  const dbUrl = databaseUrl!;
  
  try {
    console.log('🔄 Running contacts table migration on production...\n');
    const dbInfo = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
    console.log('Database:', dbInfo);
    
    // Check if table already exists
    const checkResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'contacts'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Contacts table already exists. Skipping migration.');
      process.exit(0);
    }
    
    // Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        organisation TEXT,
        talk_slowly BOOLEAN DEFAULT FALSE,
        number_to_call TEXT NOT NULL,
        escalation_name TEXT,
        escalation_number TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_organisation ON contacts(organisation)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name)
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('   Contacts table and indexes have been created.\n');
    
    // Verify
    const verifyResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'contacts'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verified: contacts table exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

