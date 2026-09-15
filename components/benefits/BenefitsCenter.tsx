"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, Plus, Edit2, Save, X } from "lucide-react";

type Employee = { id: string; first_name: string; last_name: string; department: string | null; };
type Benefit = {
  id: string;
  employee_id: string;
  provider: string;
  policy_number: string | null;
  coverage_tier: string | null;
  dependents: number;
  renewal_date: string | null;
  notes: string | null;
};

const TIERS = ["Basic", "Standard", "Enhanced", "Premium", "Family"];

export default function BenefitsCenter({ isAdmin, employeeId, employees }: { isAdmin: boolean; employeeId?: string; employees: Employee[]; }) {
  const supabase = createClient();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employee_id: "", provider: "", policy_number: "", coverage_tier: "Standard", dependents: 0, renewal_date: "", notes: "" });

  useEffect(() => { loadBenefits(); }, []); // eslint-disable-line

  async function loadBenefits() {
    setLoading(true);
    let q = supabase.from("employee_benefits").select("*").order("created_at", { ascending: false });
    if (!isAdmin && employeeId) q = q.eq("employee_id", employeeId);
    const { data } = await q;
    setBenefits(data ?? []);
    setLoading(false);
  }

  async function save() {
    if (!form.employee_id || !form.provider) return alert("Please fill in employee and provider.");
    const payload = { ...form, dependents: Number(form.dependents), renewal_date: form.renewal_date || null, notes: form.notes || null, policy_number: form.policy_number || null };
    if (editingId) {
      await supabase.from("employee_benefits").update(payload).eq("id", editingId);
    } else {
      await supabase.from("employee_benefits").insert(payload);
    }
    setShowAdd(false); setEditingId(null);
    setForm({ employee_id: "", provider: "", policy_number: "", coverage_tier: "Standard", dependents: 0, renewal_date: "", notes: "" });
    await loadBenefits();
  }

  function startEdit(b: Benefit) {
    setForm({ employee_id: b.employee_id, provider: b.provider, policy_number: b.policy_number ?? "", coverage_tier: b.coverage_tier ?? "Standard", dependents: b.dependents, renewal_date: b.renewal_date ?? "", notes: b.notes ?? "" });
    setEditingId(b.id); setShowAdd(true);
  }

  async function deleteBenefit(id: string) {
    if (!confirm("Remove this benefit record?")) return;
    await supabase.from("employee_benefits").delete().eq("id", id);
    setBenefits(prev => prev.filter(b => b.id !== id));
  }

  function empName(id: string) {
    const e = employees.find(e => e.id === id);
    return e ? `${e.first_name} ${e.last_name}` : "—";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benefits Center</h1>
          <p className="text-sm text-gray-500 mt-1">Health insurance and coverage details</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowAdd(true); setEditingId(null); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Benefit
          </button>
        )}
      </div>

      {showAdd && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{editingId ? "Edit Benefit" : "Add Benefit"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isAdmin && (
              <div>
                <label className="label">Employee</label>
                <select className="input" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                  <option value="">Select employee…</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Insurance Provider</label>
              <input className="input" placeholder="e.g. Daman, AXA, Cigna" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} />
            </div>
            <div>
              <label className="label">Policy Number</label>
              <input className="input" placeholder="Optional" value={form.policy_number} onChange={e => setForm(f => ({ ...f, policy_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">Coverage Tier</label>
              <select className="input" value={form.coverage_tier} onChange={e => setForm(f => ({ ...f, coverage_tier: e.target.value }))}>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Number of Dependents</label>
              <input className="input" type="number" min={0} value={form.dependents} onChange={e => setForm(f => ({ ...f, dependents: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Renewal Date</label>
              <input className="input" type="date" value={form.renewal_date} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} placeholder="Any additional coverage notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} className="btn-primary flex items-center gap-2"><Save size={14} /> Save</button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="btn-secondary flex items-center gap-2"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : benefits.length === 0 ? (
        <div className="card text-center py-12">
          <Shield size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No benefit records yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map(b => {
            const renewal = b.renewal_date ? new Date(b.renewal_date) : null;
            const soon = renewal && (renewal.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
            return (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{isAdmin ? empName(b.employee_id) : b.provider}</p>
                    <p className="text-xs text-gray-400">{isAdmin ? b.provider : ""}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">{b.coverage_tier}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {b.policy_number && <><dt className="text-gray-400">Policy No.</dt><dd className="text-gray-700 font-medium">{b.policy_number}</dd></>}
                  <dt className="text-gray-400">Dependents</dt><dd className="text-gray-700 font-medium">{b.dependents}</dd>
                  {renewal && (
                    <><dt className="text-gray-400">Renewal</dt>
                    <dd className={`font-medium ${soon ? "text-red-500" : "text-gray-700"}`}>
                      {renewal.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {soon && " ⚠️"}
                    </dd></>
                  )}
                </dl>
                {b.notes && <p className="text-xs text-gray-400 mt-3 border-t pt-2">{b.notes}</p>}
                {isAdmin && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEdit(b)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><Edit2 size={11} /> Edit</button>
                    <button onClick={() => deleteBenefit(b.id)} className="text-xs text-red-300 hover:text-red-500 ml-2">Delete</button>
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
