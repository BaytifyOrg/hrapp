import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTaskAssignedEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const admin = createAdminClient();

  let query = admin.from("tasks").select(`
    *,
    assignee:assigned_to(id, employees(first_name, last_name)),
    creator:created_by(id, employees(first_name, last_name)),
    task_notes(count)
  `).order("created_at", { ascending: false });

  if (profile?.role !== "admin") {
    query = query.eq("assigned_to", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin.from("tasks").insert({
    title: body.title,
    description: body.description || null,
    assigned_to: body.assigned_to || null,
    created_by: user.id,
    status: "todo",
    priority: body.priority || "normal",
    due_date: body.due_date || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Send email notification to assignee
  if (body.assigned_to) {
    try {
      const { data: assigneeAuth } = await admin.auth.admin.getUserById(body.assigned_to);
      const { data: assigneeEmployee } = await admin.from("employees")
        .select("first_name, last_name")
        .eq("user_id", body.assigned_to)
        .single();
      const { data: creatorEmployee } = await admin.from("employees")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .single();

      if (assigneeAuth?.user?.email) {
        const assigneeName = assigneeEmployee
          ? `${assigneeEmployee.first_name} ${assigneeEmployee.last_name}`
          : undefined;
        const creatorName = creatorEmployee
          ? `${creatorEmployee.first_name} ${creatorEmployee.last_name}`
          : "Admin";

        await sendTaskAssignedEmail({
          to: assigneeAuth.user.email,
          name: assigneeName,
          taskTitle: body.title,
          taskDescription: body.description,
          dueDate: body.due_date,
          assignedBy: creatorName,
        });
      }
    } catch {
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json(data);
}
