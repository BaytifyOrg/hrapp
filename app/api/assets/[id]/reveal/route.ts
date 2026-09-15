import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/vaultCrypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const field = request.nextUrl.searchParams.get("field") === "passcode" ? "passcode_encrypted" : "secret_encrypted";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("company_assets").select(field).eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const encrypted = data[field as keyof typeof data] as string | null;
  if (!encrypted) return NextResponse.json({ secret: null });

  try {
    return NextResponse.json({ secret: decryptSecret(encrypted) });
  } catch {
    return NextResponse.json({ error: "Could not decrypt this value" }, { status: 500 });
  }
}
