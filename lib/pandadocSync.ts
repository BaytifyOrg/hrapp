import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentStatus, downloadSignedDocument } from "@/lib/pandadoc";
import { sendPandaDocSignedNotification, sendOnboardingLinkEmail } from "@/lib/email";
import crypto from "crypto";

// Shared by the manual "refresh status" button and the background cron sync —
// both just need to pull the latest status and, the first time a document
// completes, store the signed PDF and notify the admin.
export async function syncPandaDocDocument(
  admin: ReturnType<typeof createAdminClient>,
  documentId: string
): Promise<string> {
  const status = await getDocumentStatus(documentId);
  const update: Record<string, unknown> = { status };

  if (status === "document.completed") {
    const { data: doc } = await admin
      .from("pandadoc_documents")
      .select("employee_id, name, pdf_path")
      .eq("pandadoc_document_id", documentId)
      .single();

    if (doc && !doc.pdf_path) {
      const pdf = await downloadSignedDocument(documentId);
      const path = `${doc.employee_id}/pandadoc-${documentId}.pdf`;
      await admin.storage.from("employee-docs").upload(path, pdf, { contentType: "application/pdf", upsert: true });
      update.pdf_path = path;
      update.completed_at = new Date().toISOString();

      const { data: employee } = await admin
        .from("employees")
        .select("first_name, last_name, email, status")
        .eq("id", doc.employee_id)
        .single();

      try {
        await sendPandaDocSignedNotification({
          employeeName: employee ? `${employee.first_name} ${employee.last_name}` : "An employee",
          documentName: doc.name,
          pdfBuffer: pdf,
          pdfFilename: `${doc.name}.pdf`,
        });
      } catch {}

      // Move them into onboarding and email them a personalized link to
      // complete their own details, unless they're already an active employee.
      if (employee && employee.status !== "active") {
        const onboardingToken = crypto.randomBytes(24).toString("hex");
        await admin
          .from("employees")
          .update({ status: "onboarding", onboarding_token: onboardingToken, onboarding_sent_at: new Date().toISOString() })
          .eq("id", doc.employee_id);

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        try {
          await sendOnboardingLinkEmail({
            to: employee.email,
            name: employee.first_name,
            onboardingUrl: `${appUrl}/onboard?token=${onboardingToken}`,
          });
        } catch {}
      }
    }
  }

  await admin.from("pandadoc_documents").update(update).eq("pandadoc_document_id", documentId);
  return status;
}
