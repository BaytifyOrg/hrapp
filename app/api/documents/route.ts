import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file_path = req.nextUrl.searchParams.get("path");
  if (!file_path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("hr-docs").createSignedUrl(file_path, 120);
  if (error || !data) return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string ?? "other";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const admin = createAdminClient();
  const path = `hr-library/${Date.now()}-${file.name}`;
  const bytes = await file.arrayBuffer();

  const { error: se } = await admin.storage.from("hr-docs").upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (se) return NextResponse.json({ error: se.message }, { status: 500 });

  const { error: de } = await admin.from("hr_documents").insert({
    name: file.name,
    file_path: path,
    category,
    size_bytes: file.size,
  });
  if (de) return NextResponse.json({ error: de.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, file_path } = await req.json();
  const admin = createAdminClient();

  await admin.storage.from("hr-docs").remove([file_path]);
  await admin.from("hr_documents").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
