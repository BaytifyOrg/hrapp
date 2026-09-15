import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AssetsManager from "@/components/assets/AssetsManager";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("status", "active")
    .order("first_name");

  return <AssetsManager employees={employees ?? []} />;
}
