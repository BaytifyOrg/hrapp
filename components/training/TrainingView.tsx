"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, BookOpen, Video, Link2, FileText, Edit2, Trash2, X, ExternalLink, Download, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

type Guide = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  external_url: string | null;
  doc_path: string | null;
  published: boolean;
  created_at: string;
};

const CATEGORIES = [
  "Company Policies",
  "Sales Process",
  "Leasing Process",
  "Off-Plan",
  "Compliance & Legal",
  "CRM & Tools",
  "Admin Procedures",
  "Dubai Resources",
  "Real Estate Knowledge",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Company Policies": "bg-blue-100 text-blue-700",
  "Sales Process": "bg-green-100 text-green-700",
  "Leasing Process": "bg-amber-100 text-amber-700",
  "Off-Plan": "bg-purple-100 text-purple-700",
  "Compliance & Legal": "bg-red-100 text-red-700",
  "CRM & Tools": "bg-cyan-100 text-cyan-700",
  "Admin Procedures": "bg-gray-100 text-gray-700",
  "Dubai Resources": "bg-orange-100 text-orange-700",
  "Real Estate Knowledge": "bg-teal-100 text-teal-700",
  "Other": "bg-gray-100 text-gray-600",
};

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const emptyForm = { title: "", category: "Company Policies", description: "", content: "", video_url: "", external_url: "", doc_path: "" };

export default function TrainingView({ guides: initial, isAdmin, userId, completedGuideIds: initialCompleted }: {
  guides: Guide[];
  isAdmin: boolean;
  userId: string;
  completedGuideIds: string[];
}) {
  const supabase = createClient();
  const [guides, setGuides] = useState<Guide[]>(initial);
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<Set<string>>(new Set(initialCompleted));
  const [markingId, setMarkingId] = useState<string | null>(null);
  const openedAtRef = useRef<Record<string, number>>({});

  const allCategories = ["All", ...Array.from(new Set(guides.map(g => g.category)))];
  const filtered = activeCategory === "All" ? guides : guides.filter(g => g.category === activeCategory);

  function openCreate() {
    setEditingGuide(null);
    setForm(emptyForm);
    setPdfFile(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(guide: Guide) {
    setEditingGuide(guide);
    setForm({
      title: guide.title,
      category: guide.category,
      description: guide.description ?? "",
      content: guide.content ?? "",
      video_url: guide.video_url ?? "",
      external_url: guide.external_url ?? "",
      doc_path: guide.doc_path ?? "",
    });
    setPdfFile(null);
    setError("");
    setShowForm(true);
  }

  async function uploadPdf(guideId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("guideId", guideId);
    const res = await fetch("/api/training/upload", { method: "POST", body: form });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "PDF upload failed");
    }
    const { path } = await res.json();
    return path;
  }

  async function save() {
    if (!form.title.trim()) { setError("Please enter a title."); return; }
    setLoading(true); setError("");
    try {
      let docPath = form.doc_path;

      if (editingGuide) {
        // Upload PDF first if new one selected
        if (pdfFile) docPath = await uploadPdf(editingGuide.id, pdfFile);
        const res = await fetch(`/api/training/${editingGuide.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, doc_path: docPath }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setLoading(false); return; }
        setGuides(g => g.map(x => x.id === editingGuide.id ? data : x));
      } else {
        // Create guide first to get ID, then upload PDF
        const res = await fetch("/api/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, doc_path: null }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setLoading(false); return; }
        if (pdfFile) {
          const path = await uploadPdf(data.id, pdfFile);
          await fetch(`/api/training/${data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, doc_path: path }),
          });
          data.doc_path = path;
        }
        setGuides(g => [data, ...g]);
      }

      setShowForm(false);
      setEditingGuide(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setLoading(false);
  }

  async function deleteGuide(id: string) {
    if (!confirm("Delete this guide? This cannot be undone.")) return;
    await fetch(`/api/training/${id}`, { method: "DELETE" });
    setGuides(g => g.filter(x => x.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function handleExpand(guideId: string) {
    if (expandedId === guideId) {
      setExpandedId(null);
    } else {
      setExpandedId(guideId);
      openedAtRef.current[guideId] = Date.now();
    }
  }

  async function markComplete(guideId: string) {
    setMarkingId(guideId);
    const openedAt = openedAtRef.current[guideId];
    const timeSpent = openedAt ? Math.round((Date.now() - openedAt) / 1000) : null;
    await fetch("/api/training/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guide_id: guideId, time_spent_seconds: timeSpent }),
    });
    setCompleted(c => new Set([...c, guideId]));
    setMarkingId(null);
  }

  async function getDocUrl(path: string) {
    const res = await fetch(`/api/training/upload?path=${encodeURIComponent(path)}`);
    const { url } = await res.json();
    if (url) window.open(url, "_blank");
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training</h1>
          <p className="text-sm text-gray-500 mt-1">{guides.length} guide{guides.length !== 1 ? "s" : ""} available</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New Guide
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeCategory === cat
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-500 hover:border-gray-400 bg-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{editingGuide ? "Edit Guide" : "New Training Guide"}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Title *</label>
                <input className="input" placeholder="e.g. How to use the CRM" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Short Description</label>
                <input className="input" placeholder="One line summary" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Written Content</label>
              <textarea className="input" rows={6} placeholder="Write your guide content here…" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1.5"><Video size={13} /> Video URL (YouTube / Loom)</label>
                <input className="input" placeholder="https://youtube.com/watch?v=…" value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} />
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><Link2 size={13} /> External Link</label>
                <input className="input" placeholder="https://…" value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} />
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><FileText size={13} /> Upload PDF</label>
                <input type="file" accept=".pdf" className="input text-sm" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
                {form.doc_path && !pdfFile && <p className="text-xs text-gray-400 mt-1">Current PDF will be kept unless you upload a new one.</p>}
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={save} disabled={loading} className="btn-primary">{loading ? "Saving…" : editingGuide ? "Save Changes" : "Publish Guide"}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Guides */}
      {!filtered.length ? (
        <div className="card text-center py-16">
          <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">{isAdmin ? "No guides yet. Click \"New Guide\" to create your first one." : "No training guides available yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(guide => {
            const isExpanded = expandedId === guide.id;
            const isCompleted = completed.has(guide.id);
            const ytId = guide.video_url ? getYouTubeId(guide.video_url) : null;
            const isLoomOrOther = guide.video_url && !ytId;

            return (
              <div key={guide.id} className={`card ${isCompleted ? "border-green-200" : ""}`}>
                {/* Guide header */}
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`badge text-xs ${CATEGORY_COLORS[guide.category] ?? "bg-gray-100 text-gray-600"}`}>
                        {guide.category}
                      </span>
                      {guide.video_url && <span className="badge bg-red-50 text-red-600 text-xs flex items-center gap-1"><Video size={10} /> Video</span>}
                      {guide.external_url && <span className="badge bg-blue-50 text-blue-600 text-xs flex items-center gap-1"><Link2 size={10} /> Link</span>}
                      {guide.doc_path && <span className="badge bg-orange-50 text-orange-600 text-xs flex items-center gap-1"><FileText size={10} /> PDF</span>}
                      {isCompleted && <span className="badge bg-green-100 text-green-700 text-xs flex items-center gap-1"><CheckCircle size={10} /> Completed</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900">{guide.title}</h3>
                    {guide.description && <p className="text-sm text-gray-500 mt-0.5">{guide.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(guide)} className="text-gray-400 hover:text-gray-600 transition-colors"><Edit2 size={15} /></button>
                        <button onClick={() => deleteGuide(guide.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                      </>
                    )}
                    <button
                      onClick={() => handleExpand(guide.id)}
                      className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                      style={{ color: "#232D3E" }}
                    >
                      {isExpanded ? <><ChevronUp size={16} /> Close</> : <><ChevronDown size={16} /> Read</>}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {/* Written content */}
                    {guide.content && (
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-xl px-4 py-4">
                        {guide.content}
                      </div>
                    )}

                    {/* YouTube embed */}
                    {ytId && (
                      <div className="rounded-xl overflow-hidden aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    )}

                    {/* Loom / other video link */}
                    {isLoomOrOther && (
                      <a href={guide.video_url!} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 bg-red-50 rounded-xl px-4 py-3 w-fit">
                        <Video size={16} /> Watch Video <ExternalLink size={13} />
                      </a>
                    )}

                    {/* External link */}
                    {guide.external_url && (
                      <a href={guide.external_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 rounded-xl px-4 py-3 w-fit">
                        <ExternalLink size={16} /> Open External Link
                      </a>
                    )}

                    {/* PDF download */}
                    {guide.doc_path && (
                      <button onClick={() => getDocUrl(guide.doc_path!)}
                        className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-800 bg-orange-50 rounded-xl px-4 py-3">
                        <Download size={16} /> Download PDF
                      </button>
                    )}

                    {/* Mark as complete */}
                    <div className="pt-2 border-t border-gray-100">
                      {isCompleted ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                          <CheckCircle size={16} /> Guide completed
                        </div>
                      ) : (
                        <button
                          onClick={() => markComplete(guide.id)}
                          disabled={markingId === guide.id}
                          className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                          style={{ backgroundColor: "#232D3E" }}
                        >
                          <CheckCircle size={15} />
                          {markingId === guide.id ? "Saving…" : "Mark as complete"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
