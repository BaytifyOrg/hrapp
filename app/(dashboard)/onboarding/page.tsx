import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ClipboardList, CheckCircle, Clock } from "lucide-react";
import ConvertButton from "@/components/onboarding/ConvertButton";
import DocLinks from "@/components/onboarding/DocLinks";
import CopyButton from "@/components/onboarding/CopyButton";
import DeleteButton from "@/components/onboarding/DeleteButton";
import Link from "next/link";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: submissions } = await supabase
    .from("onboarding_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });

  const pending = submissions?.filter(s => s.status === "pending") ?? [];
  const done = submissions?.filter(s => s.status !== "pending") ?? [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#232D3E" }}>Onboarding</h1>
          <p className="text-sm text-gray-500 mt-1">{pending.length} pending submission{pending.length !== 1 ? "s" : ""}</p>
        </div>
        {/* Shareable link */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Share this link with new starters</p>
            <p className="text-sm font-medium" style={{ color: "#232D3E" }}>{appUrl}/onboard</p>
          </div>
          <CopyButton text={`${appUrl}/onboard`} />
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" /> Pending Review
          </h2>
          <div className="space-y-4">
            {pending.map(sub => (
              <SubmissionCard key={sub.id} sub={sub} />
            ))}
          </div>
        </section>
      )}

      {!pending.length && (
        <div className="card text-center py-12 mb-8">
          <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No pending submissions. Share the onboarding link with new starters.</p>
          <p className="text-sm font-medium mt-2" style={{ color: "#C2B08B" }}>{appUrl}/onboard</p>
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" /> Processed
          </h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Submitted</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {done.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{sub.first_name} {sub.last_name}</td>
                    <td className="px-6 py-3 text-gray-500">{sub.email}</td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(sub.submitted_at)}</td>
                    <td className="px-6 py-3">
                      <span className={`badge ${sub.status === "converted" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SubmissionCard({ sub }: { sub: Record<string, string> }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0" style={{ backgroundColor: "#232D3E" }}>
              {sub.first_name?.[0]}{sub.last_name?.[0]}
            </div>
            <div>
              <p className="font-semibold" style={{ color: "#232D3E" }}>{sub.first_name} {sub.last_name}</p>
              <p className="text-xs text-gray-500">{sub.email} · {sub.phone}</p>
            </div>
            {sub.converted_employee_id && (
              <span className="badge bg-blue-100 text-blue-700">Linked to existing employee</span>
            )}
            <span className="badge bg-amber-100 text-amber-700 ml-auto">Pending</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
            <Info label="Nationality" value={sub.nationality} />
            <Info label="Passport" value={sub.passport_number} />
            <Info label="Emirates ID" value={sub.emirates_id} />
            <Info label="Visa Expiry" value={sub.visa_expiry ? new Date(sub.visa_expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null} />
          </div>

          {(sub.emergency_name) && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm mb-4">
              <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Emergency Contact</p>
              <p className="font-medium text-gray-800">{sub.emergency_name} <span className="text-gray-400 font-normal">({sub.emergency_relationship})</span></p>
              <p className="text-gray-500">{sub.emergency_phone}{sub.emergency_email ? ` · ${sub.emergency_email}` : ""}</p>
            </div>
          )}

          <DocLinks submissionId={sub.id} hasPassport={!!sub.doc_passport} hasEmiratesId={!!sub.doc_emirates_id} hasVisa={!!sub.doc_visa} />
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <ConvertButton submissionId={sub.id} submission={sub} />
          <DeleteButton submissionId={sub.id} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-800">{value || "—"}</p>
    </div>
  );
}

