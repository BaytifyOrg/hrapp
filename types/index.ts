export type UserRole = "admin" | "employee";

export interface Profile {
  id: string;
  role: UserRole;
  employee_id: string | null;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "onboarding" | "active" | "inactive" | "terminated";
  emirates_id: string | null;
  passport_number: string | null;
  visa_number: string | null;
  visa_expiry: string | null;
  nationality: string | null;
  bank_name: string | null;
  iban: string | null;
  bank_routing_code: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  salary_components?: SalaryComponent[];
}

export interface SalaryComponent {
  id: string;
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  effective_from: string;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  days_per_year: number | null;
  is_paid: boolean;
  color: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  employees?: Pick<Employee, "first_name" | "last_name" | "job_title">;
  leave_types?: LeaveType;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: "draft" | "finalized";
  run_date: string | null;
  created_by: string | null;
  created_at: string;
  payroll_items?: PayrollItem[];
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  unpaid_deduction: number;
  other_deductions: number;
  gross_pay: number;
  net_pay: number;
  unpaid_days: number;
  created_at: string;
  employees?: Pick<Employee, "first_name" | "last_name" | "job_title" | "bank_name" | "iban" | "bank_routing_code" | "nationality">;
}
