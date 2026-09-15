import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees")
    .select("id, first_name, last_name, email")
    .eq("onboarding_token", token)
    .eq("status", "onboarding")
    .single();

  if (!employee) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  return NextResponse.json(employee);
}
