"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, LEAD_SOURCES, getDealPayrollPeriod } from "@/lib/utils";
import { Plus, TrendingUp, Clock, DollarSign } from "lucide-react";

type Deal = {
  id: string;
  property_address: string;
  deal_type: string;
  deal_value: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  deal_date: string;
  notes: string | null;
  created_at: string;
};

const DEFAULT_RATES: Record<string, number> = {
  sale: 2,
  rental: 5,
};

export default function BrokerCommissionsView({ employeeId }: { employeeId: string }) {
  const supabase = createClient();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    property_address: "",
    deal_type: "sale",
    deal_value: "",
    commission_rate: "2",
    deal_date: "",
    notes: "",
    lead_source: "direct",
  });

  useEffect(() => {
    supabase
      .from("deals")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDeals((data as Deal[]) ?? []));
  }, [employeeId]);

  const commissionAmount = form.deal_value && form.commission_rate
    ? (parseFloat(form.deal_value) * parseFloat(form.commission_rate)) / 100
    : 0;

  function setF(k: string, v: string) {
    setForm(f => {
      const updated = { ...f, [k]: v };
      // Auto-update commission rate when deal type changes
      if (k === "deal_type") updated.commission_rate = String(DEFAULT_RATES[v] ?? 2);
      return updated;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) { setError("Your account is not linked to an employee record."); return; }
    if (!form.property_address || !form.deal_value || !form.deal_date) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.from("deals").insert({
      employee_id: employeeId,
      property_address: form.property_address,
      deal_type: form.deal_type,
      deal_value: parseFloat(form.deal_value),
      commission_rate: parseFloat(form.commission_rate),
      commission_amount: commissionAmount,
      deal_date: form.deal_date,
      notes: form.notes || null,
      lead_source: form.lead_source,
      status: "pending",
    }).select("*").single();
    setLoading(false);
    if (err) { setError("Failed to submit deal. Please try again."); return; }
    setDeals(d => [data as Deal, ...d]);
    setShowForm(false);
    setForm({ property_address: "", deal_type: "sale", deal_value: "", commission_rate: "2", deal_date: "", notes: "", lead_source: "direct" });
  }

  const totalPaid = deals.filter(d => d.status === "paid").reduce((s, d) => s + d.commission_amount, 0);
  const totalPending = deals.filter(d => d.status !== "paid").reduce((s, d) => s + d.commission_amount, 0);
  // "This period" uses the current payroll cycle (25th last month → 24th this month)
  const { start: periodStart, end: periodEnd } = getDealPayrollPeriod(new Date());
  const thisMonth = deals.filter(d => {
    const dd = new Date(d.deal_date);
    return dd >= periodStart && dd <= periodEnd;
  }).reduce((s, d) => s + d.commission_amount, 0);

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Commissions</h1>
          <p className="text-sm text-gray-500 mt-1">Track your deals and earnings</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Log a Deal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card flex items-center gap-4">
          <div className="bg-green-500 rounded-xl p-3 text-white flex-shrink-0"><DollarSign size={22} /></div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
            <p className="text-sm text-gray-500">Total Paid</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="bg-amber-500 rounded-xl p-3 text-white flex-shrink-0"><Clock size={22} /></div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
            <p className="text-sm text-gray-500">Pending / Approved</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="bg-purple-500 rounded-xl p-3 text-white flex-shrink-0"><TrendingUp size={22} /></div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(thisMonth)}</p>
            <p className="text-sm text-gray-500">This Pay Period</p>
          </div>
        </div>
      </div>

      {/* New Deal Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Log a New Deal</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Property Address *</label>
                <input className="input" placeholder="e.g. Apt 402, Marina Heights, Dubai Marina" value={form.property_address} onChange={e => setF("property_address", e.target.value)} required />
              </div>
              <div>
                <label className="label">Deal Type *</label>
                <select className="input" value={form.deal_type} onChange={e => setF("deal_type", e.target.value)}>
                  <option value="sale">Sale</option>
                  <option value="rental">Rental</option>
                </select>
              </div>
              <div>
                <label className="label">Lead Source</label>
                <select className="input" value={form.lead_source} onChange={e => setF("lead_source", e.target.value)}>
                  {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Deal Date *</label>
                <input type="date" className="input" value={form.deal_date} onChange={e => setF("deal_date", e.target.value)} required />
              </div>
              <div>
                <label className="label">Deal Value (AED) *</label>
                <input type="number" className="input" placeholder="e.g. 1500000" value={form.deal_value} onChange={e => setF("deal_value", e.target.value)} required />
              </div>
              <div>
                <label className="label">Commission Rate (%)</label>
                <input type="number" step="0.1" className="input" value={form.commission_rate} onChange={e => setF("commission_rate", e.target.value)} />
              </div>
            </div>
            {commissionAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-green-700">
                  Your commission: {formatCurrency(commissionAmount)}
                </p>
              </div>
            )}
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input" rows={2} placeholder="Client name, any special details…" value={form.notes} onChange={e => setF("notes", e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? "Saving…" : "Submit Deal"}</button>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Deals Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Property</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Deal Value</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Commission</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deals.map(deal => (
              <tr key={deal.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium max-w-[200px] truncate">{deal.property_address}</td>
                <td className="px-6 py-3 text-gray-600 capitalize">{deal.deal_type}</td>
                <td className="px-6 py-3 text-gray-600">{formatCurrency(deal.deal_value)}</td>
                <td className="px-6 py-3 font-medium text-gray-900">{formatCurrency(deal.commission_amount)}</td>
                <td className="px-6 py-3 text-gray-500">{new Date(deal.deal_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td className="px-6 py-3"><span className={`badge ${statusColor[deal.status]}`}>{deal.status}</span></td>
              </tr>
            ))}
            {!deals.length && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No deals yet. Log your first deal above!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
