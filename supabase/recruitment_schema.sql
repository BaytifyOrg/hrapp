-- RECRUITMENT / CANDIDATES PIPELINE

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  position_applied TEXT,
  source TEXT,
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','interview_1','interview_2','offer','hired','rejected')),
  cv_file_path TEXT,
  cv_file_name TEXT,
  notes TEXT,
  rating SMALLINT CHECK (rating BETWEEN 0 AND 5),
  welcome_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage candidates" ON candidates FOR ALL USING (is_admin());

-- Storage bucket for CVs (private; accessed via signed URLs from the server only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-cvs', 'candidate-cvs', false)
ON CONFLICT (id) DO NOTHING;
