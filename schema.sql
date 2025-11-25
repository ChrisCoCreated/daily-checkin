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

