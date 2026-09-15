import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDocumentFromTemplate, waitForDocumentDraft } from "@/lib/pandadoc";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateId, tokens } = await req.json();
  if (!templateId) return NextResponse.json({ error: "Missing templateId" }, { status: 400 });

  const admin = createAdminClient();
  const { data: employee } = await admin.from("employees").select("*").eq("id", id).single();
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const name = `${employee.first_name} ${employee.last_name} — Document`;

  try {
    const documentId = await createDocumentFromTemplate({
      templateId,
      name,
      recipientEmail: employee.email,
      recipientFirstName: employee.first_name,
      recipientLastName: employee.last_name,
      tokens,
    });

    // We deliberately don't send the document here — it needs a human (you)
    // to open it in PandaDoc, add your own signature/date, and send it from there.
    await waitForDocumentDraft(documentId);

    const { error: insertError } = await admin.from("pandadoc_documents").insert({
      employee_id: id,
      pandadoc_document_id: documentId,
      name,
      status: "document.draft",
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ ok: true, documentId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
