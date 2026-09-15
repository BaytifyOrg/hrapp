import { createClient } from "@/lib/supabase/server";
import MarketingRequests from "@/components/marketing/MarketingRequests";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role, employee_id").eq("id", user!.id).single();
  const { data: employees } = await supabase.from("employees").select("id, first_name, last_name").eq("status", "active").order("first_name");

  return <MarketingRequests isAdmin={profile?.role === "admin"} currentEmployeeId={profile?.employee_id} employees={employees ?? []} />;
}
