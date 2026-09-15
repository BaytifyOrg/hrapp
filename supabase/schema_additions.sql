-- ============================================================
-- New tables for: HR Documents, Offboarding, Benefits, Marketing Requests
-- Run this in Supabase SQL Editor
-- ============================================================

-- HR DOCUMENT LIBRARY
CREATE TABLE IF NOT EXISTS hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  size_bytes INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage HR documents" ON hr_documents FOR ALL USING (is_admin());
CREATE POLICY "All staff can read HR documents" ON hr_documents FOR SELECT USING (auth.uid() IS NOT NULL);

-- OFFBOARDING TASKS
CREATE TABLE IF NOT EXISTS offboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  task TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE offboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage offboarding tasks" ON offboarding_tasks FOR ALL USING (is_admin());

-- EMPLOYEE BENEFITS
CREATE TABLE IF NOT EXISTS employee_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  policy_number TEXT,
  coverage_tier TEXT DEFAULT 'Standard',
  dependents INTEGER NOT NULL DEFAULT 0,
  renewal_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE employee_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all benefits" ON employee_benefits FOR ALL USING (is_admin());
CREATE POLICY "Employees view own benefits" ON employee_benefits FOR SELECT USING (employee_id = my_employee_id());

-- MARKETING REQUESTS
CREATE TABLE IF NOT EXISTS marketing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  request_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','in_progress','completed','rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marketing_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all marketing requests" ON marketing_requests FOR ALL USING (is_admin());
CREATE POLICY "Employees view own requests" ON marketing_requests FOR SELECT USING (employee_id = my_employee_id());
CREATE POLICY "Employees create own requests" ON marketing_requests FOR INSERT WITH CHECK (employee_id = my_employee_id());

-- HR DOCS STORAGE BUCKET (run separately in Storage settings if needed)
-- Create a private bucket called: hr-docs
