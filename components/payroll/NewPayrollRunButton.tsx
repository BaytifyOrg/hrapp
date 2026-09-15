"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { getMonthName } from "@/lib/utils";

export default function NewPayrollRunButton() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  async function run() {
    setLoading(true);

    // Get all active employees with latest salary
    const { data: employees } = await supabase
      .from("employees")
      .select("id, salary_components(*)")
      .eq("status", "active");

    if (!employees?.length) {
      alert("No active employees found.");
      setLoading(false);
      return;
    }

    // Get approved unpaid leave for this month
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-31`;

    const { data: unpaidLeave } = await supabase
      .from("leave_requests")
      .select("employee_id, days_count, leave_types(is_paid)")
      .eq("status", "approved")
      .gte("start_date", monthStart)
      .lte("start_date", monthEnd);

    // Create payroll run
    const { data: run, error } = await supabase
      .from("payroll_runs")
      .insert({ month, year, status: "draft", run_date: new Date().toISOString() })
      .select()
      .single();

    if (error || !run) {
      alert("A payroll run already exists for this period.");
      setLoading(false);
      return;
    }

    // Build payroll items
    const items = employees.map((emp) => {
      const salaries = emp.salary_components as Array<{
        basic_salary: number;
        housing_allowance: number;
        transport_allowance: number;
        other_allowances: number;
      }>;
      const salary = salaries?.[0] ?? { basic_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowances: 0 };
      const gross = salary.basic_salary + salary.housing_allowance + salary.transport_allowance + salary.other_allowances;

      // Count unpaid leave days for this employee this month
      const empLeave = unpaidLeave?.filter((l) => {
        const lt = (l.leave_types as unknown) as { is_paid: boolean } | null;
        return l.employee_id === emp.id && lt && !lt.is_paid;
      }) ?? [];
      const unpaidDays = empLeave.reduce((s, l) => s + (l.days_count ?? 0), 0);
      // Deduct: (gross / 26 working days) * unpaid days
      const dailyRate = gross / 26;
      const unpaidDeduction = unpaidDays > 0 ? dailyRate * unpaidDays : 0;
      const net = Math.max(0, gross - unpaidDeduction);

      return {
        payroll_run_id: run.id,
        employee_id: emp.id,
        basic_salary: salary.basic_salary,
        housing_allowance: salary.housing_allowance,
        transport_allowance: salary.transport_allowance,
        other_allowances: salary.other_allowances,
        unpaid_deduction: Math.round(unpaidDeduction * 100) / 100,
        other_deductions: 0,
        gross_pay: gross,
        net_pay: Math.round(net * 100) / 100,
        unpaid_days: unpaidDays,
      };
    });

    await supabase.from("payroll_items").insert(items);

    setShowDialog(false);
    setLoading(false);
    router.push(`/payroll/${run.id}`);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setShowDialog(true)} className="btn-primary">
        <Play size={16} /> Run Payroll
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Run Payroll</h2>
            <p className="text-sm text-gray-500 mb-5">Select the period to process payroll for.</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="label">Month</label>
                <select className="input" value={month} onChange={(e) => setMonth(+e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input" value={year} onChange={(e) => setYear(+e.target.value)}>
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={run} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? "Processing…" : `Process ${getMonthName(month)}`}
              </button>
              <button onClick={() => setShowDialog(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
