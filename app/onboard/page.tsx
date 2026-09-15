"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NATIONALITIES } from "@/lib/utils";
import { CheckCircle, Upload, AlertCircle } from "lucide-react";

type Step = "personal" | "emergency" | "documents" | "done";

export default function OnboardPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const onboardingToken = searchParams.get("token");
  const [step, setStep] = useState<Step>("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    date_of_birth: "", nationality: "", emirates_id: "",
    passport_number: "", visa_number: "", visa_expiry: "", address: "",
  });

  useEffect(() => {
    if (!onboardingToken) return;
    fetch(`/api/onboard/lookup?token=${onboardingToken}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPersonal((f) => ({ ...f, first_name: data.first_name, last_name: data.last_name, email: data.email }));
      })
      .catch(() => {});
  }, [onboardingToken]);

  const [emergency, setEmergency] = useState({
    emergency_name: "", emergency_relationship: "",
    emergency_phone: "", emergency_email: "",
  });

  const [docs, setDocs] = useState<{
    doc_passport: File | null;
    doc_emirates_id: File | null;
    doc_visa: File | null;
  }>({ doc_passport: null, doc_emirates_id: null, doc_visa: null });

  function setP(k: string, v: string) { setPersonal(f => ({ ...f, [k]: v })); }
  function setE(k: string, v: string) { setEmergency(f => ({ ...f, [k]: v })); }

  function formatEmiratesId(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 14) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14, 15)}`;
  }

  async function submitPersonalAndEmergency() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/onboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...personal, ...emergency, onboarding_token: onboardingToken }),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error ?? "Submission failed. Please try again."); setLoading(false); return; }
      setSubmissionId(result.id);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
      return;
    }
    // Fire notification email (non-blocking)
    fetch("/api/onboard/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${personal.first_name} ${personal.last_name}`,
        email: personal.email,
        phone: personal.phone,
      }),
    }).catch(() => { /* ignore email errors */ });
    setStep("documents");
    setLoading(false);
  }

  async function uploadDoc(field: "doc_passport" | "doc_emirates_id" | "doc_visa", file: File) {
    if (!submissionId) return;
    const ext = file.name.split(".").pop();
    const path = `${submissionId}/${field}.${ext}`;
    const { error: upErr } = await supabase.storage.from("onboarding-docs").upload(path, file, { upsert: true });
    if (upErr) { setError(upErr.message); return; }
    await supabase.from("onboarding_submissions").update({ [field]: path }).eq("id", submissionId);
  }

  async function submitDocuments() {
    setLoading(true); setError("");
    const uploads = Object.entries(docs).filter(([, f]) => f !== null) as [string, File][];
    for (const [field, file] of uploads) {
      await uploadDoc(field as "doc_passport" | "doc_emirates_id" | "doc_visa", file);
    }
    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <Shell>
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#232D3E" }}>
            All done — welcome to Baytify!
          </h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Your details have been submitted. Your HR team will be in touch shortly to confirm everything and get you set up.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {(["personal", "emergency", "documents"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              step === s ? "text-white" : steps.indexOf(step) > i ? "text-white" : "bg-gray-100 text-gray-400"
            }`} style={step === s || steps.indexOf(step) > i ? { backgroundColor: "#232D3E" } : {}}>
              {steps.indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span className="text-sm hidden sm:block" style={{ color: step === s ? "#232D3E" : "#9ca3af" }}>
              {s === "personal" ? "Personal Details" : s === "emergency" ? "Emergency Contact" : "Documents"}
            </span>
            {i < 2 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Personal */}
      {step === "personal" && (
        <div>
          <h2 className="text-xl font-semibold mb-1" style={{ color: "#232D3E" }}>Personal Details</h2>
          <p className="text-sm text-gray-500 mb-6">Please fill in your information accurately as it appears on your official documents.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name *"><input className="input" value={personal.first_name} onChange={e => setP("first_name", e.target.value)} required /></Field>
            <Field label="Last Name *"><input className="input" value={personal.last_name} onChange={e => setP("last_name", e.target.value)} required /></Field>
            <Field label="Email Address *"><input type="email" className="input" value={personal.email} onChange={e => setP("email", e.target.value)} required /></Field>
            <Field label="Phone Number"><input className="input" placeholder="+971 50 000 0000" value={personal.phone} onChange={e => setP("phone", e.target.value)} /></Field>
            <Field label="Date of Birth *"><input type="date" className="input" value={personal.date_of_birth} onChange={e => setP("date_of_birth", e.target.value)} required /></Field>
            <Field label="Nationality">
              <select className="input" value={personal.nationality} onChange={e => setP("nationality", e.target.value)}>
                <option value="">Select…</option>
                {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Emirates ID"><input className="input" placeholder="784-XXXX-XXXXXXX-X" value={personal.emirates_id} onChange={e => setP("emirates_id", formatEmiratesId(e.target.value))} maxLength={18} /></Field>
            <Field label="Passport Number"><input className="input" value={personal.passport_number} onChange={e => setP("passport_number", e.target.value)} /></Field>
            <Field label="UAE Visa Number"><input className="input" value={personal.visa_number} onChange={e => setP("visa_number", e.target.value)} /></Field>
            <Field label="Visa Expiry Date"><input type="date" className="input" value={personal.visa_expiry} onChange={e => setP("visa_expiry", e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <Field label="Home Address"><textarea className="input" rows={2} value={personal.address} onChange={e => setP("address", e.target.value)} /></Field>
            </div>
          </div>
          {error && <ErrorMsg msg={error} />}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => { if (!personal.first_name || !personal.last_name || !personal.email) { setError("Please fill in your name and email."); return; } if (!personal.date_of_birth) { setError("Please enter your date of birth."); return; } setError(""); setStep("emergency"); }}
              className="btn-primary px-8"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Emergency contact */}
      {step === "emergency" && (
        <div>
          <h2 className="text-xl font-semibold mb-1" style={{ color: "#232D3E" }}>Emergency Contact</h2>
          <p className="text-sm text-gray-500 mb-6">Who should we contact in case of an emergency?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *"><input className="input" value={emergency.emergency_name} onChange={e => setE("emergency_name", e.target.value)} /></Field>
            <Field label="Relationship *">
              <select className="input" value={emergency.emergency_relationship} onChange={e => setE("emergency_relationship", e.target.value)}>
                <option value="">Select…</option>
                {["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"].map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Phone Number *"><input className="input" placeholder="+971 50 000 0000" value={emergency.emergency_phone} onChange={e => setE("emergency_phone", e.target.value)} /></Field>
            <Field label="Email Address"><input type="email" className="input" value={emergency.emergency_email} onChange={e => setE("emergency_email", e.target.value)} /></Field>
          </div>
          {error && <ErrorMsg msg={error} />}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep("personal")} className="btn-secondary">← Back</button>
            <button
              onClick={() => { if (!emergency.emergency_name || !emergency.emergency_phone) { setError("Please fill in the contact name and phone."); return; } submitPersonalAndEmergency(); }}
              disabled={loading}
              className="btn-primary px-8"
            >
              {loading ? "Saving…" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Documents */}
      {step === "documents" && (
        <div>
          <h2 className="text-xl font-semibold mb-1" style={{ color: "#232D3E" }}>Upload Documents</h2>
          <p className="text-sm text-gray-500 mb-6">Upload clear scans or photos. PDF, JPG or PNG. All uploads are secure and only visible to HR.</p>
          <div className="space-y-4">
            <DocUpload label="Passport (photo page)" field="doc_passport" file={docs.doc_passport} onChange={f => setDocs(d => ({ ...d, doc_passport: f }))} />
            <DocUpload label="Emirates ID (front & back)" field="doc_emirates_id" file={docs.doc_emirates_id} onChange={f => setDocs(d => ({ ...d, doc_emirates_id: f }))} />
            <DocUpload label="UAE Visa" field="doc_visa" file={docs.doc_visa} onChange={f => setDocs(d => ({ ...d, doc_visa: f }))} />
          </div>
          <p className="text-xs text-gray-400 mt-4">You can skip documents and submit them later if you don't have them ready.</p>
          {error && <ErrorMsg msg={error} />}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep("emergency")} className="btn-secondary">← Back</button>
            <button onClick={submitDocuments} disabled={loading} className="btn-primary px-8">
              {loading ? "Submitting…" : "Submit →"}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

const steps: Step[] = ["personal", "emergency", "documents", "done"];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFDF6" }}>
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#232D3E" }}>Baytify</h1>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#C2B08B" }}>New Starter Form</p>
          </div>
          <p className="text-xs text-gray-400">Secure · Private · HR only</p>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
      <AlertCircle size={15} /> {msg}
    </div>
  );
}

function DocUpload({ label, file, onChange }: { label: string; field: string; file: File | null; onChange: (f: File) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-colors ${file ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
        <Upload size={18} className={file ? "text-green-500" : "text-gray-400"} />
        <span className={`text-sm ${file ? "text-green-700 font-medium" : "text-gray-500"}`}>
          {file ? file.name : "Click to upload or drag & drop"}
        </span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
      </label>
    </div>
  );
}
