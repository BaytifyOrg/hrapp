import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: candidate } = await admin.from("candidates").select("offer_pdf_path").eq("id", id).single();
  if (!candidate?.offer_pdf_path) return NextResponse.json({ error: "No signed offer letter on file" }, { status: 404 });

  const { data, error } = await admin.storage.from("candidate-offers").createSignedUrl(candidate.offer_pdf_path, 60 * 10);
  if (error || !data) return NextResponse.json({ error: error?.message || "Could not create link" }, { status: 400 });

  return NextResponse.json({ url: data.signedUrl });
}
