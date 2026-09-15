import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportsView from "@/components/reports/ReportsView";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [runsRes, itemsRes, employeesRes, leaveRes] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("id, month, year, status")
      .order("year", { ascending: false })
      .order("month", { ascending: false }),

    supabase
      .from("payroll_items")
      .select("id, payroll_run_id, employee_id, gross_pay, net_pay, unpaid_deduction, other_deductions, employees(first_name, last_name, department)"),

    supabase
      .from("employees")
      .select("id, first_name, last_name, department, nationality, status, start_date, visa_expiry"),

    supabase
      .from("leave_requests")
      .select("id, employee_id, start_date, days_count, status, leave_types(name, color), employees(first_name, last_name)")
      .eq("status", "approved"),
  ]);

  return (
    <ReportsView
      payrollRuns={runsRes.data ?? []}
      payrollItems={(itemsRes.data ?? []) as unknown as import("@/components/reports/ReportsView").PayrollItem[]}
      employees={employeesRes.data ?? []}
      leaveRequests={(leaveRes.data ?? []) as unknown as import("@/components/reports/ReportsView").LeaveRequest[]}
    />
  );
}
