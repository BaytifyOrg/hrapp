"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENTS, NATIONALITIES, COMMISSION_SLABS } from "@/lib/utils";
import { Employee } from "@/types";

interface Props {
  employee?: Employee;
}

export default function EmployeeForm({ employee }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function formatEmiratesId(value: string) {
    // Strip everything except digits
    const digits = value.replace(/\D/g, "");
    // Format: 784-XXXX-XXXXXXX-X
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 14) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14, 15)}`;
  }

  const [form, setForm] = useState({
    first_name: employee?.first_name ?? "",
    last_name: employee?.last_name ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    job_title: employee?.job_title ?? "",
    department: employee?.department ?? "",
    start_date: employee?.start_date ?? "",
    end_date: employee?.end_date ?? "",
    status: employee?.status ?? "active",
    commission_split: String((employee as unknown as Record<string, unknown>)?.commission_split ?? 50),
    commission_type: String((employee as unknown as Record<string, unknown>)?.commission_type ?? "slab"),
    emirates_id: employee?.emirates_id ?? "",
    passport_number: employee?.passport_number ?? "",
    visa_number: employee?.visa_number ?? "",
    visa_expiry: employee?.visa_expiry ?? "",
    nationality: employee?.nationality ?? "",
    bank_name: employee?.bank_name ?? "",
    iban: employee?.iban ?? "",
    bank_routing_code: employee?.bank_routing_code ?? "",
    address: employee?.address ?? "",
    manager_email: (employee as unknown as Record<string, unknown>)?.manager_email as string ?? "",
    // salary
    basic_salary: "",
    housing_allowance: "",
    transport_allowance: "",
    other_allowances: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const empData = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || null,
      job_title: form.job_title || null,
      department: form.department || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status as Employee["status"],
      emirates_id: form.emirates_id || null,
      passport_number: form.passport_number || null,
      visa_number: form.visa_number || null,
      visa_expiry: form.visa_expiry || null,
      nationality: form.nationality || null,
      bank_name: form.bank_name || null,
      iban: form.iban || null,
      bank_routing_code: form.bank_routing_code || null,
      address: form.address || null,
      commission_split: parseInt(form.commission_split) || 50,
      commission_type: form.commission_type || "slab",
      manager_email: form.manager_email || null,
      updated_at: new Date().toISOString(),
    };

    let empId = employee?.id;

    if (employee) {
      const { error: err } = await supabase.from("employees").update(empData).eq("id", employee.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { data, error: err } = await supabase.from("employees").insert(empData).select("id").single();
      if (err) { setError(err.message); setLoading(false); return; }
      empId = data.id;
    }

    // Save salary if provided
    if (form.basic_salary && empId) {
      await supabase.from("salary_components").insert({
        employee_id: empId,
        basic_salary: parseFloat(form.basic_salary) || 0,
        housing_allowance: parseFloat(form.housing_allowance) || 0,
        transport_allowance: parseFloat(form.transport_allowance) || 0,
        other_allowances: parseFloat(form.other_allowances) || 0,
        effective_from: form.start_date || new Date().toISOString().split("T")[0],
      });
    }

    router.push(`/employees/${empId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Personal Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name *" required><input className="input" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required /></Field>
          <Field label="Last Name *" required><input className="input" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required /></Field>
          <Field label="Email *"><input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} required /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Nationality">
            <select className="input" value={form.nationality} onChange={(e) => set("nationality", e.target.value)}>
              <option value="">Select…</option>
              {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Emirates ID"><input className="input" placeholder="784-XXXX-XXXXXXX-X" value={form.emirates_id} onChange={(e) => set("emirates_id", formatEmiratesId(e.target.value))} maxLength={18} /></Field>
          <Field label="Passport No."><input className="input" value={form.passport_number} onChange={(e) => set("passport_number", e.target.value)} /></Field>
          <Field label="Visa No."><input className="input" value={form.visa_number} onChange={(e) => set("visa_number", e.target.value)} /></Field>
          <Field label="Visa Expiry"><input type="date" className="input" value={form.visa_expiry} onChange={(e) => set("visa_expiry", e.target.value)} /></Field>
          <Field label="Address"><input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
        </div>
      </section>

      {/* Employment */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Employment</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Job Title"><input className="input" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} /></Field>
          <Field label="Department">
            <select className="input" value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">Select…</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Manager Email"><input type="email" className="input" placeholder="manager@baytify.com" value={form.manager_email} onChange={(e) => set("manager_email", e.target.value)} /></Field>
          <Field label="Start Date"><input type="date" className="input" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
          <Field label="End Date"><input type="date" className="input" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </Field>
          <Field label="Commission Structure">
            <select className="input" value={form.commission_type} onChange={(e) => set("commission_type", e.target.value)}>
              <option value="slab">Performance Slab (55–75%)</option>
              <option value="fixed">Fixed Split</option>
            </select>
          </Field>
          {form.commission_type === "fixed" && (
            <Field label="Fixed Split (Agent / Agency)">
              <select className="input" value={form.commission_split} onChange={(e) => set("commission_split", e.target.value)}>
                <option value="50">50 / 50</option>
                <option value="60">60 / 40</option>
                <option value="70">70 / 30</option>
                <option value="80">80 / 20</option>
                <option value="100">100 / 0</option>
              </select>
            </Field>
          )}
          {form.commission_type === "slab" && (
            <div className="sm:col-span-2">
              <p className="label">Slab Tiers (2026)</p>
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
                {COMMISSION_SLABS.map((s, i) => {
                  const nextMin = COMMISSION_SLABS[i - 1]?.min;
                  const range = nextMin ? `AED ${s.min.toLocaleString()} – ${(nextMin - 1).toLocaleString()}` : `AED ${s.min.toLocaleString()}+`;
                  return <p key={s.rate}><span className="font-medium text-gray-700">{s.rate}%</span> — {range} monthly commission</p>;
                }).reverse()}
                <p className="pt-1 border-t border-gray-200 text-gray-400">Property Finder &amp; Bayut leads are always 50%</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bank */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Bank Details (WPS)</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bank Name"><input className="input" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></Field>
          <Field label="IBAN"><input className="input" placeholder="AE…" value={form.iban} onChange={(e) => set("iban", e.target.value)} /></Field>
          <Field label="Bank Routing Code"><input className="input" value={form.bank_routing_code} onChange={(e) => set("bank_routing_code", e.target.value)} /></Field>
        </div>
      </section>

      {/* Salary */}
      {!employee && (
        <section className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Starting Salary (AED / month)</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Basic Salary *"><input type="number" min="0" step="0.01" className="input" value={form.basic_salary} onChange={(e) => set("basic_salary", e.target.value)} /></Field>
            <Field label="Housing Allowance"><input type="number" min="0" step="0.01" className="input" value={form.housing_allowance} onChange={(e) => set("housing_allowance", e.target.value)} /></Field>
            <Field label="Transport Allowance"><input type="number" min="0" step="0.01" className="input" value={form.transport_allowance} onChange={(e) => set("transport_allowance", e.target.value)} /></Field>
            <Field label="Other Allowances"><input type="number" min="0" step="0.01" className="input" value={form.other_allowances} onChange={(e) => set("other_allowances", e.target.value)} /></Field>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Saving…" : employee ? "Save Changes" : "Create Employee"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
