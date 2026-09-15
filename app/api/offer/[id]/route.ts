import { createAdminClient } from "@/lib/supabase/admin";
import { fillOfferLetterTemplate, dataUrlToPngBytes } from "@/lib/offerLetterPdf";
import { loadOfferLetterTemplate } from "@/lib/offerLetterTemplate";
import { sendOfferSignedNotification } from "@/lib/email";
import { logActivity } from "@/lib/candidateActivity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SETTING_KEY = "offer_letter_employer_signature";

async function loadCandidateByToken(admin: ReturnType<typeof createAdminClient>, id: string, token: string) {
  const { data: candidate } = await admin.from("candidates").select("*").eq("id", id).single();
  if (!candidate || !candidate.offer_token || candidate.offer_token !== token) return null;
  return candidate;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const admin = createAdminClient();
  const candidate = await loadCandidateByToken(admin, id, token);
  if (!candidate) return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  if (!candidate.offer_content) return NextResponse.json({ error: "No offer found for this link" }, { status: 404 });

  return NextResponse.json({
    name: candidate.first_name,
    signed: candidate.offer_status === "signed",
    signedAt: candidate.offer_signed_at,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, signature } = await req.json();
  if (!token || !signature) return NextResponse.json({ error: "Missing token or signature" }, { status: 400 });

  const admin = createAdminClient();
  const candidate = await loadCandidateByToken(admin, id, token);
  if (!candidate) return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  if (!candidate.offer_content) return NextResponse.json({ error: "No offer found for this link" }, { status: 404 });
  if (candidate.offer_status === "signed") return NextResponse.json({ error: "This offer has already been signed" }, { status: 400 });

  const { data: signatureRow } = await admin.from("app_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
  if (!signatureRow?.value) return NextResponse.json({ error: "This offer can't be signed right now — please contact us." }, { status: 500 });

  const candidateName = `${candidate.first_name} ${candidate.last_name}`.trim();
  const candidateDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
  const content = candidate.offer_content as { candidateFullName: string; startDate: string; employerDate: string };

  let pdfBuffer: Buffer;
  try {
    const templateBytes = await loadOfferLetterTemplate(admin);
    pdfBuffer = await fillOfferLetterTemplate({
      templateBytes,
      data: { candidateFullName: content.candidateFullName, startDate: content.startDate, employerDate: content.employerDate, candidateDate },
      employerSignaturePng: dataUrlToPngBytes(signatureRow.value),
      candidateSignaturePng: dataUrlToPngBytes(signature),
    });
  } catch (e) {
    return NextResponse.json({ error: `Could not generate the signed PDF: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 500 });
  }

  const signedDateSlug = candidateDate.replace(/\./g, "-");
  const filename = `offer-letter-${candidate.first_name.toLowerCase()}-${candidate.last_name.toLowerCase()}-${signedDateSlug}.pdf`;
  const path = `${id}/${Date.now()}-${filename}`;

  const { error: storageError } = await admin.storage.from("candidate-offers").upload(path, pdfBuffer, { contentType: "application/pdf" });
  if (storageError) return NextResponse.json({ error: `Could not save the signed offer: ${storageError.message}` }, { status: 500 });

  const { error: updateErr } = await admin.from("candidates").update({
    offer_status: "signed",
    offer_pdf_path: path,
    offer_signed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  await logActivity(admin, id, "note", {
    body_snippet: `Offer letter signed by candidate on ${candidateDate}`,
    metadata: { offer_signed: true },
  });

  try {
    await sendOfferSignedNotification({
      candidateName,
      positionApplied: candidate.position_applied ?? undefined,
      pdfBuffer,
      pdfFilename: filename,
    });
  } catch {}

  return NextResponse.json({ success: true });
}
