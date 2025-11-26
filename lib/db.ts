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
  contact_id: string | null;
  conversation_set_id: string | null;
}

export async function createCheckin(data: Omit<Checkin, 'id' | 'call_time'>): Promise<Checkin> {
  const result = await pool.query(
    `INSERT INTO checkins (
      call_id, transcript, sentiment, risk_level, keywords,
      needs_escalation, escalation_reason, responded, contact_id, conversation_set_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      data.contact_id || null,
      data.conversation_set_id || null,
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

export interface Contact {
  id: string;
  name: string;
  organisation: string | null;
  talk_slowly: boolean;
  number_to_call: string;
  escalation_name: string | null;
  escalation_number: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function getContacts(): Promise<Contact[]> {
  const result = await pool.query(
    'SELECT * FROM contacts ORDER BY name ASC'
  );
  return result.rows as Contact[];
}

export async function getContactById(id: string): Promise<Contact | null> {
  const result = await pool.query(
    'SELECT * FROM contacts WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] as Contact || null;
}

export async function createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
  const result = await pool.query(
    `INSERT INTO contacts (
      name, organisation, talk_slowly, number_to_call,
      escalation_name, escalation_number
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      data.name,
      data.organisation,
      data.talk_slowly,
      data.number_to_call,
      data.escalation_name,
      data.escalation_number,
    ]
  );
  return result.rows[0] as Contact;
}

export async function updateContact(
  id: string,
  updates: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>
): Promise<Contact> {
  const keys = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
  if (keys.length === 0) {
    const result = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new Error(`Contact with id ${id} not found`);
    }
    return result.rows[0] as Contact;
  }
  
  const setClause = keys
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');
  
  const values = [id, ...keys.map(key => updates[key as keyof typeof updates])];
  
  const result = await pool.query(
    `UPDATE contacts SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    values
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Contact with id ${id} not found`);
  }
  
  return result.rows[0] as Contact;
}

export async function deleteContact(id: string): Promise<void> {
  const result = await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new Error(`Contact with id ${id} not found`);
  }
}

export interface ConversationSet {
  id: string;
  name: string;
  description: string | null;
  greeting_template: string;
  follow_up_template: string | null;
  closing_template: string;
  created_at: Date;
  updated_at: Date;
}

export async function getConversationSetById(id: string): Promise<ConversationSet | null> {
  const result = await pool.query(
    'SELECT * FROM conversation_sets WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] as ConversationSet || null;
}

export async function getConversationSetByName(name: string): Promise<ConversationSet | null> {
  const result = await pool.query(
    'SELECT * FROM conversation_sets WHERE name = $1 LIMIT 1',
    [name]
  );
  return result.rows[0] as ConversationSet || null;
}

export async function getAllConversationSets(): Promise<ConversationSet[]> {
  const result = await pool.query(
    'SELECT * FROM conversation_sets ORDER BY name ASC'
  );
  return result.rows as ConversationSet[];
}

export async function createConversationSet(
  data: Omit<ConversationSet, 'id' | 'created_at' | 'updated_at'>
): Promise<ConversationSet> {
  const result = await pool.query(
    `INSERT INTO conversation_sets (
      name, description, greeting_template, follow_up_template, closing_template
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      data.name,
      data.description,
      data.greeting_template,
      data.follow_up_template,
      data.closing_template,
    ]
  );
  return result.rows[0] as ConversationSet;
}

export async function updateConversationSet(
  id: string,
  updates: Partial<Omit<ConversationSet, 'id' | 'created_at' | 'updated_at'>>
): Promise<ConversationSet> {
  const keys = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
  if (keys.length === 0) {
    const result = await pool.query('SELECT * FROM conversation_sets WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new Error(`ConversationSet with id ${id} not found`);
    }
    return result.rows[0] as ConversationSet;
  }
  
  const setClause = keys
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');
  
  const values = [id, ...keys.map(key => updates[key as keyof typeof updates])];
  
  const result = await pool.query(
    `UPDATE conversation_sets SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    values
  );
  
  if (result.rows.length === 0) {
    throw new Error(`ConversationSet with id ${id} not found`);
  }
  
  return result.rows[0] as ConversationSet;
}

export async function deleteConversationSet(id: string): Promise<void> {
  const result = await pool.query('DELETE FROM conversation_sets WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new Error(`ConversationSet with id ${id} not found`);
  }
}
