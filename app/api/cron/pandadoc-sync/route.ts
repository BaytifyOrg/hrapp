import { createAdminClient } from "@/lib/supabase/admin";
import { syncPandaDocDocument } from "@/lib/pandadocSync";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FINAL_STATUSES = ["document.completed", "document.declined", "document.voided"];

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: docs } = await admin
    .from("pandadoc_documents")
    .select("pandadoc_document_id")
    .not("status", "in", `(${FINAL_STATUSES.join(",")})`);

  const results = await Promise.allSettled(
    (docs ?? []).map((d) => syncPandaDocDocument(admin, d.pandadoc_document_id))
  );

  return NextResponse.json({
    checked: results.length,
    updated: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  });
}
