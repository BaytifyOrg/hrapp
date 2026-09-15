import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTaskNoteEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("task_notes")
    .select("*, author:user_id(id, employees(first_name, last_name))")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("task_notes").insert({
    task_id: id,
    user_id: user.id,
    content: content.trim(),
  }).select("*, author:user_id(id, employees(first_name, last_name))").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Email the other party on the task
  try {
    const { data: task } = await admin.from("tasks")
      .select("title, assigned_to, created_by")
      .eq("id", id)
      .single();

    if (task) {
      const recipientId = user.id === task.assigned_to ? task.created_by : task.assigned_to;
      if (recipientId && recipientId !== user.id) {
        const { data: recipientAuth } = await admin.auth.admin.getUserById(recipientId);
        const { data: recipientEmp } = await admin.from("employees")
          .select("first_name, last_name")
          .eq("user_id", recipientId)
          .single();
        const { data: authorEmp } = await admin.from("employees")
          .select("first_name, last_name")
          .eq("user_id", user.id)
          .single();

        if (recipientAuth?.user?.email) {
          await sendTaskNoteEmail({
            to: recipientAuth.user.email,
            name: recipientEmp?.first_name,
            taskTitle: task.title,
            noteContent: content.trim(),
            authorName: authorEmp ? `${authorEmp.first_name} ${authorEmp.last_name}` : "A team member",
          });
        }
      }
    }
  } catch {
    // Don't fail if email errors
  }

  return NextResponse.json(data);
}
