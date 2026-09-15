-- ============================================================
-- HR App Database Schema
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================

-- EMPLOYEES
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  job_title TEXT,
  department TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','terminated')),
  emirates_id TEXT,
  passport_number TEXT,
  visa_number TEXT,
  visa_expiry DATE,
  nationality TEXT,
  bank_name TEXT,
  iban TEXT,
  bank_routing_code TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALARY COMPONENTS (history of salary changes)
CREATE TABLE salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(10,2) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (links Supabase auth users to employees + role)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','employee')),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL
);

-- LEAVE TYPES
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  days_per_year INTEGER,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  color TEXT NOT NULL DEFAULT '#3b5bdb'
);

-- Insert default leave types
INSERT INTO leave_types (name, days_per_year, is_paid, color) VALUES
  ('Annual Leave', 30, TRUE, '#3b5bdb'),
  ('Sick Leave', 15, TRUE, '#f59e0b'),
  ('Unpaid Leave', NULL, FALSE, '#6b7280'),
  ('Emergency Leave', 3, TRUE, '#ef4444'),
  ('Maternity Leave', 60, TRUE, '#ec4899'),
  ('Hajj Leave', 30, TRUE, '#10b981');

-- LEAVE REQUESTS
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYROLL RUNS
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  run_date TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (month, year)
);

-- PAYROLL ITEMS (one row per employee per payroll run)
CREATE TABLE payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  basic_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(10,2) NOT NULL DEFAULT 0,
  unpaid_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_pay NUMERIC(10,2) NOT NULL,
  net_pay NUMERIC(10,2) NOT NULL,
  unpaid_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper: get current user's employee_id
CREATE OR REPLACE FUNCTION my_employee_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT employee_id FROM profiles WHERE id = auth.uid();
$$;

-- EMPLOYEES policies
CREATE POLICY "Admins can do everything on employees" ON employees FOR ALL USING (is_admin());
CREATE POLICY "Employees can view their own record" ON employees FOR SELECT USING (id = my_employee_id());

-- SALARY COMPONENTS policies
CREATE POLICY "Admins manage salaries" ON salary_components FOR ALL USING (is_admin());
CREATE POLICY "Employees view own salary" ON salary_components FOR SELECT USING (employee_id = my_employee_id());

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (is_admin());

-- LEAVE TYPES (everyone can read)
CREATE POLICY "All authenticated users read leave types" ON leave_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage leave types" ON leave_types FOR ALL USING (is_admin());

-- LEAVE REQUESTS
CREATE POLICY "Admins manage all leave requests" ON leave_requests FOR ALL USING (is_admin());
CREATE POLICY "Employees can view own leave" ON leave_requests FOR SELECT USING (employee_id = my_employee_id());
CREATE POLICY "Employees can create own leave" ON leave_requests FOR INSERT WITH CHECK (employee_id = my_employee_id());

-- PAYROLL (admin only)
CREATE POLICY "Admins manage payroll runs" ON payroll_runs FOR ALL USING (is_admin());
CREATE POLICY "Admins manage payroll items" ON payroll_items FOR ALL USING (is_admin());
CREATE POLICY "Employees can view own payslip" ON payroll_items FOR SELECT USING (employee_id = my_employee_id());

-- ============================================================
-- AUTO-CREATE PROFILE on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role) VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
