import { createClient } from "@/lib/supabase/server";
import HRDocumentLibrary from "@/components/documents/HRDocumentLibrary";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  return <HRDocumentLibrary isAdmin={profile?.role === "admin"} />;
}
