import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCandidateAcknowledgmentEmail } from "@/lib/email";
import { logActivity } from "@/lib/candidateActivity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CandidateForOnboarding = {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position_applied: string | null;
  source: string | null;
};

async function createOnboardingDraft(
  admin: ReturnType<typeof createAdminClient>,
  candidateId: string,
  candidate: CandidateForOnboarding
) {
  if (!candidate.email) {
    await logActivity(admin, candidateId, "note", {
      body_snippet: "Marked Hired, but no email on file — couldn't auto-create an onboarding draft. Add one and start onboarding manually.",
    });
    return;
  }

  const { data: existingSubmission } = await admin.from("onboarding_submissions")
    .select("id").eq("email", candidate.email).limit(1).maybeSingle();

  if (existingSubmission) {
    await logActivity(admin, candidateId, "note", {
      body_snippet: "Marked Hired — an onboarding submission for this email already exists, so a new one wasn't created.",
    });
    return;
  }

  const notesParts = ["Hired via Recruitment CRM."];
  if (candidate.position_applied) notesParts.push(`Position: ${candidate.position_applied}.`);
  if (candidate.source) notesParts.push(`Source: ${candidate.source}.`);

  const { error } = await admin.from("onboarding_submissions").insert({
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.email,
    phone: candidate.phone,
    status: "pending",
    notes: notesParts.join(" "),
  });

  await logActivity(admin, candidateId, "note", {
    body_snippet: error
      ? `Marked Hired, but creating the onboarding draft failed: ${error.message}`
      : "Onboarding draft created automatically — check the Onboarding page to complete their details.",
  });
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  return { user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();

  const { data: existing } = await admin.from("candidates")
    .select("email, welcome_email_sent, stage, first_name, last_name, phone, position_applied, source")
    .eq("id", id).single();
  const shouldSendEmail = !!body.email && !existing?.email && !existing?.welcome_email_sent;
  const patch = shouldSendEmail ? { ...body, welcome_email_sent: true } : body;

  const { data, error } = await admin.from("candidates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (shouldSendEmail) {
    try {
      await sendCandidateAcknowledgmentEmail({
        to: data.email,
        name: data.first_name,
        positionApplied: data.position_applied ?? undefined,
      });
      await logActivity(admin, id, "email_sent", {
        subject: "Your Baytify application — next steps",
        body_snippet: `Acknowledgment email sent to ${data.email}`,
      });
    } catch {}
  }

  if (body.stage && existing?.stage && body.stage !== existing.stage) {
    await logActivity(admin, id, "stage_change", {
      body_snippet: `Moved from "${existing.stage}" to "${body.stage}"`,
      metadata: { from: existing.stage, to: body.stage },
    });

    if (body.stage === "hired" && existing.stage !== "hired") {
      await createOnboardingDraft(admin, id, existing);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: candidate } = await admin.from("candidates").select("cv_file_path").eq("id", id).single();
  if (candidate?.cv_file_path) {
    await admin.storage.from("candidate-cvs").remove([candidate.cv_file_path]);
  }

  const { error } = await admin.from("candidates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
