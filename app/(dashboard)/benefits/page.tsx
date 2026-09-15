import { createClient } from "@/lib/supabase/server";
import BenefitsCenter from "@/components/benefits/BenefitsCenter";

export const dynamic = "force-dynamic";

export default async function BenefitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role, employee_id").eq("id", user!.id).single();
  const { data: employees } = await supabase.from("employees").select("id, first_name, last_name, department").eq("status", "active").order("first_name");

  return <BenefitsCenter isAdmin={profile?.role === "admin"} employeeId={profile?.employee_id} employees={employees ?? []} />;
}
