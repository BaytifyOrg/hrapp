import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const guideId = formData.get("guideId") as string | null;

  if (!file || !guideId) return NextResponse.json({ error: "Missing file or guideId" }, { status: 400 });

  const ext = file.name.split(".").pop();
  const path = `${guideId}/guide.${ext}`;
  const bytes = await file.arrayBuffer();

  const admin = createAdminClient();
  const { error } = await admin.storage.from("training-docs").upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file_path = req.nextUrl.searchParams.get("path");
  if (!file_path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("training-docs").createSignedUrl(file_path, 3600);
  if (error || !data) return NextResponse.json({ error: "Could not generate link" }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
