-- Tags for quick filtering (e.g. "Hot lead", "Not right now")
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Structured interview feedback notes
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_notes JSONB;

-- Self-service scheduling link token
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS scheduling_token TEXT UNIQUE;

-- Allow "call" as an activity type for manual call logging
ALTER TABLE candidate_activity DROP CONSTRAINT IF EXISTS candidate_activity_type_check;
ALTER TABLE candidate_activity ADD CONSTRAINT candidate_activity_type_check
  CHECK (type IN ('email_sent','email_received','stage_change','note','call'));
