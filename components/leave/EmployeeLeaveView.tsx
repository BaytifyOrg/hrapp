"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, countWorkingDays } from "@/lib/utils";
import { LeaveRequest, LeaveType } from "@/types";
import { Plus } from "lucide-react";

export default function EmployeeLeaveView({ employeeId }: { employeeId: string }) {
  const supabase = createClient();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    supabase.from("leave_requests").select("*, leave_types(name, color)").eq("employee_id", employeeId).order("created_at", { ascending: false }).then(({ data }) => setRequests((data as LeaveRequest[]) ?? []));
    supabase.from("leave_types").select("*").then(({ data }) => setLeaveTypes(data ?? []));
  }, [employeeId]);

  const days = (() => {
    try {
      return form.start_date && form.end_date ? countWorkingDays(form.start_date, form.end_date) : 0;
    } catch {
      return 0;
    }
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      setSubmitError("Please select a start and end date.");
      return;
    }
    if (!form.leave_type_id) {
      setSubmitError("Please select a leave type.");
      return;
    }
    if (!employeeId) {
      setSubmitError("Your account is not linked to an employee record. Please contact your HR admin.");
      return;
    }
    setLoading(true);
    setSubmitError("");
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employeeId,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        days_count: days,
        reason: form.reason || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setSubmitError("Failed to submit request. Please try again or contact HR.");
    } else {
      setRequests((r) => [data as LeaveRequest, ...r]);
      setShowForm(false);
      setSubmitSuccess(true);
      setForm({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
      setTimeout(() => setSubmitSuccess(false), 4000);
    }
  }

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leave</h1>
          <p className="text-sm text-gray-500 mt-1">Submit and track your leave requests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Request Leave
        </button>
      </div>

      {submitSuccess && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
          ✓ Leave request submitted — your manager will review it shortly.
        </div>
      )}
      {submitError && !showForm && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm">{submitError}</div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Leave Request</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Leave Type</label>
                <select className="input" value={form.leave_type_id} onChange={(e) => setForm((f) => ({ ...f, leave_type_id: e.target.value }))} required>
                  <option value="">Select…</option>
                  {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                </select>
              </div>
              <div />
              <div>
                <label className="label">Start Date</label>
                <input type="date" className="input" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" className="input" value={form.end_date} min={form.start_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} required />
              </div>
            </div>
            {days > 0 && (
              <p className="text-sm text-brand-600 font-medium">{days} working day{days !== 1 ? "s" : ""}</p>
            )}
            <div>
              <label className="label">Reason (optional)</label>
              <textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? "Submitting…" : "Submit Request"}</button>
              <button type="button" onClick={() => { setShowForm(false); setSubmitError(""); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Dates</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Days</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map((req) => {
              const lt = req.leave_types as { name: string } | null;
              return (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{lt?.name}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(req.start_date)} → {formatDate(req.end_date)}</td>
                  <td className="px-6 py-3 text-gray-600">{req.days_count}</td>
                  <td className="px-6 py-3"><span className={`badge ${statusColor[req.status]}`}>{req.status}</span></td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{req.review_note ?? "—"}</td>
                </tr>
              );
            })}
            {!requests.length && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No leave requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
