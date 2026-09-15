import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPayslipReadyEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const { data: run, error } = await admin.from("payroll_runs")
    .update({ status: "finalized" })
    .eq("id", id)
    .select("month, year")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Email each employee their payslip summary
  try {
    const { data: items } = await admin.from("payroll_items")
      .select("gross_pay, net_pay, employees(first_name, last_name, user_id)")
      .eq("payroll_run_id", id);

    for (const item of items ?? []) {
      const emp = (item as { employees?: { first_name?: string; last_name?: string; user_id?: string } }).employees;
      if (!emp?.user_id) continue;
      const { data: authUser } = await admin.auth.admin.getUserById(emp.user_id);
      if (!authUser?.user?.email) continue;

      await sendPayslipReadyEmail({
        to: authUser.user.email,
        name: emp.first_name,
        month: run.month,
        year: run.year,
        grossPay: item.gross_pay,
        netPay: item.net_pay,
      });
    }
  } catch {
    // Don't fail if emails error
  }

  return NextResponse.json({ ok: true });
}
