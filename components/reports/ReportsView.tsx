"use client";

import { useState, useMemo } from "react";
import { DollarSign, Users, CalendarDays, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type PayrollRun = { id: string; month: number; year: number; status: string };
export type PayrollItem = {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  gross_pay: number;
  net_pay: number;
  unpaid_deduction: number;
  other_deductions: number;
  employees: { first_name: string; last_name: string; department: string | null } | null;
};
export type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  nationality: string | null;
  status: string;
  start_date: string | null;
  visa_expiry: string | null;
};
export type LeaveRequest = {
  id: string;
  employee_id: string;
  start_date: string;
  days_count: number;
  status: string;
  leave_types: { name: string; color: string } | null;
  employees: { first_name: string; last_name: string } | null;
};

interface Props {
  payrollRuns: PayrollRun[];
  payrollItems: PayrollItem[];
  employees: Employee[];
  leaveRequests: LeaveRequest[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Period = "full" | "q1" | "q2" | "q3" | "q4";
type Tab = "payroll" | "leave" | "headcount" | "visas";

const PERIOD_MONTHS: Record<Period, number[]> = {
  full: [1,2,3,4,5,6,7,8,9,10,11,12],
  q1:   [1,2,3],
  q2:   [4,5,6],
  q3:   [7,8,9],
  q4:   [10,11,12],
};

export default function ReportsView({ payrollRuns, payrollItems, employees, leaveRequests }: Props) {
  const currentYear = new Date().getFullYear();
  const years = [...new Set([currentYear, ...payrollRuns.map(r => r.year)])].sort((a, b) => b - a);

  const [year, setYear] = useState(currentYear);
  const [period, setPeriod] = useState<Period>("full");
  const [tab, setTab] = useState<Tab>("payroll");

  const selectedMonths = PERIOD_MONTHS[period];

  /* ── Payroll ── */
  const filteredRuns = useMemo(
    () => payrollRuns.filter(r => r.year === year && selectedMonths.includes(r.month) && r.status === "finalized"),
    [payrollRuns, year, period]
  );
  const filteredRunIds = useMemo(() => new Set(filteredRuns.map(r => r.id)), [filteredRuns]);

  const payrollByMonth = useMemo(() =>
    filteredRuns
      .map(run => {
        const items = payrollItems.filter(i => i.payroll_run_id === run.id);
        return {
          ...run,
          totalGross: items.reduce((s, i) => s + i.gross_pay, 0),
          totalNet: items.reduce((s, i) => s + i.net_pay, 0),
          totalDeductions: items.reduce((s, i) => s + i.unpaid_deduction + i.other_deductions, 0),
          employeeCount: items.length,
        };
      })
      .sort((a, b) => a.month - b.month),
    [filteredRuns, payrollItems]
  );

  const grandGross = payrollByMonth.reduce((s, r) => s + r.totalGross, 0);
  const grandNet = payrollByMonth.reduce((s, r) => s + r.totalNet, 0);
  const grandDeductions = grandGross - grandNet;

  const empPayrollSummary = useMemo(() => {
    const map = new Map<string, { name: string; department: string | null; gross: number; net: number; months: number }>();
    payrollItems
      .filter(i => filteredRunIds.has(i.payroll_run_id))
      .forEach(item => {
        const prev = map.get(item.employee_id);
        const name = item.employees
          ? `${item.employees.first_name} ${item.employees.last_name}`
          : "Unknown";
        if (prev) {
          prev.gross += item.gross_pay;
          prev.net += item.net_pay;
          prev.months += 1;
        } else {
          map.set(item.employee_id, { name, department: item.employees?.department ?? null, gross: item.gross_pay, net: item.net_pay, months: 1 });
        }
      });
    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [payrollItems, filteredRunIds]);

  /* ── Leave ── */
  const filteredLeave = useMemo(
    () => leaveRequests.filter(lr => {
      const d = new Date(lr.start_date);
      return d.getFullYear() === year && selectedMonths.includes(d.getMonth() + 1);
    }),
    [leaveRequests, year, period]
  );

  const leaveByEmployee = useMemo(() => {
    const map = new Map<string, { name: string; total: number; byType: Record<string, number> }>();
    filteredLeave.forEach(lr => {
      const name = lr.employees ? `${lr.employees.first_name} ${lr.employees.last_name}` : "Unknown";
      const type = lr.leave_types?.name ?? "Other";
      const prev = map.get(lr.employee_id);
      if (prev) {
        prev.total += lr.days_count;
        prev.byType[type] = (prev.byType[type] ?? 0) + lr.days_count;
      } else {
        map.set(lr.employee_id, { name, total: lr.days_count, byType: { [type]: lr.days_count } });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredLeave]);

  const totalLeaveDays = filteredLeave.reduce((s, lr) => s + lr.days_count, 0);

  /* ── Headcount ── */
  const active = employees.filter(e => e.status === "active");

  const byDept = useMemo(() => {
    const map = new Map<string, number>();
    active.forEach(e => { const d = e.department ?? "Unassigned"; map.set(d, (map.get(d) ?? 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [active]);

  const byNat = useMemo(() => {
    const map = new Map<string, number>();
    active.forEach(e => { const n = e.nationality ?? "Unknown"; map.set(n, (map.get(n) ?? 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [active]);

  /* ── Visa alerts ── */
  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 86400000);
  const visaAlerts = employees
    .filter(e => e.status === "active" && e.visa_expiry)
    .map(e => ({ ...e, expiry: new Date(e.visa_expiry!) }))
    .filter(e => e.expiry <= in90)
    .sort((a, b) => a.expiry.getTime() - b.expiry.getTime());

  const tabs = [
    { id: "payroll" as Tab, label: "Payroll",    icon: DollarSign },
    { id: "leave"   as Tab, label: "Leave",      icon: CalendarDays },
    { id: "headcount" as Tab, label: "Headcount", icon: Users },
    { id: "visas"   as Tab, label: "Visa Alerts", icon: AlertTriangle, badge: visaAlerts.length || undefined },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#232D3E" }}>Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Analytics across payroll, leave and headcount</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="input text-sm py-1.5 w-28">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value as Period)} className="input text-sm py-1.5 w-40">
            <option value="full">Full Year</option>
            <option value="q1">Q1 — Jan to Mar</option>
            <option value="q2">Q2 — Apr to Jun</option>
            <option value="q3">Q3 — Jul to Sep</option>
            <option value="q4">Q4 — Oct to Dec</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id ? "border-[#232D3E] text-[#232D3E]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={15} />
            {label}
            {badge !== undefined && (
              <span className="ml-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PAYROLL ── */}
      {tab === "payroll" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Total Gross Pay"   value={formatCurrency(grandGross)}      sub={`${payrollByMonth.length} finalized run${payrollByMonth.length !== 1 ? "s" : ""}`} />
            <Stat label="Total Net Pay"     value={formatCurrency(grandNet)}        sub="After deductions" />
            <Stat label="Total Deductions"  value={formatCurrency(grandDeductions)} sub="Unpaid leave + other" />
          </div>

          {payrollByMonth.length === 0 ? (
            <Empty text="No finalized payroll runs for this period." />
          ) : (
            <>
              <TableCard title="Monthly Breakdown">
                <thead>
                  <Th cols={["Month","Employees","Gross Pay","Deductions","Net Pay"]} rights={[false,true,true,true,true]} />
                </thead>
                <tbody className="divide-y">
                  {payrollByMonth.map(run => (
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{MONTHS[run.month - 1]} {run.year}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{run.employeeCount}</td>
                      <td className="px-6 py-3 text-right">{formatCurrency(run.totalGross)}</td>
                      <td className="px-6 py-3 text-right text-red-500">
                        {run.totalDeductions > 0 ? `− ${formatCurrency(run.totalDeductions)}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">{formatCurrency(run.totalNet)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-gray-50 font-semibold text-sm">
                    <td className="px-6 py-3">Total</td>
                    <td />
                    <td className="px-6 py-3 text-right">{formatCurrency(grandGross)}</td>
                    <td className="px-6 py-3 text-right text-red-500">− {formatCurrency(grandDeductions)}</td>
                    <td className="px-6 py-3 text-right">{formatCurrency(grandNet)}</td>
                  </tr>
                </tfoot>
              </TableCard>

              <TableCard title="By Employee">
                <thead>
                  <Th cols={["Employee","Department","Months Paid","Total Gross","Total Net"]} rights={[false,false,true,true,true]} />
                </thead>
                <tbody className="divide-y">
                  {empPayrollSummary.map((emp, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{emp.name}</td>
                      <td className="px-6 py-3 text-gray-500">{emp.department ?? "—"}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{emp.months}</td>
                      <td className="px-6 py-3 text-right">{formatCurrency(emp.gross)}</td>
                      <td className="px-6 py-3 text-right font-semibold">{formatCurrency(emp.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableCard>
            </>
          )}
        </div>
      )}

      {/* ── LEAVE ── */}
      {tab === "leave" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Total Days Taken"     value={String(totalLeaveDays)}            sub="Approved leave" />
            <Stat label="Approved Requests"    value={String(filteredLeave.length)}      sub="For this period" />
            <Stat label="Employees with Leave" value={String(leaveByEmployee.length)}    sub="Had at least 1 day" />
          </div>

          {leaveByEmployee.length === 0 ? (
            <Empty text="No approved leave for this period." />
          ) : (
            <TableCard title="Leave by Employee">
              <thead>
                <Th cols={["Employee","Total Days","Breakdown by Type"]} rights={[false,true,false]} />
              </thead>
              <tbody className="divide-y">
                {leaveByEmployee.map((emp, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{emp.name}</td>
                    <td className="px-6 py-3 text-right font-semibold">{emp.total}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(emp.byType).map(([type, days]) => (
                          <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {type}: {days}d
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
          )}
        </div>
      )}

      {/* ── HEADCOUNT ── */}
      {tab === "headcount" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Active Employees" value={String(active.length)}       sub="Currently employed" />
            <Stat label="Departments"      value={String(byDept.length)}       sub="Across the company" />
            <Stat label="Nationalities"    value={String(new Set(active.map(e => e.nationality).filter(Boolean)).size)} sub="Represented" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <section className="card">
              <h3 className="font-semibold text-gray-900 mb-4">By Department</h3>
              {byDept.length === 0 ? <p className="text-sm text-gray-400">No data.</p> : (
                <div className="space-y-3">
                  {byDept.map(([dept, count]) => (
                    <div key={dept}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{dept}</span>
                        <span className="font-semibold" style={{ color: "#232D3E" }}>{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(count / active.length) * 100}%`, backgroundColor: "#232D3E" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <h3 className="font-semibold text-gray-900 mb-4">By Nationality</h3>
              {byNat.length === 0 ? <p className="text-sm text-gray-400">No data.</p> : (
                <div className="space-y-3">
                  {byNat.map(([nat, count]) => (
                    <div key={nat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{nat}</span>
                        <span className="font-semibold" style={{ color: "#232D3E" }}>{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(count / active.length) * 100}%`, backgroundColor: "#C2B08B" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ── VISA ALERTS ── */}
      {tab === "visas" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Expiring in 30 days" value={String(visaAlerts.filter(e => e.expiry <= new Date(today.getTime() + 30 * 86400000)).length)} sub="Urgent" />
            <Stat label="Expiring in 60 days" value={String(visaAlerts.filter(e => e.expiry <= new Date(today.getTime() + 60 * 86400000)).length)} sub="" />
            <Stat label="Expiring in 90 days" value={String(visaAlerts.length)} sub="Total needing action" />
          </div>

          {visaAlerts.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">✓ No visa renewals due in the next 90 days.</p>
            </div>
          ) : (
            <TableCard title="Upcoming Visa Expirations">
              <thead>
                <Th cols={["Employee","Department","Nationality","Expiry Date","Days Left"]} rights={[false,false,false,false,false]} />
              </thead>
              <tbody className="divide-y">
                {visaAlerts.map(emp => {
                  const daysLeft = Math.ceil((emp.expiry.getTime() - today.getTime()) / 86400000);
                  const expired = daysLeft <= 0;
                  const urgent  = daysLeft <= 30;
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{emp.first_name} {emp.last_name}</td>
                      <td className="px-6 py-3 text-gray-500">{emp.department ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-500">{emp.nationality ?? "—"}</td>
                      <td className="px-6 py-3">
                        {emp.expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`badge ${expired ? "bg-red-100 text-red-700" : urgent ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                          {expired ? "EXPIRED" : `${daysLeft} days`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableCard>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Small helpers ── */

function Empty({ text }: { text: string }) {
  return (
    <div className="card text-center py-10">
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: "#232D3E" }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </section>
  );
}

function Th({ cols, rights }: { cols: string[]; rights: boolean[] }) {
  return (
    <tr className="border-b bg-gray-50">
      {cols.map((c, i) => (
        <th key={c} className={`px-6 py-3 font-medium text-gray-500 ${rights[i] ? "text-right" : "text-left"}`}>{c}</th>
      ))}
    </tr>
  );
}
