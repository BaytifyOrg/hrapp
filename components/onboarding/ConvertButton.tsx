"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

export default function ConvertButton({ submissionId, submission }: { submissionId: string; submission: Record<string, string> }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // If this submission was started from a personalized onboarding link, it's
  // already tied to an existing employee — fill in that record instead of
  // creating a duplicate one.
  const linkedEmployeeId = submission.converted_employee_id || null;

  async function convert() {
    const label = linkedEmployeeId ? "Update" : "Create an employee record for";
    if (!confirm(`${label} ${submission.first_name} ${submission.last_name}?`)) return;
    setLoading(true);

    const fields = {
      first_name: submission.first_name,
      last_name: submission.last_name,
      email: submission.email,
      phone: submission.phone || null,
      nationality: submission.nationality || null,
      emirates_id: submission.emirates_id || null,
      passport_number: submission.passport_number || null,
      visa_number: submission.visa_number || null,
      visa_expiry: submission.visa_expiry || null,
      address: submission.address || null,
    };

    let employeeId = linkedEmployeeId;

    if (linkedEmployeeId) {
      const { error } = await supabase
        .from("employees")
        .update({ ...fields, status: "active", onboarding_token: null })
        .eq("id", linkedEmployeeId);
      if (error) { alert(error.message); setLoading(false); return; }
    } else {
      const { data: emp, error } = await supabase.from("employees").insert({
        ...fields,
        status: "active",
        start_date: new Date().toISOString().split("T")[0],
      }).select("id").single();
      if (error || !emp) { alert(error?.message ?? "Failed to create employee"); setLoading(false); return; }
      employeeId = emp.id;
    }

    // Mark submission as converted
    await supabase.from("onboarding_submissions")
      .update({ status: "converted", converted_employee_id: employeeId })
      .eq("id", submissionId);

    setLoading(false);
    router.push(`/employees/${employeeId}`);
    router.refresh();
  }

  return (
    <button onClick={convert} disabled={loading} className="btn-primary whitespace-nowrap">
      <UserPlus size={15} />
      {loading ? "Saving…" : linkedEmployeeId ? "Update Employee" : "Create Employee"}
    </button>
  );
}
