"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, TrendingUp, Users } from "lucide-react";

type EmployeeLeave = {
  id: string;
  name: string;
  annual_used: number;
  annual_total: number;
  sick_used: number;
  on_leave_now: boolean;
  leave_end: string | null;
};

export default function LeaveDashboard() {
  const supabase = createClient();
  const [data, setData] = useState<EmployeeLeave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0];

      const [{ data: employees }, { data: requests }, { data: leaveTypes }] = await Promise.all([
        supabase.from("employees").select("id, first_name, last_name").eq("status", "active"),
        supabase.from("leave_requests").select("*").eq("status", "approved"),
        supabase.from("leave_types").select("id, name, days_per_year"),
      ]);

      const annualTypeId = leaveTypes?.find(lt => lt.name === "Annual Leave")?.id;
      const sickTypeId = leaveTypes?.find(lt => lt.name === "Sick Leave")?.id;
      const annualTotal = leaveTypes?.find(lt => lt.name === "Annual Leave")?.days_per_year ?? 30;

      const result: EmployeeLeave[] = (employees ?? []).map(emp => {
        const empRequests = (requests ?? []).filter(r => r.employee_id === emp.id);
        const annual_used = empRequests.filter(r => r.leave_type_id === annualTypeId).reduce((s, r) => s + r.days_count, 0);
        const sick_used = empRequests.filter(r => r.leave_type_id === sickTypeId).reduce((s, r) => s + r.days_count, 0);
        const currentLeave = empRequests.find(r => r.start_date <= today && r.end_date >= today);

        return {
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          annual_used,
          annual_total: annualTotal,
          sick_used,
          on_leave_now: !!currentLeave,
          leave_end: currentLeave?.end_date ?? null,
        };
      });

      setData(result);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLeaveNow = data.filter(e => e.on_leave_now);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50"><Users size={20} className="text-blue-500" /></div>
          <div>
            <p className="text-xs text-gray-400">Total Active Staff</p>
            <p className="text-2xl font-bold text-gray-900">{data.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50"><Calendar size={20} className="text-amber-500" /></div>
          <div>
            <p className="text-xs text-gray-400">Currently On Leave</p>
            <p className="text-2xl font-bold text-gray-900">{onLeaveNow.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50"><TrendingUp size={20} className="text-green-500" /></div>
          <div>
            <p className="text-xs text-gray-400">In Office Today</p>
            <p className="text-2xl font-bold text-gray-900">{data.length - onLeaveNow.length}</p>
          </div>
        </div>
      </div>

      {/* Currently on leave */}
      {onLeaveNow.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Currently On Leave</h2>
          <div className="space-y-2">
            {onLeaveNow.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-sm font-medium text-gray-800">{e.name}</span>
                {e.leave_end && <span className="text-xs text-amber-600">Returns {new Date(e.leave_end).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave balances table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Leave Balances</h2>
          <p className="text-xs text-gray-400 mt-0.5">Based on approved leave this year</p>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Employee</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Annual Used</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Annual Remaining</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Sick Days Used</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map(e => {
                const remaining = e.annual_total - e.annual_used;
                const pct = Math.min((e.annual_used / e.annual_total) * 100, 100);
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">{e.name}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-600">{e.annual_used} / {e.annual_total} days</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={remaining <= 5 ? "text-red-500 font-medium" : "text-gray-600"}>
                        {remaining} days
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{e.sick_used} days</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
