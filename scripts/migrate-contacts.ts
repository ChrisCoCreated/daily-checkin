#!/usr/bin/env ts-node
/**
 * Migration script to add contacts table
 * Run: npx ts-node scripts/migrate-contacts.ts
 */

import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Load environment variables from .env.local if it exists
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const databaseUrl = process.env.CHECKIN_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ CHECKIN_DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  try {
    console.log('🔄 Running contacts table migration...\n');
    
    const migrationSQL = `
-- Contacts table for people we might want to call
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
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_organisation ON contacts(organisation);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
`;
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   Contacts table and indexes have been created.\n');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'contacts'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: contacts table exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

