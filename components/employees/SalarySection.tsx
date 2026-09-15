"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SalaryComponent } from "@/types";
import { Plus } from "lucide-react";

export default function SalarySection({ employeeId }: { employeeId: string }) {
  const supabase = createClient();
  const [salaries, setSalaries] = useState<SalaryComponent[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ basic_salary: "", housing_allowance: "", transport_allowance: "", other_allowances: "", effective_from: "" });

  useEffect(() => {
    supabase.from("salary_components").select("*").eq("employee_id", employeeId).order("effective_from", { ascending: false })
      .then(({ data }) => setSalaries(data ?? []));
  }, [employeeId]);

  async function save() {
    setLoading(true);
    const { data } = await supabase.from("salary_components").insert({
      employee_id: employeeId,
      basic_salary: parseFloat(form.basic_salary) || 0,
      housing_allowance: parseFloat(form.housing_allowance) || 0,
      transport_allowance: parseFloat(form.transport_allowance) || 0,
      other_allowances: parseFloat(form.other_allowances) || 0,
      effective_from: form.effective_from,
    }).select().single();
    if (data) setSalaries((s) => [data, ...s]);
    setAdding(false);
    setLoading(false);
    setForm({ basic_salary: "", housing_allowance: "", transport_allowance: "", other_allowances: "", effective_from: "" });
  }

  const current = salaries[0];
  const gross = current
    ? current.basic_salary + current.housing_allowance + current.transport_allowance + current.other_allowances
    : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Salary</h2>
        <button onClick={() => setAdding(true)} className="btn-secondary text-xs py-1 px-2">
          <Plus size={14} /> Update
        </button>
      </div>

      {current ? (
        <dl className="space-y-2 text-sm">
          <Row label="Basic" value={formatCurrency(current.basic_salary)} />
          <Row label="Housing" value={formatCurrency(current.housing_allowance)} />
          <Row label="Transport" value={formatCurrency(current.transport_allowance)} />
          {current.other_allowances > 0 && <Row label="Other" value={formatCurrency(current.other_allowances)} />}
          <div className="border-t pt-2 mt-2">
            <Row label="Total / Month" value={<span className="font-bold text-green-600">{formatCurrency(gross!)}</span>} />
          </div>
          <p className="text-xs text-gray-400 pt-1">Effective {formatDate(current.effective_from)}</p>
        </dl>
      ) : (
        <p className="text-sm text-gray-400">No salary recorded.</p>
      )}

      {adding && (
        <div className="mt-4 border-t pt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">New salary record</p>
          {[
            ["Basic Salary", "basic_salary"],
            ["Housing Allowance", "housing_allowance"],
            ["Transport Allowance", "transport_allowance"],
            ["Other Allowances", "other_allowances"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="label text-xs">{label}</label>
              <input type="number" min="0" step="0.01" className="input" value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label text-xs">Effective From</label>
            <input type="date" className="input" value={form.effective_from} onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))} required />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={loading || !form.effective_from} className="btn-primary text-xs py-1.5">Save</button>
            <button onClick={() => setAdding(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </div>
      )}

      {salaries.length > 1 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-400 cursor-pointer">Salary history ({salaries.length - 1} older)</summary>
          <div className="mt-2 space-y-2">
            {salaries.slice(1).map((s) => (
              <div key={s.id} className="text-xs text-gray-500 border-t pt-2">
                <span className="font-medium">{formatCurrency(s.basic_salary + s.housing_allowance + s.transport_allowance + s.other_allowances)}</span> total
                · from {formatDate(s.effective_from)}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
