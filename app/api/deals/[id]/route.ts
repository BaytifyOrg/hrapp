import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDealPaidEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { getSlabRate, getDealPayrollPeriod, getPayrollPeriod } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auth check with regular client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // All DB writes use admin client to bypass RLS
  const admin = createAdminClient();
  const { status } = await request.json();

  let updateData: Record<string, unknown> = { status };

  if (status === "paid") {
    // Fetch the deal being marked as paid (including its lead source)
    const { data: deal } = await admin
      .from("deals")
      .select("commission_amount, employee_id, deal_date, lead_source")
      .eq("id", id)
      .single();

    if (deal) {
      const { data: employee } = await admin
        .from("employees")
        .select("commission_split, commission_type")
        .eq("id", deal.employee_id)
        .single();

      let splitRate: number;

      // Property Finder / Bayut leads are always 50%
      if (deal.lead_source === "property_finder" || deal.lead_source === "bayut") {
        splitRate = 50;
      } else if (employee?.commission_type === "slab") {
        // Slab: sum all OTHER paid deals in the same payroll period (25th–24th)
        const dealDate = new Date(deal.deal_date);
        const { start: periodStart, end: periodEnd } = getDealPayrollPeriod(dealDate);
        const periodStartStr = periodStart.toISOString().split("T")[0];
        const periodEndStr = periodEnd.toISOString().split("T")[0];

        const { data: monthDeals } = await admin
          .from("deals")
          .select("commission_amount")
          .eq("employee_id", deal.employee_id)
          .eq("status", "paid")
          .neq("id", id)
          .gte("deal_date", periodStartStr)
          .lte("deal_date", periodEndStr);

        const previousTotal = (monthDeals ?? []).reduce((s, d) => s + (d.commission_amount ?? 0), 0);
        const monthlyTotal = previousTotal + (deal.commission_amount ?? 0);
        splitRate = getSlabRate(monthlyTotal);
      } else {
        // Fixed split
        splitRate = employee?.commission_split ?? 50;
      }

      const agent_commission = Math.round(((deal.commission_amount * splitRate) / 100) * 100) / 100;
      const agency_commission = Math.round((deal.commission_amount - agent_commission) * 100) / 100;
      updateData = { status, agent_commission, agency_commission };
    }
  }

  const { error } = await admin.from("deals").update(updateData).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Send email to broker when deal is marked as paid
  if (status === "paid") {
    try {
      const { data: deal } = await admin.from("deals")
        .select("commission_amount, agent_commission, employee_id, deal_date, property_address, deal_value, lead_source")
        .eq("id", id)
        .single();

      if (deal) {
        const { data: employee } = await admin.from("employees")
          .select("first_name, last_name, user_id, commission_split, commission_type")
          .eq("id", deal.employee_id)
          .single();

        if (employee?.user_id) {
          const { data: authUser } = await admin.auth.admin.getUserById(employee.user_id);
          if (authUser?.user?.email) {
            const dealDate = new Date(deal.deal_date);
            const { label: payPeriod } = getPayrollPeriod(dealDate.getMonth() + 1, dealDate.getFullYear());
            const splitRate = (updateData as { agent_commission?: number }).agent_commission != null
              ? Math.round(((updateData as { agent_commission: number }).agent_commission / deal.commission_amount) * 100)
              : employee.commission_split ?? 50;

            await sendDealPaidEmail({
              to: authUser.user.email,
              name: employee.first_name,
              propertyAddress: deal.property_address,
              dealValue: deal.deal_value,
              agentCommission: (updateData as { agent_commission?: number }).agent_commission ?? deal.agent_commission ?? 0,
              splitRate,
              payPeriod,
            });
          }
        }
      }
    } catch {
      // Don't fail if email errors
    }
  }

  return NextResponse.json({ success: true });
}
