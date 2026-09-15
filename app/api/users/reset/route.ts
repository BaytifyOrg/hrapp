import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, name } = await request.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hr.baytify.com";
  const admin = createAdminClient();

  // Generate a one-time recovery link
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${APP_URL}/reset-password`,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const resetLink = data.properties?.action_link;
  if (!resetLink) return NextResponse.json({ error: "Could not generate reset link" }, { status: 500 });

  await sendPasswordResetEmail({ to: email, name, resetLink });

  return NextResponse.json({ success: true });
}
