import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCustomCandidateEmail } from "@/lib/email";
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

  const { subject, body } = await request.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: candidate, error: fetchErr } = await admin.from("candidates").select("email").eq("id", id).single();
  if (fetchErr || !candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  if (!candidate.email) return NextResponse.json({ error: "Candidate has no email on file" }, { status: 400 });

  try {
    await sendCustomCandidateEmail({ to: candidate.email, subject, bodyText: body });
  } catch (e) {
    return NextResponse.json({ error: `Could not send email: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 500 });
  }

  await logActivity(admin, id, "email_sent", {
    subject,
    body_snippet: body.slice(0, 500),
  });

  return NextResponse.json({ success: true });
}
