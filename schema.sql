-- Daily Check-In Database Schema
-- Run this SQL in your Postgres database (Supabase/Neon)

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  call_time TIMESTAMPTZ DEFAULT NOW(),
  transcript TEXT,
  sentiment TEXT,
  risk_level TEXT,
  keywords TEXT[],
  needs_escalation BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,
  responded BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_checkins_call_id ON checkins(call_id);
CREATE INDEX IF NOT EXISTS idx_checkins_call_time ON checkins(call_time DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_needs_escalation ON checkins(needs_escalation) WHERE needs_escalation = TRUE;

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

-- Conversation sets table
CREATE TABLE IF NOT EXISTS conversation_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  greeting_template TEXT NOT NULL,
  follow_up_template TEXT,
  closing_template TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_sets_name ON conversation_sets(name);

-- Update checkins table to add contact_id and conversation_set_id
ALTER TABLE checkins 
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_set_id UUID REFERENCES conversation_sets(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_checkins_contact_id ON checkins(contact_id);
CREATE INDEX IF NOT EXISTS idx_checkins_conversation_set_id ON checkins(conversation_set_id);


