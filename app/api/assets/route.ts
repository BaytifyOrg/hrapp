import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/vaultCrypto";
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
  const { data, error } = await admin
    .from("company_assets")
    .select("id, name, asset_type, assigned_employee_id, assigned_to_note, username, notes, created_at, updated_at, secret_encrypted, passcode_encrypted, employees:assigned_employee_id(first_name, last_name)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Never send secret_encrypted/passcode_encrypted to the client — values are only fetched one at a time via /api/assets/[id]/reveal.
  const result = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    asset_type: row.asset_type,
    assigned_employee_id: row.assigned_employee_id,
    assigned_to_note: row.assigned_to_note,
    username: row.username,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    employees: row.employees,
    hasSecret: !!row.secret_encrypted,
    hasPasscode: !!row.passcode_encrypted,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("company_assets").insert({
    name: body.name.trim(),
    asset_type: body.asset_type || "other",
    assigned_employee_id: body.assigned_employee_id || null,
    assigned_to_note: body.assigned_to_note || null,
    username: body.username || null,
    secret_encrypted: body.secret ? encryptSecret(body.secret) : null,
    passcode_encrypted: body.passcode ? encryptSecret(body.passcode) : null,
    notes: body.notes || null,
    created_by: auth.user.id,
  }).select("id, name, asset_type, assigned_employee_id, assigned_to_note, username, notes, created_at, updated_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ...data, hasSecret: !!body.secret, hasPasscode: !!body.passcode });
}
