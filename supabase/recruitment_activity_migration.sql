CREATE TABLE IF NOT EXISTS candidate_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_sent','email_received','stage_change','note')),
  subject TEXT,
  body_snippet TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE candidate_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage candidate activity" ON candidate_activity FOR ALL USING (is_admin());

CREATE TABLE IF NOT EXISTS imap_sync_state (
  mailbox TEXT PRIMARY KEY,
  last_uid INTEGER NOT NULL
);
ALTER TABLE imap_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage imap sync state" ON imap_sync_state FOR ALL USING (is_admin());
