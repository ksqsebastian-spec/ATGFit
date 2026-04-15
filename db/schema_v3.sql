-- v3: add metadata column to cardio_plans for sessions/long-run info
ALTER TABLE cardio_plans ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
