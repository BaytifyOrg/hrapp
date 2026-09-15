import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeaveRequestEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin.from("leave_requests").insert({
    employee_id: body.employee_id,
    leave_type_id: body.leave_type_id,
    start_date: body.start_date,
    end_date: body.end_date,
    days_count: body.days_count,
    reason: body.reason || null,
    status: body.status ?? "pending",
  }).select("*, leave_types(name, color)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Send notification to manager if set, otherwise to admin
  try {
    const { data: employee } = await admin.from("employees")
      .select("first_name, last_name, manager_email")
      .eq("id", body.employee_id)
      .single();

    if (employee) {
      const notifyEmail = (employee as unknown as Record<string, unknown>).manager_email as string
        || process.env.NOTIFY_EMAIL
        || "emma@baytify.com";

      await sendLeaveRequestEmail({
        employeeName: `${employee.first_name} ${employee.last_name}`,
        leaveType: (data as { leave_types?: { name?: string } }).leave_types?.name ?? "Leave",
        startDate: body.start_date,
        endDate: body.end_date,
        days: body.days_count,
        reason: body.reason,
        notifyEmail,
      });
    }
  } catch {
    // Don't fail if email errors
  }

  return NextResponse.json(data);
}
