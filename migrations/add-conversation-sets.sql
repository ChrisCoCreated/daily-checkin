-- Migration: Add conversation_sets table and update checkins table
-- Run this to add conversation sets support to your existing database

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

