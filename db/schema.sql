-- ATGFit Database Schema for Neon PostgreSQL
-- Run this once to set up your database

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id VARCHAR(10) PRIMARY KEY,
  name TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programs (saved snapshots)
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  days JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on exercises
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exercises_updated ON exercises;
CREATE TRIGGER trg_exercises_updated
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
