import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRejectionEmail } from "@/lib/email";
import { logActivity } from "@/lib/candidateActivity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: candidate, error: fetchErr } = await admin.from("candidates").select("*").eq("id", id).single();
  if (fetchErr || !candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const { data: updated, error: updateErr } = await admin.from("candidates")
    .update({ stage: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  await logActivity(admin, id, "stage_change", {
    body_snippet: `Moved from "${candidate.stage}" to "rejected"`,
    metadata: { from: candidate.stage, to: "rejected" },
  });

  let emailSent = false;
  if (candidate.email) {
    try {
      await sendRejectionEmail({
        to: candidate.email,
        name: candidate.first_name,
        positionApplied: candidate.position_applied ?? undefined,
      });
      await logActivity(admin, id, "email_sent", {
        subject: "Your Baytify application",
        body_snippet: `Rejection email sent to ${candidate.email}`,
      });
      emailSent = true;
    } catch {}
  }

  return NextResponse.json({ candidate: updated, emailSent });
}
