"use client";

import { useState, useEffect } from "react";
import { formatDate, countWorkingDays } from "@/lib/utils";
import ApproveRejectButtons from "./ApproveRejectButtons";
import AutoRefresh from "./AutoRefresh";
import LeaveCalendar from "./LeaveCalendar";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Trash2 } from "lucide-react";

type LeaveRequest = Record<string, unknown>;

export default function AdminLeaveView({ requests: initialRequests, employees, leaveTypes }: {
  requests: LeaveRequest[];
  employees: { id: string; first_name: string; last_name: string; date_of_birth?: string | null }[];
  leaveTypes: { id: string; name: string; color: string }[];
}) {
  const supabase = createClient();
  const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: "", leave_type_id: "", start_date: "", end_date: "", reason: "", status: "approved" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalEmployees, setModalEmployees] = useState(employees);
  const [modalLeaveTypes, setModalLeaveTypes] = useState(leaveTypes);

  // Fetch fresh data when modal opens in case server props were empty
  useEffect(() => {
    if (!showModal) return;
    fetch("/api/employees-list").then(r => r.json()).then(data => { if (data?.length) setModalEmployees(data); });
    supabase.from("leave_types").select("id, name, color")
      .then(({ data }) => { if (data?.length) setModalLeaveTypes(data); });
  }, [showModal]);

  const pending = requests.filter((r) => r.status === "pending");
  const others  = requests.filter((r) => r.status !== "pending");

  const days = (() => {
    try { return form.start_date && form.end_date ? countWorkingDays(form.start_date, form.end_date) : 0; }
    catch { return 0; }
  })();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.leave_type_id || !form.start_date || !form.end_date) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: form.employee_id,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        days_count: days,
        reason: form.reason || null,
        status: form.status,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError("Failed to save. Please try again."); return; }
    const emp = modalEmployees.find(e => e.id === form.employee_id) ?? null;
    const lt  = modalLeaveTypes.find(l => l.id === form.leave_type_id) ?? null;
    setRequests(r => [{ ...data, employees: emp, leave_types: lt }, ...r]);
    setShowModal(false);
    setForm({ employee_id: "", leave_type_id: "", start_date: "", end_date: "", reason: "", status: "approved" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">{pending.length} pending approval</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Add Leave
          </button>
          <AutoRefresh />
        </div>
      </div>

      {/* Add Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-gray-900">Add Leave Manually</h2>
              <button onClick={() => { setShowModal(false); setError(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">Employee *</label>
                <select className="input" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} required>
                  <option value="">Select employee…</option>
                  {modalEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Leave Type *</label>
                <select className="input" value={form.leave_type_id} onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))} required>
                  <option value="">Select type…</option>
                  {modalLeaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input type="date" className="input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input type="date" className="input" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
                </div>
              </div>
              {days > 0 && <p className="text-sm font-medium text-blue-600">{days} working day{days !== 1 ? "s" : ""}</p>}
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Public holiday, carried over, etc." />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : "Add Leave"}</button>
                <button type="button" onClick={() => { setShowModal(false); setError(""); }} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LeaveCalendar requests={requests} employees={employees} />

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-gray-700 mb-4">Pending Approval</h2>
          <div className="space-y-3">
            {pending.map((req) => (
              <LeaveCard key={req.id as string} req={req} showActions onDelete={id => setRequests(r => r.filter(x => x.id !== id))} />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="card text-center py-10 mb-8">
          <p className="text-gray-400 text-sm">No pending leave requests.</p>
        </div>
      )}

      <section>
        <h2 className="font-semibold text-gray-700 mb-4">All Requests</h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Employee</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Dates</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Days</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {others.map((req) => {
                const emp = req.employees as { first_name: string; last_name: string } | null;
                const lt  = req.leave_types as { name: string; color: string } | null;
                const statusColor: Record<string, string> = {
                  approved: "bg-green-100 text-green-700",
                  rejected: "bg-red-100 text-red-700",
                };
                return (
                  <tr key={req.id as string} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{emp?.first_name} {emp?.last_name}</td>
                    <td className="px-6 py-3 text-gray-600">{lt?.name}</td>
                    <td className="px-6 py-3 text-gray-600">{formatDate(req.start_date as string)} → {formatDate(req.end_date as string)}</td>
                    <td className="px-6 py-3 text-gray-600">{req.days_count as number}</td>
                    <td className="px-6 py-3">
                      <span className={`badge ${statusColor[req.status as string] ?? "bg-gray-100 text-gray-600"}`}>{req.status as string}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{(req.review_note as string) ?? ""}</td>
                  </tr>
                );
              })}
              {!others.length && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No processed requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function LeaveCard({ req, showActions, onDelete }: { req: LeaveRequest; showActions?: boolean; onDelete?: (id: string) => void }) {
  const emp = req.employees as { first_name: string; last_name: string; job_title: string } | null;
  const lt  = req.leave_types as { name: string } | null;

  async function handleDelete() {
    if (!confirm("Delete this leave request?")) return;
    await fetch(`/api/leave/${req.id}`, { method: "DELETE" });
    onDelete?.(req.id as string);
  }

  return (
    <div className="card flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-gray-900">{emp?.first_name} {emp?.last_name}</span>
          <span className="text-xs text-gray-400">{emp?.job_title}</span>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{lt?.name}</span> ·{" "}
          {formatDate(req.start_date as string)} → {formatDate(req.end_date as string)} ·{" "}
          <span className="font-medium">{req.days_count as number} working days</span>
        </p>
        {req.reason ? <p className="text-sm text-gray-500 mt-1 italic">&ldquo;{String(req.reason)}&rdquo;</p> : null}
      </div>
      <div className="flex items-start gap-2">
        {showActions && <ApproveRejectButtons requestId={req.id as string} />}
        <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors mt-0.5" title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
