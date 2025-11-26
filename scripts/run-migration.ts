import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local or .env
config({ path: join(process.cwd(), '.env.local') });
config({ path: join(process.cwd(), '.env') });

const databaseUrl = process.env.CHECKIN_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing CHECKIN_DATABASE_URL environment variable');
  console.error('   Please set CHECKIN_DATABASE_URL in your .env.local file');
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
    console.log('🔄 Running conversation sets migration...\n');

    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'migrations', 'add-conversation-sets.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('   - Created conversation_sets table');
    console.log('   - Updated checkins table with contact_id and conversation_set_id columns\n');

    // Verify the tables were created
    const conversationSetsCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'conversation_sets'
    `);

    if (conversationSetsCheck.rows.length > 0) {
      console.log('✅ Verified: conversation_sets table exists');
    }

    const checkinsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'checkins' 
      AND column_name IN ('contact_id', 'conversation_set_id')
    `);

    if (checkinsCheck.rows.length === 2) {
      console.log('✅ Verified: checkins table has contact_id and conversation_set_id columns');
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

