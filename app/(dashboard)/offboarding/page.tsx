import { createClient } from "@/lib/supabase/server";
import OffboardingView from "@/components/offboarding/OffboardingView";

export const dynamic = "force-dynamic";

export default async function OffboardingPage() {
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name, job_title, department")
    .eq("status", "active")
    .order("first_name");

  return <OffboardingView employees={employees ?? []} />;
}
