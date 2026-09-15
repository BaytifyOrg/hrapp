"use client";

import React, { useState } from "react";
import { formatCurrency, LEAD_SOURCES, getPayrollPeriod } from "@/lib/utils";
import { TrendingUp, Clock, CheckCircle, DollarSign, Users, FileText, Plus, X } from "lucide-react";
import Link from "next/link";

const DEFAULT_RATES: Record<string, number> = { sale: 2, rental: 5 };
const emptyDealForm = { employee_id: "", property_address: "", deal_type: "sale", deal_value: "", commission_rate: "2", deal_date: "", notes: "", lead_source: "direct" };

type Deal = Record<string, unknown>;
type FilterType = "all" | "pending" | "approved" | "paid";

type AgentStats = {
  id: string;
  name: string;
  split: number;
  dealCount: number;
  earned: number;
  pipeline: number;
  conversionRate: number;
  activityScore: number;
};

function buildAgentStats(deals: Deal[], employees: { id: string; first_name: string; last_name: string; commission_split: number }[]): AgentStats[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return employees.map(emp => {
    const empDeals = deals.filter(d => d.employee_id === emp.id);
    const paidDeals = empDeals.filter(d => d.status === "paid");
    const pipelineDeals = empDeals.filter(d => d.status === "pending" || d.status === "approved");
    const closedDeals = empDeals.filter(d => d.status === "approved" || d.status === "paid");
    const recentDeals = empDeals.filter(d => new Date(d.created_at as string) >= thirtyDaysAgo);

    const earned = paidDeals.reduce((s, d) => s + ((d.agent_commission as number) || ((d.commission_amount as number) * emp.commission_split / 100)), 0);
    const pipeline = pipelineDeals.reduce((s, d) => s + ((d.commission_amount as number) * emp.commission_split / 100), 0);
    const conversionRate = empDeals.length > 0 ? Math.round((closedDeals.length / empDeals.length) * 100) : 0;
    const activityScore = Math.min(100, recentDeals.length * 20);

    return {
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      split: emp.commission_split,
      dealCount: empDeals.length,
      earned,
      pipeline,
      conversionRate,
      activityScore,
    };
  }).sort((a, b) => b.earned - a.earned);
}

function ActivityBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 w-20">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8">{score}</span>
    </div>
  );
}

export default function AdminCommissionsView({ deals, employees }: { deals: Deal[]; employees: { id: string; first_name: string; last_name: string; commission_split: number }[] }) {
  const [list, setList] = useState(deals);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "deals" | "payslips">("overview");
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealForm, setDealForm] = useState(emptyDealForm);
  const [dealLoading, setDealLoading] = useState(false);
  const [dealError, setDealError] = useState("");

  const commissionAmount = dealForm.deal_value && dealForm.commission_rate
    ? (parseFloat(dealForm.deal_value) * parseFloat(dealForm.commission_rate)) / 100 : 0;

  function setDF(k: string, v: string) {
    setDealForm(f => {
      const updated = { ...f, [k]: v };
      if (k === "deal_type") updated.commission_rate = String(DEFAULT_RATES[v] ?? 2);
      return updated;
    });
  }

  async function submitDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!dealForm.employee_id) { setDealError("Please select a broker."); return; }
    if (!dealForm.property_address || !dealForm.deal_value || !dealForm.deal_date) { setDealError("Please fill in all required fields."); return; }
    setDealLoading(true); setDealError("");
    const emp = employees.find(e => e.id === dealForm.employee_id);
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: dealForm.employee_id,
        property_address: dealForm.property_address,
        deal_type: dealForm.deal_type,
        deal_value: parseFloat(dealForm.deal_value),
        commission_rate: parseFloat(dealForm.commission_rate),
        commission_amount: commissionAmount,
        deal_date: dealForm.deal_date,
        notes: dealForm.notes || null,
        lead_source: dealForm.lead_source,
        status: "approved", // admin-added deals skip pending
      }),
    });
    const data = await res.json();
    setDealLoading(false);
    if (!res.ok) { setDealError(data.error ?? "Failed to add deal."); return; }
    const newDeal = { ...data, employees: emp ? { first_name: emp.first_name, last_name: emp.last_name } : null };
    setList(l => [newDeal, ...l]);
    setShowDealForm(false);
    setDealForm(emptyDealForm);
  }
  const [payslipMonth, setPayslipMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const pending = list.filter(d => d.status === "pending");
  const approved = list.filter(d => d.status === "approved");
  const paid = list.filter(d => d.status === "paid");

  const totalPaid = paid.reduce((s, d) => s + ((d.agent_commission as number) || (d.commission_amount as number)), 0);
  const totalPending = [...pending, ...approved].reduce((s, d) => s + (d.commission_amount as number), 0);

  const filteredList = filter === "all" ? list : filter === "pending" ? pending : filter === "approved" ? approved : paid;
  const agentStats = buildAgentStats(list, employees);

  async function updateStatus(id: string, status: string) {
    setLoadingId(id);
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    // Recalculate splits on paid
    if (status === "paid") {
      const deal = list.find(d => d.id === id);
      const emp = employees.find(e => e.id === deal?.employee_id);
      if (deal && emp) {
        const split = emp.commission_split ?? 50;
        const agent_commission = Math.round(((deal.commission_amount as number) * split / 100) * 100) / 100;
        const agency_commission = Math.round(((deal.commission_amount as number) - agent_commission) * 100) / 100;
        setList(l => l.map(d => d.id === id ? { ...d, status, agent_commission, agency_commission } : d));
      } else {
        setList(l => l.map(d => d.id === id ? { ...d, status } : d));
      }
    } else {
      setList(l => l.map(d => d.id === id ? { ...d, status } : d));
    }
    setLoadingId(null);
  }

  const stats = [
    { label: "Total Paid Out (Agent)", value: formatCurrency(totalPaid), icon: DollarSign, color: "bg-green-500", activeColor: "ring-green-400", filterKey: "paid" as FilterType },
    { label: "Pending Approval", value: pending.length, icon: Clock, color: "bg-amber-500", activeColor: "ring-amber-400", filterKey: "pending" as FilterType },
    { label: "Approved (Unpaid)", value: approved.length, icon: CheckCircle, color: "bg-blue-500", activeColor: "ring-blue-400", filterKey: "approved" as FilterType },
    { label: "Total in Pipeline", value: formatCurrency(totalPending), icon: TrendingUp, color: "bg-purple-500", activeColor: "ring-purple-400", filterKey: "all" as FilterType },
  ];

  // Payslip month data
  const [year, month] = payslipMonth.split("-").map(Number);
  const { start: periodStart, end: periodEnd, label: periodLabel } = getPayrollPeriod(month, year);
  const payslipAgents = employees.map(emp => {
    const monthDeals = list.filter(d => {
      const dd = new Date(d.deal_date as string);
      return d.employee_id === emp.id && d.status === "paid" && dd >= periodStart && dd <= periodEnd;
    });
    const total = monthDeals.reduce((s, d) => s + ((d.agent_commission as number) || ((d.commission_amount as number) * emp.commission_split / 100)), 0);
    return { ...emp, monthDeals: monthDeals.length, monthTotal: total };
  }).filter(e => e.monthDeals > 0 || true);

  const monthName = new Date(year, month - 1).toLocaleString("en-GB", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage broker deal commissions</p>
        </div>
        <button onClick={() => { setShowDealForm(true); setActiveTab("deals"); }} className="btn-primary">
          <Plus size={16} /> Add Deal
        </button>
      </div>

      {/* Add Deal Form */}
      {showDealForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Add a Deal</h2>
            <button onClick={() => setShowDealForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <form onSubmit={submitDeal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Broker *</label>
                <select className="input" value={dealForm.employee_id} onChange={e => setDF("employee_id", e.target.value)} required>
                  <option value="">Select broker…</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Deal Type *</label>
                <select className="input" value={dealForm.deal_type} onChange={e => setDF("deal_type", e.target.value)}>
                  <option value="sale">Sale</option>
                  <option value="rental">Rental</option>
                </select>
              </div>
              <div>
                <label className="label">Lead Source</label>
                <select className="input" value={dealForm.lead_source} onChange={e => setDF("lead_source", e.target.value)}>
                  {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Property Address *</label>
                <input className="input" placeholder="e.g. Apt 402, Marina Heights, Dubai Marina" value={dealForm.property_address} onChange={e => setDF("property_address", e.target.value)} required />
              </div>
              <div>
                <label className="label">Deal Value (AED) *</label>
                <input type="number" className="input" placeholder="e.g. 1500000" value={dealForm.deal_value} onChange={e => setDF("deal_value", e.target.value)} required />
              </div>
              <div>
                <label className="label">Commission Rate (%)</label>
                <input type="number" step="0.1" className="input" value={dealForm.commission_rate} onChange={e => setDF("commission_rate", e.target.value)} />
              </div>
              <div>
                <label className="label">Deal Date *</label>
                <input type="date" className="input" value={dealForm.deal_date} onChange={e => setDF("deal_date", e.target.value)} required />
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input className="input" placeholder="Client name, any details…" value={dealForm.notes} onChange={e => setDF("notes", e.target.value)} />
              </div>
            </div>
            {commissionAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-green-700">Total commission: {formatCurrency(commissionAmount)}</p>
              </div>
            )}
            {dealError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{dealError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={dealLoading} className="btn-primary">{dealLoading ? "Saving…" : "Add Deal"}</button>
              <button type="button" onClick={() => { setShowDealForm(false); setDealError(""); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map(({ label, value, icon: Icon, color, activeColor, filterKey }) => (
          <button
            key={label}
            onClick={() => { setFilter(f => f === filterKey ? "all" : filterKey); setActiveTab("deals"); }}
            className={`card flex items-center gap-4 text-left w-full transition-all hover:shadow-md ${activeTab === "deals" && filter === filterKey ? `ring-2 ${activeColor}` : ""}`}
          >
            <div className={`${color} rounded-xl p-3 text-white flex-shrink-0`}><Icon size={22} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([["overview", "Agent Overview", Users], ["deals", "All Deals", TrendingUp], ["payslips", "Monthly Payslips", FileText]] as const).map(([tab, label, Icon]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div>
          {agentStats.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">No agents with deals yet.</div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Agent</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Split</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Deals</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Earned</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Pipeline</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Conversion</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Activity (30d)</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agentStats.map(agent => (
                    <tr key={agent.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{agent.name}</td>
                      <td className="px-6 py-3">
                        <span className="badge bg-purple-100 text-purple-700">{agent.split}/{100 - agent.split}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{agent.dealCount}</td>
                      <td className="px-6 py-3 font-semibold text-green-700">{formatCurrency(agent.earned)}</td>
                      <td className="px-6 py-3 text-amber-600">{formatCurrency(agent.pipeline)}</td>
                      <td className="px-6 py-3">
                        <span className={`badge ${agent.conversionRate >= 70 ? "bg-green-100 text-green-700" : agent.conversionRate >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                          {agent.conversionRate}%
                        </span>
                      </td>
                      <td className="px-6 py-3"><ActivityBar score={agent.activityScore} /></td>
                      <td className="px-6 py-3">
                        <Link href={`/commissions/payslip?employeeId=${agent.id}&month=${month}&year=${year}`}
                          className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1">
                          <FileText size={12} /> Payslip
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DEALS TAB ── */}
      {activeTab === "deals" && (
        <div>
          {pending.length > 0 && (filter === "all" || filter === "pending") && (
            <section className="mb-8">
              <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-amber-500" /> Pending Approval
              </h2>
              <div className="space-y-3">
                {pending.map(deal => <DealCard key={deal.id as string} deal={deal} loadingId={loadingId} onUpdate={updateStatus} employees={employees} />)}
              </div>
            </section>
          )}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">
                {filter === "all" ? "All Deals" : filter === "pending" ? "Pending Deals" : filter === "approved" ? "Approved Deals" : "Paid Deals"}
              </h2>
              {filter !== "all" && <button onClick={() => setFilter("all")} className="text-xs text-gray-400 hover:text-gray-600">Clear filter ×</button>}
            </div>
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Broker</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Property</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Deal Value</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Total Comm.</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Agent Gets</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredList.map(deal => {
                    const emp = deal.employees as { first_name: string; last_name: string } | null;
                    const empRecord = employees.find(e => e.id === deal.employee_id);
                    const split = empRecord?.commission_split ?? 50;
                    const agentGets = (deal.agent_commission as number) || ((deal.commission_amount as number) * split / 100);
                    const statusColor: Record<string, string> = {
                      pending: "bg-amber-100 text-amber-700",
                      approved: "bg-blue-100 text-blue-700",
                      paid: "bg-green-100 text-green-700",
                    };
                    return (
                      <tr key={deal.id as string} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium">{emp?.first_name} {emp?.last_name}</td>
                        <td className="px-6 py-3 text-gray-600 max-w-[160px] truncate">{deal.property_address as string}</td>
                        <td className="px-6 py-3 text-gray-600 capitalize">{deal.deal_type as string}</td>
                        <td className="px-6 py-3 text-gray-600">{formatCurrency(deal.deal_value as number)}</td>
                        <td className="px-6 py-3 text-gray-700">{formatCurrency(deal.commission_amount as number)}</td>
                        <td className="px-6 py-3 font-semibold text-green-700">{formatCurrency(agentGets)} <span className="text-xs text-gray-400 font-normal">({split}%)</span></td>
                        <td className="px-6 py-3">
                          <span className={`badge ${statusColor[deal.status as string] ?? "bg-gray-100 text-gray-600"}`}>{deal.status as string}</span>
                        </td>
                        <td className="px-6 py-3 text-gray-500">{new Date(deal.deal_date as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="px-6 py-3">
                          {deal.status === "pending" && (
                            <button onClick={() => updateStatus(deal.id as string, "approved")} disabled={loadingId === deal.id} className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50">
                              {loadingId === deal.id ? "…" : "Approve"}
                            </button>
                          )}
                          {deal.status === "approved" && (
                            <button onClick={() => updateStatus(deal.id as string, "paid")} disabled={loadingId === deal.id} className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50">
                              {loadingId === deal.id ? "…" : "Mark Paid"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredList.length && (
                    <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-400">No deals found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── PAYSLIPS TAB ── */}
      {activeTab === "payslips" && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div>
              <label className="label">Select Month</label>
              <input type="month" className="input w-48" value={payslipMonth} onChange={e => setPayslipMonth(e.target.value)} />
            </div>
            <div className="mt-5">
              <span className="text-sm text-gray-500">Pay period: <span className="font-medium text-gray-700">{periodLabel}</span></span>
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Agent</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Split</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Paid Deals</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Commission ({monthName})</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {payslipAgents.map(agent => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{agent.first_name} {agent.last_name}</td>
                    <td className="px-6 py-3"><span className="badge bg-purple-100 text-purple-700">{agent.commission_split}/{100 - agent.commission_split}</span></td>
                    <td className="px-6 py-3 text-gray-600">{agent.monthDeals}</td>
                    <td className="px-6 py-3 font-semibold text-green-700">{formatCurrency(agent.monthTotal)}</td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/commissions/payslip?employeeId=${agent.id}&month=${month}&year=${year}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <FileText size={12} /> View Payslip
                      </Link>
                    </td>
                  </tr>
                ))}
                {!payslipAgents.length && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No agents found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DealCard({ deal, loadingId, onUpdate, employees }: { deal: Deal; loadingId: string | null; onUpdate: (id: string, status: string) => void; employees: { id: string; commission_split: number }[] }) {
  const emp = deal.employees as { first_name: string; last_name: string } | null;
  const empRecord = employees.find(e => e.id === deal.employee_id);
  const split = empRecord?.commission_split ?? 50;
  const agentGets = (deal.commission_amount as number) * split / 100;
  return (
    <div className="card flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-gray-900">{emp?.first_name} {emp?.last_name}</span>
          <span className="badge bg-amber-100 text-amber-700">Pending</span>
          <span className="badge bg-purple-100 text-purple-700">{split}/{100 - split} split</span>
        </div>
        <p className="text-sm text-gray-600"><span className="font-medium capitalize">{deal.deal_type as string}</span> · {deal.property_address as string}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          Deal: <span className="font-medium text-gray-800">{formatCurrency(deal.deal_value as number)}</span>
          {" · "}Total comm: <span className="font-medium text-gray-800">{formatCurrency(deal.commission_amount as number)}</span>
          {" · "}Agent gets: <span className="font-semibold text-green-700">{formatCurrency(agentGets)}</span>
        </p>
      </div>
      <button onClick={() => onUpdate(deal.id as string, "approved")} disabled={loadingId === deal.id} className="btn-primary text-sm flex-shrink-0 disabled:opacity-50">
        {loadingId === deal.id ? "Saving…" : "Approve"}
      </button>
    </div>
  );
}
