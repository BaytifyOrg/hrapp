import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createZoomMeeting } from "@/lib/zoom";
import { sendInterviewInviteEmail, sendInterviewScheduledNotification } from "@/lib/email";
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

  const { interview_at, duration_minutes } = await request.json();
  if (!interview_at) return NextResponse.json({ error: "Missing interview date/time" }, { status: 400 });

  const admin = createAdminClient();
  const { data: candidate, error: fetchErr } = await admin.from("candidates").select("*").eq("id", id).single();
  if (fetchErr || !candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  if (!candidate.email) return NextResponse.json({ error: "Candidate has no email on file" }, { status: 400 });

  let zoom;
  try {
    zoom = await createZoomMeeting({
      topic: `Baytify Interview — ${candidate.first_name} ${candidate.last_name}`.trim(),
      startTime: new Date(interview_at).toISOString(),
      durationMinutes: duration_minutes || 30,
    });
  } catch (e) {
    return NextResponse.json({ error: `Could not create Zoom meeting: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 500 });
  }

  const { data: updated, error: updateErr } = await admin.from("candidates").update({
    interview_at,
    interview_zoom_url: zoom.joinUrl,
    interview_zoom_meeting_id: String(zoom.meetingId),
    interview_invite_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select().single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  try {
    await sendInterviewInviteEmail({
      to: candidate.email,
      name: candidate.first_name,
      positionApplied: candidate.position_applied ?? undefined,
      interviewAt: interview_at,
      zoomUrl: zoom.joinUrl,
    });
  } catch (e) {
    return NextResponse.json({ candidate: updated, emailSent: false, emailError: e instanceof Error ? e.message : "unknown error" });
  }

  await logActivity(admin, id, "email_sent", {
    subject: "Your Baytify interview — Zoom details",
    body_snippet: `Interview invite for ${new Date(interview_at).toLocaleString("en-GB")} sent to ${candidate.email}`,
    metadata: { interview_at, zoom_url: zoom.joinUrl },
  });

  try {
    await sendInterviewScheduledNotification({
      candidateName: `${candidate.first_name} ${candidate.last_name}`.trim(),
      interviewAt: interview_at,
      durationMinutes: duration_minutes || 30,
      zoomUrl: zoom.joinUrl,
      meetingId: String(zoom.meetingId),
      selfBooked: false,
    });
  } catch {}

  return NextResponse.json({ candidate: updated, emailSent: true });
}
