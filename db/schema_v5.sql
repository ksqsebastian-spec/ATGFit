-- schema_v5: workout runner, pixel dog, bio

ALTER TABLE users ADD COLUMN IF NOT EXISTS dog_id INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS workout_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id  TEXT NOT NULL,
  program_name TEXT NOT NULL,
  section     TEXT NOT NULL DEFAULT 'atg',
  day_num     INTEGER NOT NULL,
  day_label   TEXT NOT NULL DEFAULT '',
  exercises   JSONB NOT NULL DEFAULT '[]',
  duration_s  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workout_logs_user_idx ON workout_logs(user_id, created_at DESC);
