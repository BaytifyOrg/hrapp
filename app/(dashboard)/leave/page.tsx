import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminLeaveView from "@/components/leave/AdminLeaveView";
import EmployeeLeaveView from "@/components/leave/EmployeeLeaveView";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, employee_id")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    const admin = createAdminClient();

    const { data: requests } = await admin
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    const [{ data: employees }, { data: leaveTypes }] = await Promise.all([
      admin.from("employees").select("id, first_name, last_name, job_title, date_of_birth").eq("status", "active").order("first_name"),
      admin.from("leave_types").select("id, name, color"),
    ]);

    const merged = (requests ?? []).map(r => ({
      ...r,
      employees: (employees ?? []).find(e => e.id === r.employee_id) ?? null,
      leave_types: (leaveTypes ?? []).find(lt => lt.id === r.leave_type_id) ?? null,
    }));

    return <AdminLeaveView requests={merged} employees={employees ?? []} leaveTypes={leaveTypes ?? []} />;
  }

  return <EmployeeLeaveView employeeId={profile?.employee_id ?? ""} />;
}
