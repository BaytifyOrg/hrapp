import { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  admin: SupabaseClient,
  candidateId: string,
  type: "email_sent" | "email_received" | "stage_change" | "note",
  fields: { subject?: string; body_snippet?: string; metadata?: Record<string, unknown> } = {}
) {
  await admin.from("candidate_activity").insert({
    candidate_id: candidateId,
    type,
    subject: fields.subject ?? null,
    body_snippet: fields.body_snippet ?? null,
    metadata: fields.metadata ?? null,
  });
}
