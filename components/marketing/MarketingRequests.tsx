"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Megaphone, Plus, X, Clock, CheckCircle, Circle, AlertCircle } from "lucide-react";

type Employee = { id: string; first_name: string; last_name: string; };
type Request = {
  id: string;
  employee_id: string;
  request_type: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const REQUEST_TYPES = ["Social Media Post", "Brochure / Flyer", "Email Campaign", "Property Listing", "Video / Reel", "Photography", "Event Support", "Other"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const STATUSES = ["submitted", "in_progress", "completed", "rejected"];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  submitted: { label: "Submitted", color: "bg-blue-50 text-blue-600", icon: <Clock size={12} /> },
  in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-600", icon: <Circle size={12} /> },
  completed: { label: "Completed", color: "bg-green-50 text-green-600", icon: <CheckCircle size={12} /> },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-600", icon: <AlertCircle size={12} /> },
};

const priorityColor: Record<string, string> = {
  Low: "bg-gray-100 text-gray-500",
  Normal: "bg-blue-50 text-blue-500",
  High: "bg-amber-50 text-amber-600",
  Urgent: "bg-red-50 text-red-600",
};

export default function MarketingRequests({ isAdmin, currentEmployeeId, employees }: { isAdmin: boolean; currentEmployeeId?: string; employees: Employee[]; }) {
  const supabase = createClient();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [form, setForm] = useState({ request_type: "Social Media Post", title: "", description: "", deadline: "", priority: "Normal" });
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => { loadRequests(); }, []); // eslint-disable-line

  async function loadRequests() {
    setLoading(true);
    let q = supabase.from("marketing_requests").select("*").order("created_at", { ascending: false });
    if (!isAdmin && currentEmployeeId) q = q.eq("employee_id", currentEmployeeId);
    const { data } = await q;
    setRequests(data ?? []);
    setLoading(false);
  }

  async function submit() {
    if (!form.title.trim()) return alert("Please add a title.");
    const empId = isAdmin ? employees[0]?.id : currentEmployeeId;
    if (!empId) return;
    await supabase.from("marketing_requests").insert({ ...form, employee_id: empId, status: "submitted", deadline: form.deadline || null, description: form.description || null });
    setShowForm(false);
    setForm({ request_type: "Social Media Post", title: "", description: "", deadline: "", priority: "Normal" });
    await loadRequests();
  }

  async function updateStatus(id: string, status: string, notes?: string) {
    await supabase.from("marketing_requests").update({ status, admin_notes: notes ?? null }).eq("id", id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status, admin_notes: notes ?? r.admin_notes } : r));
  }

  function empName(id: string) {
    const e = employees.find(e => e.id === id);
    return e ? `${e.first_name} ${e.last_name}` : "—";
  }

  const filtered = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Submit and track marketing support requests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Request
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">New Marketing Request</h2>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Request Type</label>
              <select className="input" value={form.request_type} onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))}>
                {REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Title / Brief Summary</label>
              <input className="input" placeholder="e.g. Instagram post for Downtown launch" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description (optional)</label>
              <textarea className="input" rows={3} placeholder="Provide details, links, references…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Deadline (optional)</label>
              <input className="input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="btn-primary">Submit Request</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFilterStatus(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterStatus ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>All ({requests.length})</button>
        {STATUSES.map(s => {
          const count = requests.filter(r => r.status === s).length;
          if (count === 0) return null;
          return (
            <button key={s} onClick={() => setFilterStatus(s === filterStatus ? null : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {statusConfig[s]?.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Megaphone size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const sc = statusConfig[req.status] ?? statusConfig.submitted;
            return (
              <div key={req.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.icon}{sc.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor[req.priority] ?? "bg-gray-100 text-gray-500"}`}>{req.priority}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{req.request_type}</span>
                    </div>
                    <p className="font-medium text-gray-800">{req.title}</p>
                    {isAdmin && <p className="text-xs text-gray-400 mt-0.5">From: {empName(req.employee_id)}</p>}
                    {req.description && <p className="text-sm text-gray-500 mt-1">{req.description}</p>}
                    {req.deadline && <p className="text-xs text-gray-400 mt-1">Deadline: {new Date(req.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                    {req.admin_notes && <p className="text-xs text-gray-500 mt-1 italic">Note: {req.admin_notes}</p>}
                  </div>
                  <p className="text-xs text-gray-300 flex-shrink-0">{new Date(req.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>
                </div>

                {isAdmin && req.status !== "completed" && req.status !== "rejected" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                    <input className="input text-xs py-1 flex-1 min-w-32" placeholder="Add a note…"
                      value={adminNotes[req.id] ?? ""}
                      onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))} />
                    {req.status === "submitted" && <button onClick={() => updateStatus(req.id, "in_progress", adminNotes[req.id])} className="btn-secondary text-xs py-1 px-3">Mark In Progress</button>}
                    <button onClick={() => updateStatus(req.id, "completed", adminNotes[req.id])} className="btn-primary text-xs py-1 px-3">Complete</button>
                    <button onClick={() => updateStatus(req.id, "rejected", adminNotes[req.id])} className="text-xs text-red-400 hover:text-red-600 px-2">Reject</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
