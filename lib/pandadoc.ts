const BASE_URL = "https://api.pandadoc.com/public/v1";

function authHeaders() {
  return {
    Authorization: `API-Key ${process.env.PANDADOC_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function listTemplates(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${BASE_URL}/templates`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`PandaDoc template list failed: ${await res.text()}`);
  const data = await res.json();
  return (data.results ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }));
}

// Templates with more than one signer role would need the caller to choose —
// we only support single-role templates for now, so we just take the first one.
export async function getTemplateDetails(templateId: string): Promise<{ role?: string; tokens: string[] }> {
  const res = await fetch(`${BASE_URL}/templates/${templateId}/details`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`PandaDoc template details failed: ${await res.text()}`);
  const data = await res.json();
  return {
    role: data.roles?.[0]?.name,
    tokens: (data.tokens ?? []).map((t: { name: string }) => t.name),
  };
}

export async function createDocumentFromTemplate({
  templateId,
  name,
  recipientEmail,
  recipientFirstName,
  recipientLastName,
  tokens,
}: {
  templateId: string;
  name: string;
  recipientEmail: string;
  recipientFirstName: string;
  recipientLastName: string;
  tokens?: { name: string; value: string }[];
}): Promise<string> {
  const { role } = await getTemplateDetails(templateId);

  const res = await fetch(`${BASE_URL}/documents`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      template_uuid: templateId,
      recipients: [
        { email: recipientEmail, first_name: recipientFirstName, last_name: recipientLastName, role },
      ],
      tokens: tokens ?? [],
    }),
  });
  if (!res.ok) throw new Error(`PandaDoc document creation failed: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

export async function getDocumentStatus(documentId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/documents/${documentId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`PandaDoc status check failed: ${await res.text()}`);
  const data = await res.json();
  return data.status;
}

// PandaDoc builds the document from the template asynchronously — it isn't
// sendable until it reaches "document.draft".
export async function waitForDocumentDraft(documentId: string, { attempts = 10, delayMs = 2000 } = {}): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const status = await getDocumentStatus(documentId);
    if (status === "document.draft") return;
    if (status === "document.error") throw new Error("PandaDoc failed to generate the document from the template");
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Timed out waiting for PandaDoc to finish generating the document");
}

export async function sendDocument(documentId: string, { subject, message }: { subject: string; message: string }): Promise<void> {
  const res = await fetch(`${BASE_URL}/documents/${documentId}/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ subject, message, silent: false }),
  });
  if (!res.ok) throw new Error(`PandaDoc send failed: ${await res.text()}`);
}

export async function downloadSignedDocument(documentId: string): Promise<Buffer> {
  const res = await fetch(`${BASE_URL}/documents/${documentId}/download`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`PandaDoc download failed: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
