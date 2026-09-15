import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOfferLetterEmail } from "@/lib/email";
import { logActivity } from "@/lib/candidateActivity";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SETTING_KEY = "offer_letter_employer_signature";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: signatureRow } = await admin.from("app_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
  if (!signatureRow?.value) {
    return NextResponse.json({ error: "Save your signature first — see the Offer Letter section." }, { status: 400 });
  }

  const { data: candidate, error: fetchErr } = await admin.from("candidates").select("*").eq("id", id).single();
  if (fetchErr || !candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  if (!candidate.email) return NextResponse.json({ error: "Candidate has no email on file" }, { status: 400 });

  const body = await request.json();
  const candidateFullName = (body.candidateFullName || "").trim();
  const startDate = (body.startDate || "").trim();
  if (!candidateFullName) return NextResponse.json({ error: "Candidate name is required" }, { status: 400 });
  if (!startDate) return NextResponse.json({ error: "Start date is required" }, { status: 400 });

  const employerDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");

  const content = { candidateFullName, startDate, employerDate };

  const token = candidate.offer_token || randomBytes(24).toString("hex");

  const { data: updated, error: updateErr } = await admin.from("candidates").update({
    offer_token: token,
    offer_status: "sent",
    offer_content: content,
    offer_pdf_path: null,
    offer_sent_at: new Date().toISOString(),
    offer_signed_at: null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const offerUrl = `${appUrl}/offer/${id}?token=${token}`;

  try {
    await sendOfferLetterEmail({
      to: candidate.email,
      name: candidate.first_name,
      positionApplied: candidate.position_applied ?? undefined,
      offerUrl,
    });
  } catch (e) {
    return NextResponse.json({ error: `Could not send email: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 500 });
  }

  await logActivity(admin, id, "email_sent", {
    subject: "Your Baytify offer letter",
    body_snippet: `Offer letter sent to ${candidate.email} — ${candidateFullName}, start date ${startDate}`,
    metadata: { offer_sent: true },
  });

  return NextResponse.json({ success: true, candidate: updated });
}
