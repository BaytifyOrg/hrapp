import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminCommissionsView from "@/components/commissions/AdminCommissionsView";
import BrokerCommissionsView from "@/components/commissions/BrokerCommissionsView";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, employee_id")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    const { data: deals } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: employees } = await supabase
      .from("employees")
      .select("id, first_name, last_name, commission_split")
      .eq("status", "active");

    const employeeIds = [...new Set((deals ?? []).map(d => d.employee_id).filter(Boolean))];
    const { data: empNames } = employeeIds.length
      ? await supabase.from("employees").select("id, first_name, last_name").in("id", employeeIds)
      : { data: [] };

    const merged = (deals ?? []).map(d => ({
      ...d,
      employees: (empNames ?? []).find(e => e.id === d.employee_id) ?? null,
    }));

    return (
      <AdminCommissionsView
        deals={merged}
        employees={(employees ?? []).map(e => ({ ...e, commission_split: e.commission_split ?? 50 }))}
      />
    );
  }

  return <BrokerCommissionsView employeeId={profile?.employee_id ?? ""} />;
}
