import { createAdminClient } from "@/lib/supabase/admin";
import { syncPandaDocDocument } from "@/lib/pandadocSync";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Kept for when the PandaDoc plan supports webhooks — the free plan doesn't,
// so /api/cron/pandadoc-sync and the manual refresh button carry this for now.
function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PANDADOC_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-pandadoc-signature");
  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = JSON.parse(rawBody);
  const admin = createAdminClient();

  for (const event of Array.isArray(events) ? events : [events]) {
    const documentId = event.data?.id;
    if (!documentId) continue;
    try {
      await syncPandaDocDocument(admin, documentId);
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
