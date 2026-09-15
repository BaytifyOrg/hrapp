import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeaveDecisionEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status, review_note } = await req.json();
  const admin = createAdminClient();

  const { data: leave, error } = await admin.from("leave_requests").update({
    status,
    reviewed_at: new Date().toISOString(),
    review_note: review_note || null,
  }).eq("id", id).select("*, leave_types(name), employees(id, first_name, last_name, user_id)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Send decision email to employee
  try {
    const emp = (leave as { employees?: { first_name?: string; last_name?: string; user_id?: string } }).employees;
    const lt = (leave as { leave_types?: { name?: string } }).leave_types;
    if (emp?.user_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(emp.user_id);
      if (authUser?.user?.email) {
        await sendLeaveDecisionEmail({
          to: authUser.user.email,
          name: emp.first_name,
          status: status as "approved" | "rejected",
          leaveType: lt?.name ?? "Leave",
          startDate: (leave as { start_date: string }).start_date,
          endDate: (leave as { end_date: string }).end_date,
          days: (leave as { days_count: number }).days_count,
          reviewNote: review_note,
        });
      }
    }
  } catch {
    // Don't fail if email errors
  }

  return NextResponse.json(leave);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from("leave_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
