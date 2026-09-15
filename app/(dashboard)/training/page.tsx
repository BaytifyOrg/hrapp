import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TrainingView from "@/components/training/TrainingView";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const [{ data: guides }, { data: progress }] = await Promise.all([
    supabase.from("training_guides").select("*").order("created_at", { ascending: false }),
    supabase.from("training_progress").select("guide_id, time_spent_seconds, completed_at").eq("user_id", user.id),
  ]);

  const completedGuideIds = (progress ?? []).map(p => p.guide_id);

  return (
    <TrainingView
      guides={guides ?? []}
      isAdmin={profile?.role === "admin"}
      userId={user.id}
      completedGuideIds={completedGuideIds}
    />
  );
}
