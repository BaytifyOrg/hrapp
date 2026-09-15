import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { guide_id, time_spent_seconds } = await request.json();
  if (!guide_id) return NextResponse.json({ error: "guide_id required" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("employee_id").eq("id", user.id).single();

  const admin = createAdminClient();
  const { data, error } = await admin.from("training_progress").upsert({
    user_id: user.id,
    guide_id,
    employee_id: profile?.employee_id ?? null,
    completed_at: new Date().toISOString(),
    time_spent_seconds: time_spent_seconds ?? null,
  }, { onConflict: "user_id,guide_id" }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
