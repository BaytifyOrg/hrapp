import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Only admins can call this endpoint
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// POST /api/users — create a new staff login
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password, employee_id, role = "employee" } = await request.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Create profile
  await supabaseAdmin.from("profiles").insert({
    id: data.user.id,
    role,
    employee_id: employee_id || null,
  });

  // Send welcome email (non-blocking — don't fail if email fails)
  if (process.env.RESEND_API_KEY) {
    try {
      // Get employee name if linked
      let name: string | undefined;
      if (employee_id) {
        const { data: emp } = await supabaseAdmin
          .from("employees")
          .select("first_name")
          .eq("id", employee_id)
          .single();
        name = emp?.first_name;
      }
      await sendWelcomeEmail({ to: email, password, name });
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr);
    }
  }

  return NextResponse.json({ user: data.user });
}

// GET /api/users — list all auth users with their profiles
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Get profiles
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, employee_id, employees(first_name, last_name)");

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    profile: profileMap[u.id] ?? null,
  }));

  return NextResponse.json({ users });
}

// DELETE /api/users — delete a user
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user_id } = await request.json();
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
