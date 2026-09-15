import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    employee_id,
    property_address,
    deal_type,
    deal_value,
    commission_rate,
    commission_amount,
    deal_date,
    notes,
    status,
    lead_source,
  } = body;

  if (!employee_id || !property_address || !deal_value || !deal_date) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Use admin client to bypass RLS — auth check above already verified admin role
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("deals")
    .insert({
      employee_id,
      property_address,
      deal_type: deal_type ?? "sale",
      deal_value: parseFloat(deal_value),
      commission_rate: parseFloat(commission_rate ?? 2),
      commission_amount: parseFloat(commission_amount ?? 0),
      deal_date,
      notes: notes ?? null,
      status: status ?? "approved",
      lead_source: lead_source ?? "direct",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
