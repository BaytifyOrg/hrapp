ALTER TABLE candidates ADD COLUMN IF NOT EXISTS talent_pool BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS candidates_talent_pool_idx ON candidates (talent_pool);
