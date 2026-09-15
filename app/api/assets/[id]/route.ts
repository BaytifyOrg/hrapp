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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.asset_type !== undefined) patch.asset_type = body.asset_type;
  if (body.assigned_employee_id !== undefined) patch.assigned_employee_id = body.assigned_employee_id || null;
  if (body.assigned_to_note !== undefined) patch.assigned_to_note = body.assigned_to_note || null;
  if (body.username !== undefined) patch.username = body.username || null;
  if (body.notes !== undefined) patch.notes = body.notes || null;
  // Only touch a secret field if a new value was actually provided — leaves the stored
  // password/passcode untouched when the admin edits other fields without re-entering it.
  if (body.secret) patch.secret_encrypted = encryptSecret(body.secret);
  if (body.passcode) patch.passcode_encrypted = encryptSecret(body.passcode);

  const admin = createAdminClient();
  const { data, error } = await admin.from("company_assets").update(patch).eq("id", id)
    .select("id, name, asset_type, assigned_employee_id, assigned_to_note, username, notes, created_at, updated_at, secret_encrypted, passcode_encrypted").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { secret_encrypted, passcode_encrypted, ...rest } = data;
  return NextResponse.json({ ...rest, hasSecret: !!secret_encrypted, hasPasscode: !!passcode_encrypted });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("company_assets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
