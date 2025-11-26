import { Pool } from 'pg';

const databaseUrl = process.env.CHECKIN_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing CHECKIN_DATABASE_URL. Please set your Neon Postgres connection string.');
}

// Neon Postgres connection pool
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export interface Checkin {
  id: string;
  call_id: string;
  call_time: Date;
  transcript: string | null;
  sentiment: string | null;
  risk_level: string | null;
  keywords: string[] | null;
  needs_escalation: boolean;
  escalation_reason: string | null;
  responded: boolean;
}

export async function createCheckin(data: Omit<Checkin, 'id' | 'call_time'>): Promise<Checkin> {
  const result = await pool.query(
    `INSERT INTO checkins (
      call_id, transcript, sentiment, risk_level, keywords,
      needs_escalation, escalation_reason, responded
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.call_id,
      data.transcript,
      data.sentiment,
      data.risk_level,
      data.keywords,
      data.needs_escalation,
      data.escalation_reason,
      data.responded,
    ]
  );
  return result.rows[0] as Checkin;
}

export async function updateCheckin(
  id: string,
  updates: Partial<Omit<Checkin, 'id' | 'call_time'>>
): Promise<Checkin> {
  const keys = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
  if (keys.length === 0) {
    // Return existing record if no updates
    const result = await pool.query('SELECT * FROM checkins WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new Error(`Checkin with id ${id} not found`);
    }
    return result.rows[0] as Checkin;
  }
  
  const setClause = keys
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');
  
  const values = [id, ...keys.map(key => updates[key as keyof typeof updates])];
  
  const result = await pool.query(
    `UPDATE checkins SET ${setClause} WHERE id = $1 RETURNING *`,
    values
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Checkin with id ${id} not found`);
  }
  
  return result.rows[0] as Checkin;
}

export async function getCheckins(limit = 50): Promise<Checkin[]> {
  const result = await pool.query(
    'SELECT * FROM checkins ORDER BY call_time DESC LIMIT $1',
    [limit]
  );
  return result.rows as Checkin[];
}

export async function getCheckinByCallId(callId: string): Promise<Checkin | null> {
  const result = await pool.query(
    'SELECT * FROM checkins WHERE call_id = $1 LIMIT 1',
    [callId]
  );
  return result.rows[0] as Checkin || null;
}
