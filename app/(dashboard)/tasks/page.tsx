import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import TasksView from "@/components/tasks/TasksView";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, employee_id").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  const admin = createAdminClient();

  // Fetch staff users for the assignee dropdown (admin only)
  let staffUsers: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data: profiles } = await admin.from("profiles")
      .select("id, employee_id, employees(first_name, last_name)");
    staffUsers = (profiles ?? [])
      .map(p => {
        const emp = (p.employees as unknown) as { first_name: string; last_name: string } | null;
        return { id: p.id, name: emp ? `${emp.first_name} ${emp.last_name}` : `User ${p.id.slice(0, 6)}` };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get current user's employee name
  let currentUserName = "You";
  if (profile?.employee_id) {
    const { data: emp } = await supabase.from("employees").select("first_name, last_name").eq("id", profile.employee_id).single();
    if (emp) currentUserName = `${emp.first_name} ${emp.last_name}`;
  }

  return (
    <TasksView
      isAdmin={isAdmin}
      currentUserId={user.id}
      currentUserName={currentUserName}
      staffUsers={staffUsers}
    />
  );
}
