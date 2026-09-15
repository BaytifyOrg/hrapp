import { createAdminClient } from "@/lib/supabase/admin";
import { fillOfferLetterTemplate, dataUrlToPngBytes } from "@/lib/offerLetterPdf";
import { loadOfferLetterTemplate } from "@/lib/offerLetterTemplate";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SETTING_KEY = "offer_letter_employer_signature";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const admin = createAdminClient();
  const { data: candidate } = await admin.from("candidates").select("*").eq("id", id).single();
  if (!candidate || !candidate.offer_token || candidate.offer_token !== token) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }
  if (!candidate.offer_content) return NextResponse.json({ error: "No offer found for this link" }, { status: 404 });

  let pdfBuffer: Buffer;

  if (candidate.offer_status === "signed" && candidate.offer_pdf_path) {
    const { data, error } = await admin.storage.from("candidate-offers").download(candidate.offer_pdf_path);
    if (error || !data) return NextResponse.json({ error: "Could not load signed PDF" }, { status: 500 });
    pdfBuffer = Buffer.from(await data.arrayBuffer());
  } else {
    const { data: signatureRow } = await admin.from("app_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
    if (!signatureRow?.value) return NextResponse.json({ error: "Offer letter isn't ready to preview yet" }, { status: 500 });

    const content = candidate.offer_content as { candidateFullName: string; startDate: string; employerDate: string };
    try {
      const templateBytes = await loadOfferLetterTemplate(admin);
      pdfBuffer = await fillOfferLetterTemplate({
        templateBytes,
        data: { candidateFullName: content.candidateFullName, startDate: content.startDate, employerDate: content.employerDate },
        employerSignaturePng: dataUrlToPngBytes(signatureRow.value),
        candidateSignaturePng: null,
      });
    } catch (e) {
      return NextResponse.json({ error: `Could not generate preview: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 500 });
    }
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" },
  });
}
