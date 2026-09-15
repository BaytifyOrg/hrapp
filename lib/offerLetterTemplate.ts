import { createAdminClient } from "@/lib/supabase/admin";

const TEMPLATE_PATH = "templates/offer-letter-template.pdf";

export async function loadOfferLetterTemplate(admin: ReturnType<typeof createAdminClient>): Promise<Uint8Array> {
  const { data, error } = await admin.storage.from("hr-docs").download(TEMPLATE_PATH);
  if (error || !data) {
    throw new Error("Offer letter template not found in Storage (hr-docs/templates/offer-letter-template.pdf)");
  }
  return new Uint8Array(await data.arrayBuffer());
}
