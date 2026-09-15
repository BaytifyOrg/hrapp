import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractCvText, parseCvFields } from "@/lib/cvParser";
import { sendCandidateAcknowledgmentEmail } from "@/lib/email";
import { logActivity } from "@/lib/candidateActivity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function nameFromFilename(filename: string): { first_name: string; last_name: string } {
  const base = filename.replace(/\.[^/.]+$/, "");
  let cleaned = base
    .replace(/[_\-.]+/g, " ")
    .replace(/\(\d+\)/g, "")
    .trim();

  // Strip a leading "Resume"/"CV" glued directly onto the name (e.g. "ResumeHarleyMolloy")
  for (const prefix of ["resume", "cv", "curriculumvitae"]) {
    if (cleaned.toLowerCase().startsWith(prefix) && /[A-Z]/.test(cleaned.charAt(prefix.length) || "")) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }

  cleaned = cleaned
    .replace(/\b(cv|resume|resumé|final|updated|copy)\b/gi, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split CamelCase, e.g. "HarleyMolloy" -> "Harley Molloy"
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) return { first_name: "Unnamed", last_name: "Candidate" };
  const first_name = parts[0];
  const last_name = parts.slice(1).join(" ") || "";
  return { first_name, last_name };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file_path = req.nextUrl.searchParams.get("path");
  if (!file_path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("candidate-cvs").createSignedUrl(file_path, 120);
  if (error || !data) return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  const candidateId = formData.get("candidate_id") as string | null;
  const talentPool = formData.get("talent_pool") === "true";
  if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const admin = createAdminClient();

  // Attaching/replacing a CV on one existing candidate
  if (candidateId && files.length === 1) {
    const file = files[0];
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadErr } = await admin.storage.from("candidate-cvs").upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: existing } = await admin.from("candidates")
      .select("cv_file_path, email, phone, position_applied, welcome_email_sent, first_name, last_name")
      .eq("id", candidateId).single();
    if (existing?.cv_file_path) {
      await admin.storage.from("candidate-cvs").remove([existing.cv_file_path]);
    }

    const text = await extractCvText(bytes, file.type, file.name);
    const parsed = text ? parseCvFields(text) : {};

    const updatePatch: Record<string, unknown> = {
      cv_file_path: path,
      cv_file_name: file.name,
      updated_at: new Date().toISOString(),
    };
    if (!existing?.email && parsed.email) updatePatch.email = parsed.email;
    if (!existing?.phone && parsed.phone) updatePatch.phone = parsed.phone;

    const newEmail = (updatePatch.email as string | undefined) ?? existing?.email ?? undefined;
    const shouldSendEmail = !!newEmail && !existing?.welcome_email_sent;
    if (shouldSendEmail) updatePatch.welcome_email_sent = true;

    const { data, error } = await admin.from("candidates")
      .update(updatePatch)
      .eq("id", candidateId)
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (shouldSendEmail && newEmail) {
      try {
        await sendCandidateAcknowledgmentEmail({
          to: newEmail,
          name: data.first_name,
          positionApplied: data.position_applied ?? undefined,
        });
        await logActivity(admin, candidateId, "email_sent", {
          subject: "Your Baytify application — next steps",
          body_snippet: `Acknowledgment email sent to ${newEmail}`,
        });
      } catch {}
    }

    return NextResponse.json({ candidate: data });
  }

  const created: unknown[] = [];
  const failed: { file: string; error: string }[] = [];
  const duplicates: { file: string; existingName: string }[] = [];

  const { data: existingCandidates } = await admin.from("candidates").select("first_name, last_name, email").not("email", "is", null);
  const existingEmails = new Map((existingCandidates ?? []).map((c) => [c.email!.toLowerCase(), `${c.first_name} ${c.last_name}`.trim()]));

  for (const file of files) {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadErr } = await admin.storage.from("candidate-cvs").upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadErr) {
      failed.push({ file: file.name, error: uploadErr.message });
      continue;
    }

    const text = await extractCvText(bytes, file.type, file.name);
    const parsed = text ? parseCvFields(text) : {};
    const fallback = nameFromFilename(file.name);

    const first_name = parsed.first_name || fallback.first_name;
    const last_name = parsed.first_name ? (parsed.last_name || "") : fallback.last_name;

    if (parsed.email && existingEmails.has(parsed.email.toLowerCase())) {
      await admin.storage.from("candidate-cvs").remove([path]);
      duplicates.push({ file: file.name, existingName: existingEmails.get(parsed.email.toLowerCase())! });
      continue;
    }

    const { data, error: insertErr } = await admin.from("candidates").insert({
      first_name,
      last_name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      stage: "new",
      talent_pool: talentPool,
      cv_file_path: path,
      cv_file_name: file.name,
      created_by: user.id,
      welcome_email_sent: talentPool ? true : !!parsed.email,
    }).select().single();

    if (insertErr) {
      failed.push({ file: file.name, error: insertErr.message });
      continue;
    }
    created.push(data);
    if (parsed.email) existingEmails.set(parsed.email.toLowerCase(), `${first_name} ${last_name}`.trim());

    // Talent pool CVs aren't for a specific open role right now, so skip the
    // "thanks for applying to this role" email — it wouldn't be accurate.
    if (parsed.email && !talentPool) {
      try {
        await sendCandidateAcknowledgmentEmail({ to: parsed.email, name: first_name });
        await logActivity(admin, data.id, "email_sent", {
          subject: "Your Baytify application — next steps",
          body_snippet: `Acknowledgment email sent to ${parsed.email}`,
        });
      } catch {}
    }
  }

  return NextResponse.json({ created, failed, duplicates });
}
