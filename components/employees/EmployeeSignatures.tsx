"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileSignature, Send, Clock, CheckCircle2, RefreshCw } from "lucide-react";

type Template = { id: string; name: string };
type SignatureDoc = {
  id: string;
  pandadoc_document_id: string;
  name: string;
  status: string;
  pdf_path: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  "document.draft": "Preparing",
  "document.sent": "Sent — awaiting signature",
  "document.viewed": "Viewed",
  "document.completed": "Signed",
  "document.declined": "Declined",
  "document.expired": "Expired",
};

export default function EmployeeSignatures({ employeeId }: { employeeId: string }) {
  const supabase = createClient();
  const [docs, setDocs] = useState<SignatureDoc[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [tokenNames, setTokenNames] = useState<string[]>([]);
  const [tokenValues, setTokenValues] = useState<Record<string, string>>({});
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function loadDocs() {
    setLoading(true);
    const { data } = await supabase
      .from("pandadoc_documents")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  }

  async function openForm() {
    setShowForm(true);
    setSuccess(false);
    setError(null);
    if (templates.length > 0) return;
    const res = await fetch("/api/pandadoc/templates");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load templates");
      return;
    }
    setTemplates(data.templates);
    if (data.templates[0]) selectTemplate(data.templates[0].id);
  }

  async function selectTemplate(id: string) {
    setTemplateId(id);
    setTokenNames([]);
    setTokenValues({});
    setLoadingTokens(true);
    setError(null);
    try {
      const res = await fetch(`/api/pandadoc/templates/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load template fields");
      setTokenNames(data.tokens ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load template fields");
    } finally {
      setLoadingTokens(false);
    }
  }

  async function send() {
    if (!templateId) return;
    setSending(true);
    setError(null);
    try {
      const tokens = tokenNames
        .filter((name) => tokenValues[name])
        .map((name) => ({ name, value: tokenValues[name] }));

      const res = await fetch(`/api/employees/${employeeId}/send-for-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create document");
      setSuccess(true);
      await loadDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create document");
    } finally {
      setSending(false);
    }
  }

  async function refreshStatus(doc: SignatureDoc) {
    setRefreshingId(doc.id);
    try {
      await fetch(`/api/pandadoc/documents/${doc.pandadoc_document_id}/status`);
      await loadDocs();
    } finally {
      setRefreshingId(null);
    }
  }

  async function downloadSigned(doc: SignatureDoc) {
    if (!doc.pdf_path) return;
    const { data } = await supabase.storage.from("employee-docs").createSignedUrl(doc.pdf_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileSignature size={16} /> Signatures
        </h2>
        <button onClick={openForm} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
          <Send size={14} /> Prepare Document
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-lg border border-gray-100 bg-gray-50 space-y-3">
          {success ? (
            <>
              <p className="text-sm text-gray-700">
                Document created in PandaDoc as a draft. Open PandaDoc, add your own signature/date and fill in
                anything left, then click <strong>Send</strong> there — status will update here once you do
                (use the refresh icon below).
              </p>
              <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5 px-3">
                Done
              </button>
            </>
          ) : (
            <>
              {templates.length === 0 && !error ? (
                <p className="text-sm text-gray-400">Loading templates…</p>
              ) : (
                <select
                  value={templateId}
                  onChange={(e) => selectTemplate(e.target.value)}
                  className="input text-sm py-1.5"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}

              {loadingTokens && <p className="text-xs text-gray-400">Loading fields…</p>}

              {tokenNames.length > 0 && (
                <div className="space-y-2">
                  {tokenNames.map((name) => (
                    <div key={name}>
                      <label className="text-xs text-gray-400 mb-1 block capitalize">
                        {name.replace(/_/g, " ")}
                      </label>
                      <input
                        type="text"
                        value={tokenValues[name] ?? ""}
                        onChange={(e) => setTokenValues((prev) => ({ ...prev, [name]: e.target.value }))}
                        className="input text-sm py-1.5"
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2">
                <button onClick={send} disabled={sending || !templateId} className="btn-primary text-xs py-1.5 px-3">
                  {sending ? "Creating…" : "Create Document"}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5 px-3">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400">No documents sent yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
              {doc.status === "document.completed" ? (
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
              ) : (
                <Clock size={16} className="text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                <p className="text-xs text-gray-400">{STATUS_LABELS[doc.status] ?? doc.status}</p>
              </div>
              {doc.pdf_path ? (
                <button onClick={() => downloadSigned(doc)} className="text-xs text-blue-600 hover:underline">
                  Download
                </button>
              ) : (
                <button
                  onClick={() => refreshStatus(doc)}
                  disabled={refreshingId === doc.id}
                  className="p-1.5 rounded hover:bg-white transition-colors"
                  title="Refresh status"
                >
                  <RefreshCw size={14} className={`text-gray-400 ${refreshingId === doc.id ? "animate-spin" : ""}`} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
