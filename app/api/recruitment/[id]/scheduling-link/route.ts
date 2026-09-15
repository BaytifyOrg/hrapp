import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSchedulingLinkEmail } from "@/lib/email";
import { logActivity } from "@/lib/candidateActivity";
import { randomBytes } from "crypto";
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
  if (!candidate.email) return NextResponse.json({ error: "Candidate has no email on file" }, { status: 400 });

  const token = candidate.scheduling_token || randomBytes(24).toString("hex");
  if (!candidate.scheduling_token) {
    await admin.from("candidates").update({ scheduling_token: token }).eq("id", id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const schedulingUrl = `${appUrl}/schedule/${id}?token=${token}`;

  try {
    await sendSchedulingLinkEmail({
      to: candidate.email,
      name: candidate.first_name,
      positionApplied: candidate.position_applied ?? undefined,
      schedulingUrl,
    });
  } catch (e) {
    return NextResponse.json({ error: `Could not send email: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 500 });
  }

  await logActivity(admin, id, "email_sent", {
    subject: "Pick a time for your Baytify interview",
    body_snippet: `Scheduling link sent to ${candidate.email}`,
  });

  return NextResponse.json({ schedulingUrl });
}
