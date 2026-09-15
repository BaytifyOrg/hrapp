import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCandidateAcknowledgmentEmail } from "@/lib/email";
import { logActivity } from "@/lib/candidateActivity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin.from("candidates").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin.from("candidates").insert({
    first_name: body.first_name,
    last_name: body.last_name || "",
    email: body.email || null,
    phone: body.phone || null,
    position_applied: body.position_applied || null,
    source: body.source || null,
    stage: body.stage || "new",
    notes: body.notes || null,
    talent_pool: !!body.talent_pool,
    created_by: auth.user!.id,
    welcome_email_sent: body.talent_pool ? true : !!body.email,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.email && !body.talent_pool) {
    try {
      await sendCandidateAcknowledgmentEmail({
        to: body.email,
        name: data.first_name,
        positionApplied: data.position_applied ?? undefined,
      });
      await logActivity(admin, data.id, "email_sent", {
        subject: "Your Baytify application — next steps",
        body_snippet: `Acknowledgment email sent to ${body.email}`,
      });
    } catch {}
  }

  return NextResponse.json(data);
}
