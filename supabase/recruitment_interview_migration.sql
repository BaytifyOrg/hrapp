ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_zoom_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_zoom_meeting_id TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_invite_sent_at TIMESTAMPTZ;
