-- Migration: Add contacts table
-- Run this to add the contacts table to your existing database

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

