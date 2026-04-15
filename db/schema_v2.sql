-- ATGFit v2 schema additions — run after schema.sql

CREATE TABLE IF NOT EXISTS bb_exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bb_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  days JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cardio_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  activity TEXT NOT NULL,
  base_distance NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'km',
  weeks_completed INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hiit_logs (
  id TEXT PRIMARY KEY,
  protocol TEXT NOT NULL,
  duration_min INTEGER,
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_bb_exercises_updated ON bb_exercises;
CREATE TRIGGER trg_bb_exercises_updated
  BEFORE UPDATE ON bb_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
