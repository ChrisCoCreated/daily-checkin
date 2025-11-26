import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Pool } from 'pg';

const databaseUrl = process.env.CHECKIN_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing CHECKIN_DATABASE_URL');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    // Check which tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const existingTables = tablesResult.rows.map((row) => row.table_name);
    const requiredTables = ['checkins', 'contacts'];

    const missingTables = requiredTables.filter(
      (table) => !existingTables.includes(table)
    );

    return NextResponse.json({
      status: 'ok',
      existingTables,
      requiredTables,
      missingTables,
      allTablesExist: missingTables.length === 0,
    });
  } catch (error) {
    console.error('Error checking migrations:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      {
        error: 'Failed to check migrations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { action, table } = body;

    if (action === 'create_contacts_table') {
      // Check if table already exists
      const checkResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts'
      `);

      if (checkResult.rows.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Contacts table already exists',
          skipped: true,
        });
      }

      // Create contacts table
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

      // Verify creation
      const verifyResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts'
      `);

      if (verifyResult.rows.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Contacts table created successfully',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Table creation may have failed - verification failed',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "create_contacts_table"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error running migration:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      {
        error: 'Failed to run migration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

