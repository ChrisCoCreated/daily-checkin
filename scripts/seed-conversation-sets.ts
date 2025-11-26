import { Pool } from 'pg';
import { config } from 'dotenv';
import { join } from 'path';
import { DEFAULT_CONVERSATION_SETS } from '../lib/conversations';

// Load environment variables from .env.local or .env
config({ path: join(process.cwd(), '.env.local') });
config({ path: join(process.cwd(), '.env') });

const databaseUrl = process.env.CHECKIN_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing CHECKIN_DATABASE_URL environment variable');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function seedConversationSets() {
  try {
    console.log('🔄 Seeding conversation sets...\n');

    for (const set of DEFAULT_CONVERSATION_SETS) {
      // Check if conversation set already exists
      const existing = await pool.query(
        'SELECT id FROM conversation_sets WHERE name = $1',
        [set.name]
      );

      if (existing.rows.length > 0) {
        // Update existing
        await pool.query(
          `UPDATE conversation_sets 
           SET description = $1, greeting_template = $2, follow_up_template = $3, closing_template = $4, updated_at = NOW()
           WHERE name = $5`,
          [
            set.description,
            set.greeting_template,
            set.follow_up_template,
            set.closing_template,
            set.name,
          ]
        );
        console.log(`✅ Updated conversation set: ${set.name}`);
      } else {
        // Insert new
        await pool.query(
          `INSERT INTO conversation_sets (name, description, greeting_template, follow_up_template, closing_template)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            set.name,
            set.description,
            set.greeting_template,
            set.follow_up_template,
            set.closing_template,
          ]
        );
        console.log(`✅ Created conversation set: ${set.name}`);
      }
    }

    console.log('\n✅ Conversation sets seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding conversation sets:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedConversationSets();

