"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Upload, Download, Trash2, Plus, BookOpen, FolderOpen } from "lucide-react";

type HRDoc = {
  id: string;
  name: string;
  file_path: string;
  category: string;
  size_bytes: number | null;
  uploaded_at: string;
};

const CATEGORIES = [
  { value: "handbook", label: "Employee Handbook", icon: "📘" },
  { value: "policy", label: "Policy", icon: "📋" },
  { value: "sop", label: "SOP", icon: "📄" },
  { value: "form", label: "Internal Form", icon: "📝" },
  { value: "contract_template", label: "Contract Template", icon: "✍️" },
  { value: "other", label: "Other", icon: "📁" },
];

export default function HRDocumentLibrary({ isAdmin }: { isAdmin: boolean }) {
  const supabase = createClient();
  const [docs, setDocs] = useState<HRDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("policy");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadDocs(); }, []); // eslint-disable-line

  async function loadDocs() {
    setLoading(true);
    const { data } = await supabase.from("hr_documents").select("*").order("uploaded_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Upload failed");
      }
      await loadDocs();
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function download(doc: HRDoc) {
    const res = await fetch(`/api/documents?path=${encodeURIComponent(doc.file_path)}`);
    const { url } = await res.json();
    if (url) window.open(url, "_blank");
  }

  async function deleteDoc(doc: HRDoc) {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: doc.id, file_path: doc.file_path }),
    });
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const filtered = activeCategory ? docs.filter(d => d.category === activeCategory) : docs;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR Document Library</h1>
          <p className="text-sm text-gray-500 mt-1">Policies, handbooks, SOPs and internal forms</p>
        </div>
        {isAdmin && (
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {uploading ? "Uploading…" : "Upload Document"}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Upload size={15} /> Upload New Document</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-secondary flex items-center gap-2 h-[42px]">
              <Upload size={15} /> Choose File
            </button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!activeCategory ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          All ({docs.length})
        </button>
        {CATEGORIES.map(c => {
          const count = docs.filter(d => d.category === c.value).length;
          if (count === 0) return null;
          return (
            <button key={c.value} onClick={() => setActiveCategory(c.value === activeCategory ? null : c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === c.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {c.icon} {c.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No documents yet.{isAdmin ? " Upload one above." : ""}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(doc => {
            const cat = CATEGORIES.find(c => c.value === doc.category);
            return (
              <div key={doc.id} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                <span className="text-2xl">{cat?.icon ?? "📄"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {cat?.label ?? doc.category}
                    {doc.size_bytes ? ` · ${formatSize(doc.size_bytes)}` : ""}
                    {" · "}
                    {new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <button onClick={() => download(doc)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Download">
                  <Download size={15} className="text-gray-400" />
                </button>
                {isAdmin && (
                  <button onClick={() => deleteDoc(doc)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Delete">
                    <Trash2 size={15} className="text-red-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
