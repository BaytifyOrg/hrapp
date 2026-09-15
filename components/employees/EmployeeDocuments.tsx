"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, Download, Trash2, Plus } from "lucide-react";

type Doc = {
  id: string;
  name: string;
  file_path: string;
  category: string;
  size_bytes: number | null;
  uploaded_at: string;
};

const CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "passport", label: "Passport" },
  { value: "emirates_id", label: "Emirates ID" },
  { value: "visa", label: "Visa" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

export default function EmployeeDocuments({ employeeId }: { employeeId: string }) {
  const supabase = createClient();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("other");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function loadDocs() {
    setLoading(true);
    const { data } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("employee_id", employeeId)
      .order("uploaded_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const path = `${employeeId}/${Date.now()}-${file.name}`;

      const { error: storageError } = await supabase.storage
        .from("employee-docs")
        .upload(path, file);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("employee_documents")
        .insert({
          employee_id: employeeId,
          name: file.name,
          file_path: path,
          category,
          size_bytes: file.size,
        });

      if (dbError) throw dbError;
      await loadDocs();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function download(doc: Doc) {
    const { data } = await supabase.storage
      .from("employee-docs")
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await supabase.storage.from("employee-docs").remove([doc.file_path]);
    await supabase.from("employee_documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getCategoryLabel(val: string) {
    return CATEGORIES.find((c) => c.value === val)?.label ?? val;
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={16} /> Documents
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
        >
          <Plus size={14} />
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {/* Category picker */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-1 block">Document type</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input text-sm py-1.5"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleUpload(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-5 ${
          dragOver
            ? "border-gray-400 bg-gray-50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <Upload size={20} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">Drop a file here or click to browse</p>
        <p className="text-xs text-gray-300 mt-1">PDF, JPG, PNG, DOC, DOCX</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />

      {/* Document list */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <FileText size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                <p className="text-xs text-gray-400">
                  {getCategoryLabel(doc.category)}
                  {doc.size_bytes ? ` · ${formatSize(doc.size_bytes)}` : ""}
                  {" · "}
                  {new Date(doc.uploaded_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => download(doc)}
                className="p-1.5 rounded hover:bg-white transition-colors"
                title="Download"
              >
                <Download size={14} className="text-gray-400" />
              </button>
              <button
                onClick={() => deleteDoc(doc)}
                className="p-1.5 rounded hover:bg-white transition-colors"
                title="Delete"
              >
                <Trash2 size={14} className="text-red-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
