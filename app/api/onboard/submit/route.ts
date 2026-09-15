import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { onboarding_token, ...body } = await request.json();
    const supabase = createAdminClient();

    // Never trust a client-supplied employee id — re-derive it from the
    // server-issued token so a submitter can't link their form to someone else's record.
    let linkedEmployeeId: string | null = null;
    if (onboarding_token) {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("onboarding_token", onboarding_token)
        .eq("status", "onboarding")
        .single();
      linkedEmployeeId = employee?.id ?? null;
    }

    const { data, error } = await supabase
      .from("onboarding_submissions")
      .insert({
        ...body,
        date_of_birth: body.date_of_birth || null,
        visa_expiry: body.visa_expiry || null,
        status: "pending",
        converted_employee_id: linkedEmployeeId,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Onboarding submit error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
