import { createAdminClient } from "@/lib/supabase/admin";
import { createZoomMeeting } from "@/lib/zoom";
import { sendInterviewInviteEmail, sendInterviewScheduledNotification } from "@/lib/email";
import { logActivity } from "@/lib/candidateActivity";
import { generateAvailableSlots } from "@/lib/scheduling";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function loadCandidateByToken(admin: ReturnType<typeof createAdminClient>, id: string, token: string) {
  const { data: candidate } = await admin.from("candidates").select("*").eq("id", id).single();
  if (!candidate || !candidate.scheduling_token || candidate.scheduling_token !== token) return null;
  return candidate;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const admin = createAdminClient();
  const candidate = await loadCandidateByToken(admin, id, token);
  if (!candidate) return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });

  if (candidate.interview_at) {
    return NextResponse.json({
      name: candidate.first_name,
      positionApplied: candidate.position_applied,
      alreadyBooked: true,
      interviewAt: candidate.interview_at,
    });
  }

  const { data: booked } = await admin.from("candidates").select("interview_at").not("interview_at", "is", null);
  const bookedSet = new Set((booked ?? []).map((b) => new Date(b.interview_at!).toISOString()));
  const slots = generateAvailableSlots(bookedSet);

  return NextResponse.json({
    name: candidate.first_name,
    positionApplied: candidate.position_applied,
    alreadyBooked: false,
    slots,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, interview_at } = await req.json();
  if (!token || !interview_at) return NextResponse.json({ error: "Missing token or time" }, { status: 400 });

  const admin = createAdminClient();
  const candidate = await loadCandidateByToken(admin, id, token);
  if (!candidate) return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  if (candidate.interview_at) return NextResponse.json({ error: "This interview has already been scheduled" }, { status: 400 });

  const { data: conflict } = await admin.from("candidates").select("id").eq("interview_at", interview_at).limit(1);
  if (conflict && conflict.length > 0) {
    return NextResponse.json({ error: "That slot was just taken — please pick another." }, { status: 409 });
  }

  let zoom;
  try {
    zoom = await createZoomMeeting({
      topic: `Baytify Interview — ${candidate.first_name} ${candidate.last_name}`.trim(),
      startTime: new Date(interview_at).toISOString(),
      durationMinutes: 30,
    });
  } catch (e) {
    return NextResponse.json({ error: `Could not create Zoom meeting: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 500 });
  }

  const { error: updateErr } = await admin.from("candidates").update({
    interview_at,
    interview_zoom_url: zoom.joinUrl,
    interview_zoom_meeting_id: String(zoom.meetingId),
    interview_invite_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  try {
    await sendInterviewInviteEmail({
      to: candidate.email!,
      name: candidate.first_name,
      positionApplied: candidate.position_applied ?? undefined,
      interviewAt: interview_at,
      zoomUrl: zoom.joinUrl,
    });
  } catch {}

  await logActivity(admin, id, "email_sent", {
    subject: "Your Baytify interview — Zoom details",
    body_snippet: `Candidate self-booked interview for ${new Date(interview_at).toLocaleString("en-GB")}`,
    metadata: { interview_at, zoom_url: zoom.joinUrl, self_booked: true },
  });

  try {
    await sendInterviewScheduledNotification({
      candidateName: `${candidate.first_name} ${candidate.last_name}`.trim(),
      interviewAt: interview_at,
      durationMinutes: 30,
      zoomUrl: zoom.joinUrl,
      meetingId: String(zoom.meetingId),
      selfBooked: true,
    });
  } catch {}

  return NextResponse.json({ success: true, interviewAt: interview_at, zoomUrl: zoom.joinUrl });
}
