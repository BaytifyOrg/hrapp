"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Plus, X, FileText, Trash2, Star, Search, Loader2, Video, Mail, MailOpen, ArrowRightLeft, History, Phone, Tag, UserX, Link2, ClipboardList, Mic, Square, StickyNote, FileSignature, PenLine, RotateCcw, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type SignaturePad from "signature_pad";

type ActivityEntry = {
  id: string;
  type: "email_sent" | "email_received" | "stage_change" | "note" | "call";
  subject: string | null;
  body_snippet: string | null;
  created_at: string;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

const TEMPLATE_PLACEHOLDERS: { token: string; label: string }[] = [
  { token: "{{first_name}}", label: "First name" },
  { token: "{{last_name}}", label: "Last name" },
  { token: "{{position_applied}}", label: "Position applied for" },
];

function resolvePlaceholders(text: string, candidate: Candidate): string {
  return text
    .replaceAll("{{first_name}}", candidate.first_name || "")
    .replaceAll("{{last_name}}", candidate.last_name || "")
    .replaceAll("{{position_applied}}", candidate.position_applied || "the role");
}

const TAG_OPTIONS = ["Hot lead", "Not right now", "Keep on file", "Strong candidate", "Needs follow-up"];

const INTERVIEW_QUESTIONS: { key: string; label: string }[] = [
  { key: "overall_impression", label: "Overall impression" },
  { key: "strengths", label: "Strengths" },
  { key: "concerns", label: "Concerns / red flags" },
  { key: "salary_expectations", label: "Salary / relocation budget confirmed" },
  { key: "availability", label: "Availability / start date" },
  { key: "recommendation", label: "Recommendation" },
];

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position_applied: string | null;
  source: string | null;
  stage: string;
  cv_file_path: string | null;
  cv_file_name: string | null;
  notes: string | null;
  rating: number | null;
  created_at: string;
  interview_at: string | null;
  interview_zoom_url: string | null;
  interview_invite_sent_at: string | null;
  tags: string[] | null;
  interview_notes: Record<string, string> | null;
  scheduling_token: string | null;
  talent_pool: boolean;
  offer_token: string | null;
  offer_status: "sent" | "signed" | null;
  offer_content: OfferContent | null;
  offer_sent_at: string | null;
  offer_signed_at: string | null;
};

type OfferContent = {
  candidateFullName: string;
  startDate: string;
  employerDate: string;
};

// Minimal ambient types for the Web Speech API (not part of the standard DOM lib).
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { resultIndex: number; results: { [i: number]: { isFinal: boolean; [j: number]: { transcript: string } }; length: number } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const DICTATION_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was blocked — check your browser's site permissions.",
  "no-speech": "Didn't hear anything — try again.",
  "audio-capture": "No microphone found.",
  network: "Network issue with speech recognition — try again.",
  aborted: "",
};

// Free, browser-native speech-to-text dictation (Chrome/Edge/Safari only — no
// external API, no cost). Appends each finalized chunk of speech via onFinalText.
function useDictation(onFinalText: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const isSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  function start() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    // A previous session that hasn't fully torn down yet can make the browser's
    // speech engine silently reject a new one — force-clear it first.
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setError(null);

    const recognition: SpeechRecognitionLike = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-GB";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript.trim()) onFinalText(finalTranscript.trim());
    };
    recognition.onerror = (event) => {
      const message = DICTATION_ERROR_MESSAGES[event.error] ?? `Speech recognition error: ${event.error}`;
      if (message) setError(message);
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      // Browser rejected starting a new session immediately (e.g. one was still
      // closing) — a moment's retry almost always succeeds.
      recognitionRef.current = null;
      setTimeout(() => {
        try {
          recognitionRef.current = recognition;
          recognition.start();
          setIsRecording(true);
        } catch {
          setError("Couldn't start the microphone — try clicking Dictate again.");
        }
      }, 300);
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  return { isRecording, isSupported, start, stop, error, clearError: () => setError(null) };
}

const STAGES: { value: string; label: string; badge: string; header: string }[] = [
  { value: "new", label: "New", badge: "bg-gray-100 text-gray-600", header: "border-gray-300" },
  { value: "contacted", label: "Contacted", badge: "bg-blue-100 text-blue-700", header: "border-blue-300" },
  { value: "follow_up", label: "Follow Up", badge: "bg-teal-100 text-teal-700", header: "border-teal-300" },
  { value: "interview_1", label: "1st Interview", badge: "bg-purple-100 text-purple-700", header: "border-purple-300" },
  { value: "interview_2", label: "2nd Interview", badge: "bg-indigo-100 text-indigo-700", header: "border-indigo-300" },
  { value: "offer", label: "Offer", badge: "bg-amber-100 text-amber-700", header: "border-amber-300" },
  { value: "hired", label: "Hired", badge: "bg-green-100 text-green-700", header: "border-green-300" },
  { value: "rejected", label: "Rejected", badge: "bg-red-100 text-red-700", header: "border-red-300" },
];

function fullName(c: Candidate) {
  return `${c.first_name} ${c.last_name}`.trim();
}

export default function RecruitmentBoard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [view, setView] = useState<"pipeline" | "talent_pool">("pipeline");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplatesManager, setShowTemplatesManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); loadTemplates(); }, []);

  async function loadTemplates() {
    const res = await fetch("/api/recruitment/templates");
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/recruitment");
    const data = await res.json();
    setCandidates(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    setUploadSummary(null);

    const formData = new FormData();
    list.forEach((f) => formData.append("files", f));
    if (view === "talent_pool") formData.append("talent_pool", "true");

    const res = await fetch("/api/recruitment/upload", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);

    const createdCount = data.created?.length ?? 0;
    const failedCount = data.failed?.length ?? 0;
    const duplicateCount = data.duplicates?.length ?? 0;
    const parts = [`${createdCount} candidate${createdCount === 1 ? "" : "s"} added`];
    if (duplicateCount) parts.push(`${duplicateCount} already existed (skipped)`);
    if (failedCount) parts.push(`${failedCount} failed`);
    setUploadSummary(parts.join(", "));
    load();
  }

  async function updateCandidate(id: string, patch: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const res = await fetch(`/api/recruitment/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data && !data.error) {
      setCandidates((prev) => prev.map((c) => (c.id === id ? data : c)));
      if (selected?.id === id) setSelected(data);
    }
  }

  async function deleteCandidate(id: string) {
    if (!confirm("Delete this candidate? This can't be undone.")) return;
    await fetch(`/api/recruitment/${id}`, { method: "DELETE" });
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
  }

  async function viewCv(path: string) {
    const res = await fetch(`/api/recruitment/upload?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  async function attachCv(candidateId: string, file: File) {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("candidate_id", candidateId);
    const res = await fetch("/api/recruitment/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.candidate) {
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? data.candidate : c)));
      setSelected(data.candidate);
    }
  }

  async function scheduleInterview(candidateId: string, payload: { interview_at: string; duration_minutes: number }) {
    const res = await fetch(`/api/recruitment/${candidateId}/interview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.candidate) {
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? data.candidate : c)));
      setSelected(data.candidate);
    }
    return data;
  }

  async function rejectCandidate(candidateId: string) {
    const res = await fetch(`/api/recruitment/${candidateId}/reject`, { method: "POST" });
    const data = await res.json();
    if (data.candidate) {
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? data.candidate : c)));
      setSelected(data.candidate);
    }
    return data;
  }

  async function sendSchedulingLink(candidateId: string) {
    const res = await fetch(`/api/recruitment/${candidateId}/scheduling-link`, { method: "POST" });
    return res.json();
  }

  async function sendOfferLetter(candidateId: string, payload: Record<string, string>) {
    const res = await fetch(`/api/recruitment/${candidateId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.candidate) {
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? data.candidate : c)));
      setSelected(data.candidate);
    }
    return data;
  }

  async function sendCandidateEmail(candidateId: string, payload: { subject: string; body: string }) {
    const res = await fetch(`/api/recruitment/${candidateId}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function createTemplate(payload: { name: string; subject: string; body: string }) {
    const res = await fetch("/api/recruitment/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.error) setTemplates((prev) => [...prev, data]);
    return data;
  }

  async function updateTemplate(id: string, payload: { name?: string; subject?: string; body?: string }) {
    const res = await fetch(`/api/recruitment/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.error) setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/recruitment/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  const viewCandidates = candidates.filter((c) => (view === "talent_pool" ? c.talent_pool : !c.talent_pool));

  const filtered = viewCandidates.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      fullName(c).toLowerCase().includes(q) ||
      (c.position_applied ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.notes ?? "").toLowerCase().includes(q) ||
      (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const poolCount = candidates.filter((c) => c.talent_pool).length;
  const pipelineCount = candidates.length - poolCount;

  return (
    <div className="space-y-5" onDragOver={(e) => e.preventDefault()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Recruitment</h1>
          <p className="text-sm text-gray-500">
            {view === "pipeline"
              ? `${pipelineCount} candidate${pipelineCount === 1 ? "" : "s"} in the pipeline`
              : `${poolCount} candidate${poolCount === 1 ? "" : "s"} in the talent pool`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={view === "pipeline" ? "Search candidates…" : "Search by role, name, notes, tags…"}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Plus size={15} /> Add candidate
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-60"
            style={{ backgroundColor: "#232D3E" }}
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            Upload CVs
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={() => { setView("pipeline"); setSearch(""); }}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${view === "pipeline" ? "border-gray-800 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            Pipeline ({pipelineCount})
          </button>
          <button
            onClick={() => { setView("talent_pool"); setSearch(""); }}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${view === "talent_pool" ? "border-gray-800 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            Talent Pool ({poolCount})
          </button>
        </div>
        <p className="text-xs text-gray-400 pb-2">
          {view === "talent_pool" ? "Uploads on this tab go to the Talent Pool" : "Uploads on this tab go to the active pipeline"}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400 hover:border-gray-300 transition-colors"
      >
        Drag and drop CVs here (PDF or Word) to bulk-add candidates, or use "Upload CVs" above.
        {uploadSummary && <span className="block mt-1 font-medium text-gray-600">{uploadSummary}</span>}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      ) : view === "talent_pool" ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              {search ? "No matches." : "Nobody in the talent pool yet — CVs for other roles will show up here."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium">Role / Notes</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tags</th>
                  <th className="text-left px-4 py-2.5 font-medium">Added</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{fullName(c)}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{c.position_applied || c.notes || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {c.cv_file_path && (
                        <button onClick={(e) => { e.stopPropagation(); viewCv(c.cv_file_path!); }} className="text-gray-400 hover:text-gray-700">
                          <FileText size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageCandidates = filtered.filter((c) => c.stage === stage.value);
            return (
              <div
                key={stage.value}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.value); }}
                onDragLeave={() => setDragOverStage((s) => (s === stage.value ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const id = e.dataTransfer.getData("text/candidate-id");
                  if (id) updateCandidate(id, { stage: stage.value });
                }}
                className={`flex-shrink-0 w-64 rounded-xl border-t-4 bg-gray-50 ${stage.header} ${dragOverStage === stage.value ? "ring-2 ring-gray-300" : ""}`}
              >
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.badge}`}>{stage.label}</span>
                  <span className="text-xs text-gray-400">{stageCandidates.length}</span>
                </div>
                <div className="px-2 pb-2 space-y-2 min-h-[60px]">
                  {stageCandidates.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/candidate-id", c.id)}
                      onClick={() => setSelected(c)}
                      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{fullName(c)}</p>
                      {c.position_applied && <p className="text-xs text-gray-500 truncate">{c.position_applied}</p>}
                      <div className="flex items-center justify-between mt-2">
                        {c.cv_file_path ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); viewCv(c.cv_file_path!); }}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                          >
                            <FileText size={12} /> CV
                          </button>
                        ) : <span />}
                        {!!c.rating && (
                          <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                            <Star size={11} fill="currentColor" /> {c.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <CandidateModal
          candidate={selected}
          onClose={() => setSelected(null)}
          onSave={(patch) => updateCandidate(selected.id, patch)}
          onDelete={() => deleteCandidate(selected.id)}
          onAttachCv={(file) => attachCv(selected.id, file)}
          onScheduleInterview={(payload) => scheduleInterview(selected.id, payload)}
          onReject={() => rejectCandidate(selected.id)}
          onSendSchedulingLink={() => sendSchedulingLink(selected.id)}
          onSendOfferLetter={(payload) => sendOfferLetter(selected.id, payload)}
          templates={templates}
          onSendEmail={(payload) => sendCandidateEmail(selected.id, payload)}
          onManageTemplates={() => setShowTemplatesManager(true)}
          onPrev={(() => {
            const i = filtered.findIndex((c) => c.id === selected.id);
            return i > 0 ? () => setSelected(filtered[i - 1]) : undefined;
          })()}
          onNext={(() => {
            const i = filtered.findIndex((c) => c.id === selected.id);
            return i >= 0 && i < filtered.length - 1 ? () => setSelected(filtered[i + 1]) : undefined;
          })()}
        />
      )}

      {showTemplatesManager && (
        <TemplatesManagerModal
          templates={templates}
          onClose={() => setShowTemplatesManager(false)}
          onCreate={createTemplate}
          onUpdate={updateTemplate}
          onDelete={deleteTemplate}
        />
      )}

      {showAddForm && (
        <AddCandidateModal
          onClose={() => setShowAddForm(false)}
          onCreate={async (payload) => {
            const res = await fetch("/api/recruitment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data && !data.error) setCandidates((prev) => [data, ...prev]);
            setShowAddForm(false);
          }}
        />
      )}
    </div>
  );
}

function CandidateModal({
  candidate, onClose, onSave, onDelete, onAttachCv, onScheduleInterview, onReject, onSendSchedulingLink,
  onSendOfferLetter, templates, onSendEmail, onManageTemplates, onPrev, onNext,
}: {
  candidate: Candidate;
  onClose: () => void;
  onSave: (patch: Partial<Candidate>) => Promise<void>;
  onDelete: () => void;
  onAttachCv: (file: File) => void;
  onScheduleInterview: (payload: { interview_at: string; duration_minutes: number }) => Promise<{ error?: string; emailSent?: boolean }>;
  onReject: () => Promise<{ error?: string; emailSent?: boolean }>;
  onSendSchedulingLink: () => Promise<{ error?: string; schedulingUrl?: string }>;
  onSendOfferLetter: (payload: Record<string, string>) => Promise<{ error?: string; success?: boolean }>;
  templates: EmailTemplate[];
  onSendEmail: (payload: { subject: string; body: string }) => Promise<{ error?: string; success?: boolean }>;
  onManageTemplates: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [form, setForm] = useState({
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    position_applied: candidate.position_applied ?? "",
    source: candidate.source ?? "",
    notes: candidate.notes ?? "",
    rating: candidate.rating ?? 0,
  });
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const isPdf = (candidate.cv_file_name ?? "").toLowerCase().endsWith(".pdf");
  const [stageValue, setStageValue] = useState(candidate.stage);
  const [stageSaving, setStageSaving] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ error?: string; success?: boolean } | null>(null);

  const [interviewDateTime, setInterviewDateTime] = useState("");
  const [interviewDuration, setInterviewDuration] = useState(30);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [hasEmployerSignature, setHasEmployerSignature] = useState<boolean | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState({
    candidateFullName: fullName(candidate),
    startDate: "",
  });
  const [savingSignature, setSavingSignature] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerResult, setOfferResult] = useState<{ error?: string; success?: boolean } | null>(null);
  const employerSigPadRef = useRef<HTMLCanvasElement>(null);
  const employerSigPad = useRef<SignaturePad | null>(null);
  const [offerPdfLoading, setOfferPdfLoading] = useState(false);

  useEffect(() => {
    fetch("/api/recruitment/employer-signature")
      .then((res) => res.json())
      .then((data) => setHasEmployerSignature(!!data.hasSignature))
      .catch(() => setHasEmployerSignature(false));
  }, []);

  useEffect(() => {
    if (hasEmployerSignature === false && showOfferForm && employerSigPadRef.current && !employerSigPad.current) {
      import("signature_pad").then(({ default: SignaturePad }) => {
        if (employerSigPadRef.current) employerSigPad.current = new SignaturePad(employerSigPadRef.current, { backgroundColor: "rgb(255,255,255)" });
      });
    }
  }, [hasEmployerSignature, showOfferForm]);

  async function saveEmployerSignatureAndContinue() {
    if (!employerSigPad.current || employerSigPad.current.isEmpty()) {
      setOfferResult({ error: "Please sign before continuing." });
      return;
    }
    setSavingSignature(true);
    const res = await fetch("/api/recruitment/employer-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature: employerSigPad.current.toDataURL("image/png") }),
    });
    const data = await res.json();
    setSavingSignature(false);
    if (data.error) { setOfferResult({ error: data.error }); return; }
    setHasEmployerSignature(true);
  }

  function offerPayload() {
    const [y, m, d] = offerForm.startDate.split("-");
    return { candidateFullName: offerForm.candidateFullName, startDate: y ? `${d}.${m}.${y}` : offerForm.startDate };
  }

  async function viewSignedOffer() {
    setOfferPdfLoading(true);
    const res = await fetch(`/api/recruitment/${candidate.id}/offer-pdf`);
    const data = await res.json();
    setOfferPdfLoading(false);
    if (data.url) window.open(data.url, "_blank");
  }

  const [callNote, setCallNote] = useState("");
  const [loggingCall, setLoggingCall] = useState(false);
  const dictation = useDictation((text) => setCallNote((prev) => (prev ? `${prev} ${text}` : text)));
  const [quickNote, setQuickNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [interviewNotes, setInterviewNotes] = useState<Record<string, string>>(candidate.interview_notes ?? {});
  const [savingNotes, setSavingNotes] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [schedulingResult, setSchedulingResult] = useState<{ url?: string; error?: string } | null>(null);

  useEffect(() => {
    // Guards against a real race: if React reuses this modal instance for a new
    // candidate (rather than a fresh mount) while the previous candidate's CV/activity
    // fetch is still in flight, that stale fetch resolving later would otherwise
    // overwrite the new candidate's data with the old one's.
    let cancelled = false;

    setForm({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      position_applied: candidate.position_applied ?? "",
      source: candidate.source ?? "",
      notes: candidate.notes ?? "",
      rating: candidate.rating ?? 0,
    });
    setInterviewNotes(candidate.interview_notes ?? {});
    setSchedulingResult(null);
    setRejectError(null);
    setStageValue(candidate.stage);
    setInterviewDateTime("");
    setInviteError(null);
    setCallNote("");
    if (dictation.isRecording) dictation.stop();
    setQuickNote("");
    setSelectedTemplateId("");
    setEmailSubject("");
    setEmailBody("");
    setEmailResult(null);

    setActivityLoading(true);
    fetch(`/api/recruitment/${candidate.id}/activity`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setActivity(Array.isArray(data) ? data : []); })
      .finally(() => { if (!cancelled) setActivityLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.id]);

  useEffect(() => {
    // Keyed on cv_file_path (not just candidate.id) so the preview refreshes immediately
    // after attaching/replacing a CV, without needing to close and reopen the modal.
    let cancelled = false;
    setCvUrl(null);
    if (candidate.cv_file_path) {
      setCvLoading(true);
      fetch(`/api/recruitment/upload?path=${encodeURIComponent(candidate.cv_file_path)}`)
        .then((res) => res.json())
        .then((data) => { if (!cancelled) setCvUrl(data.url ?? null); })
        .finally(() => { if (!cancelled) setCvLoading(false); });
    }
    return () => { cancelled = true; };
  }, [candidate.cv_file_path]);

  async function save() {
    await onSave({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      position_applied: form.position_applied || null,
      source: form.source || null,
      notes: form.notes || null,
      rating: form.rating || null,
    });
  }

  function refreshActivity() {
    fetch(`/api/recruitment/${candidate.id}/activity`)
      .then((res) => res.json())
      .then((data) => setActivity(Array.isArray(data) ? data : []));
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-gray-900">Candidate details</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={onPrev}
                disabled={!onPrev}
                title="Previous candidate"
                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={onNext}
                disabled={!onNext}
                title="Next candidate"
                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 p-5 space-y-3 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                Pipeline stage
                {stageSaving && <Loader2 size={11} className="animate-spin text-gray-400" />}
              </label>
              <select
                value={stageValue}
                onChange={async (e) => {
                  const newStage = e.target.value;
                  setStageValue(newStage); // update immediately — don't wait on the network round-trip
                  setStageSaving(true);
                  await onSave({ stage: newStage });
                  setStageSaving(false);
                  refreshActivity();
                }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
              <Field label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position applied for" value={form.position_applied} onChange={(v) => setForm({ ...form, position_applied: v })} />
              <Field label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setForm({ ...form, rating: n === form.rating ? 0 : n })}>
                    <Star size={20} className={n <= form.rating ? "text-amber-500" : "text-gray-200"} fill={n <= form.rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Tag size={12} /> Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map((t) => {
                  const active = (candidate.tags ?? []).includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        const current = candidate.tags ?? [];
                        const next = active ? current.filter((x) => x !== t) : [...current, t];
                        onSave({ tags: next });
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Pinned summary (shown here only, not in History)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={form.notes ? 4 : 2}
                placeholder="Optional — a short standing summary. For anything time-stamped, use Add a note below."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>

            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">Add a note</p>
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                rows={2}
                placeholder="Each note is saved separately with its own timestamp, in History below."
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <button
                disabled={!quickNote.trim() || addingNote}
                onClick={async () => {
                  setAddingNote(true);
                  await fetch(`/api/recruitment/${candidate.id}/activity`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ note: quickNote, type: "note" }),
                  });
                  setAddingNote(false);
                  setQuickNote("");
                  refreshActivity();
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 underline disabled:opacity-50"
              >
                {addingNote ? "Adding…" : "Add note"}
              </button>
            </div>

            <div className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5">
              {candidate.cv_file_path ? (
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <FileText size={16} /> {candidate.cv_file_name ?? "CV attached"}
                </span>
              ) : (
                <span className="text-sm text-gray-400">No CV attached</span>
              )}
              <button onClick={() => cvInputRef.current?.click()} className="text-xs font-medium text-gray-500 hover:text-gray-800 underline">
                {candidate.cv_file_path ? "Replace" : "Attach CV"}
              </button>
              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onAttachCv(e.target.files[0])}
              />
            </div>

            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Video size={14} /> Interview</p>

              {candidate.interview_at && (
                <div className="text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2 space-y-1">
                  <p className="text-green-800 font-medium">
                    Scheduled: {new Date(candidate.interview_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {candidate.interview_zoom_url && (
                    <a href={candidate.interview_zoom_url} target="_blank" rel="noopener noreferrer" className="text-green-700 underline text-xs">
                      Zoom link
                    </a>
                  )}
                </div>
              )}

              {!candidate.email ? (
                <p className="text-xs text-gray-400">Add an email address above before scheduling an interview.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={interviewDateTime}
                      onChange={(e) => setInterviewDateTime(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <select
                      value={interviewDuration}
                      onChange={(e) => setInterviewDuration(Number(e.target.value))}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                  <button
                    disabled={!interviewDateTime || sendingInvite}
                    onClick={async () => {
                      setSendingInvite(true);
                      setInviteError(null);
                      // interviewDateTime is a naive "YYYY-MM-DDTHH:mm" value from the picker.
                      // Treat it explicitly as Dubai time (UTC+4, no DST) regardless of the
                      // browser/device's own timezone, so it always matches what Zoom is told.
                      const result = await onScheduleInterview({
                        interview_at: new Date(`${interviewDateTime}:00+04:00`).toISOString(),
                        duration_minutes: interviewDuration,
                      });
                      setSendingInvite(false);
                      if (result?.error) setInviteError(result.error);
                      else { setInterviewDateTime(""); refreshActivity(); }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: "#232D3E" }}
                  >
                    {sendingInvite ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                    {candidate.interview_at ? "Reschedule & resend invite" : "Create Zoom meeting & send invite"}
                  </button>
                  {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}

                  {!candidate.interview_at && (
                    <>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="flex-1 h-px bg-gray-100" /> or <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <button
                        disabled={sendingLink}
                        onClick={async () => {
                          setSendingLink(true);
                          setSchedulingResult(null);
                          const result = await onSendSchedulingLink();
                          setSendingLink(false);
                          setSchedulingResult(result.error ? { error: result.error } : { url: result.schedulingUrl });
                          if (!result.error) refreshActivity();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {sendingLink ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
                        Let candidate pick their own time
                      </button>
                      {schedulingResult?.error && <p className="text-xs text-red-500">{schedulingResult.error}</p>}
                      {schedulingResult?.url && <p className="text-xs text-green-600">Link sent — they'll get an email to choose a slot themselves.</p>}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><FileSignature size={14} /> Offer letter</p>

              {candidate.offer_status === "signed" ? (
                <div className="text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2 space-y-1.5">
                  <p className="text-green-800 font-medium">
                    Signed {candidate.offer_signed_at && new Date(candidate.offer_signed_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <button
                    disabled={offerPdfLoading}
                    onClick={viewSignedOffer}
                    className="flex items-center gap-1.5 text-xs text-green-700 underline disabled:opacity-50"
                  >
                    <Download size={12} /> {offerPdfLoading ? "Loading…" : "View signed PDF"}
                  </button>
                </div>
              ) : candidate.offer_status === "sent" ? (
                <div className="text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-amber-800">
                    Sent {candidate.offer_sent_at && new Date(candidate.offer_sent_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} — awaiting candidate signature.
                  </p>
                </div>
              ) : null}

              {!candidate.email ? (
                <p className="text-xs text-gray-400">Add an email address above before sending an offer letter.</p>
              ) : hasEmployerSignature === null ? (
                <p className="text-xs text-gray-400">Loading…</p>
              ) : hasEmployerSignature === false ? (
                !showOfferForm ? (
                  <button
                    onClick={() => setShowOfferForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <PenLine size={15} /> Save your signature to get started
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Sign once — this signature will be reused automatically on every offer letter you send.</p>
                    <canvas
                      ref={employerSigPadRef}
                      width={460}
                      height={130}
                      className="border-2 border-dashed border-gray-200 rounded-xl w-full touch-none"
                    />
                    <div className="flex gap-3">
                      <button className="text-xs text-gray-500 underline flex items-center gap-1" onClick={() => employerSigPad.current?.clear()}>
                        <RotateCcw size={12} /> Clear
                      </button>
                      <button
                        disabled={savingSignature}
                        onClick={saveEmployerSignatureAndContinue}
                        className="text-xs font-medium text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: "#232D3E" }}
                      >
                        {savingSignature ? "Saving…" : "Save signature"}
                      </button>
                    </div>
                    {offerResult?.error && <p className="text-xs text-red-500">{offerResult.error}</p>}
                  </div>
                )
              ) : candidate.offer_status === "sent" || candidate.offer_status === "signed" ? (
                candidate.offer_status === "sent" && (
                  <button
                    disabled={sendingOffer}
                    onClick={async () => {
                      setSendingOffer(true);
                      setOfferResult(null);
                      const result = await onSendOfferLetter(offerPayload());
                      setSendingOffer(false);
                      setOfferResult(result);
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 underline disabled:opacity-50"
                  >
                    {sendingOffer ? "Resending…" : "Resend offer letter"}
                  </button>
                )
              ) : !showOfferForm ? (
                <button
                  onClick={() => setShowOfferForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <FileSignature size={15} /> Prepare offer letter
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Uses your Baytify offer letter template — just fill in the two details below.</p>
                  <Field label="Candidate full name" value={offerForm.candidateFullName} onChange={(v) => setOfferForm({ ...offerForm, candidateFullName: v })} />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start date</label>
                    <input
                      type="date"
                      value={offerForm.startDate}
                      onChange={(e) => setOfferForm({ ...offerForm, startDate: e.target.value })}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                  <button
                    disabled={!offerForm.candidateFullName.trim() || !offerForm.startDate || sendingOffer}
                    onClick={async () => {
                      setSendingOffer(true);
                      setOfferResult(null);
                      const result = await onSendOfferLetter(offerPayload());
                      setSendingOffer(false);
                      setOfferResult(result);
                      if (!result.error) { setShowOfferForm(false); refreshActivity(); }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: "#232D3E" }}
                  >
                    {sendingOffer ? <Loader2 size={15} className="animate-spin" /> : <FileSignature size={15} />}
                    {sendingOffer ? "Sending…" : "Send offer letter"}
                  </button>
                </div>
              )}
              {offerResult?.error && <p className="text-xs text-red-500">{offerResult.error}</p>}
            </div>

            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><ClipboardList size={14} /> Interview notes</p>
              {INTERVIEW_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <label className="block text-xs text-gray-400 mb-1">{q.label}</label>
                  <textarea
                    value={interviewNotes[q.key] ?? ""}
                    onChange={(e) => setInterviewNotes({ ...interviewNotes, [q.key]: e.target.value })}
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              ))}
              <button
                disabled={savingNotes}
                onClick={async () => {
                  setSavingNotes(true);
                  await onSave({ interview_notes: interviewNotes });
                  setSavingNotes(false);
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 underline"
              >
                {savingNotes ? "Saving…" : "Save interview notes"}
              </button>
            </div>

            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Phone size={14} /> Log a call</p>
                {dictation.isSupported && (
                  <button
                    onClick={() => (dictation.isRecording ? dictation.stop() : dictation.start())}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${dictation.isRecording ? "bg-red-50 border-red-200 text-red-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    title={dictation.isRecording ? "Stop dictating" : "Dictate notes by speaking"}
                  >
                    {dictation.isRecording ? <Square size={11} fill="currentColor" /> : <Mic size={12} />}
                    {dictation.isRecording ? "Listening…" : "Dictate"}
                  </button>
                )}
              </div>
              <textarea
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                rows={3}
                placeholder="What did you discuss? Type, or click Dictate and speak."
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              {dictation.error && (
                <p className="text-xs text-red-500 flex items-center justify-between gap-2">
                  {dictation.error}
                  <button onClick={dictation.clearError} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <X size={12} />
                  </button>
                </p>
              )}
              <button
                disabled={!callNote.trim() || loggingCall}
                onClick={async () => {
                  if (dictation.isRecording) dictation.stop();
                  setLoggingCall(true);
                  await fetch(`/api/recruitment/${candidate.id}/activity`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ note: callNote, type: "call" }),
                  });
                  setLoggingCall(false);
                  setCallNote("");
                  refreshActivity();
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 underline disabled:opacity-50"
              >
                {loggingCall ? "Logging…" : "Log call"}
              </button>
            </div>

            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Mail size={14} /> Email candidate</p>
                <button onClick={onManageTemplates} className="text-xs text-gray-400 hover:text-gray-700 underline">Manage templates</button>
              </div>

              {!candidate.email ? (
                <p className="text-xs text-gray-400">Add an email address above before sending an email.</p>
              ) : (
                <>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTemplateId(id);
                      const template = templates.find((t) => t.id === id);
                      if (template) {
                        setEmailSubject(resolvePlaceholders(template.subject, candidate));
                        setEmailBody(resolvePlaceholders(template.body, candidate));
                      } else {
                        setEmailSubject("");
                        setEmailBody("");
                      }
                    }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                  >
                    <option value="">Custom message…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={5}
                    placeholder="Write your message…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  <button
                    disabled={!emailSubject.trim() || !emailBody.trim() || sendingEmail}
                    onClick={async () => {
                      setSendingEmail(true);
                      setEmailResult(null);
                      const result = await onSendEmail({ subject: emailSubject, body: emailBody });
                      setSendingEmail(false);
                      setEmailResult(result);
                      if (!result.error) {
                        setEmailSubject("");
                        setEmailBody("");
                        setSelectedTemplateId("");
                        refreshActivity();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: "#232D3E" }}
                  >
                    {sendingEmail ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                    {sendingEmail ? "Sending…" : "Send email"}
                  </button>
                  {emailResult?.error && <p className="text-xs text-red-500">{emailResult.error}</p>}
                  {emailResult?.success && <p className="text-xs text-green-600">Sent.</p>}
                </>
              )}
            </div>

            <p className="text-xs text-gray-400">Added {formatDate(candidate.created_at)}</p>

            <div className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2"><History size={14} /> History</p>
              {activityLoading ? (
                <p className="text-xs text-gray-400">Loading…</p>
              ) : activity.length === 0 ? (
                <p className="text-xs text-gray-400">Nothing logged yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {activity.map((a) => {
                    const Icon = a.type === "email_received" ? MailOpen : a.type === "stage_change" ? ArrowRightLeft : a.type === "call" ? Phone : a.type === "note" ? StickyNote : Mail;
                    const iconColor = a.type === "email_received" ? "text-blue-500" : a.type === "stage_change" ? "text-purple-500" : a.type === "call" ? "text-green-500" : a.type === "note" ? "text-amber-500" : "text-gray-400";
                    return (
                      <div key={a.id} className="flex gap-2 text-xs">
                        <Icon size={13} className={`mt-0.5 flex-shrink-0 ${iconColor}`} />
                        <div className="min-w-0">
                          {a.subject && <p className="font-medium text-gray-700 truncate">{a.subject}</p>}
                          {a.body_snippet && <p className="text-gray-500 line-clamp-2">{a.body_snippet}</p>}
                          <p className="text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="w-1/2 border-l border-gray-100 bg-gray-50 flex flex-col">
            {!candidate.cv_file_path ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No CV to preview</div>
            ) : cvLoading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading CV…</div>
            ) : !cvUrl ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Couldn't load CV preview</div>
            ) : isPdf ? (
              <iframe src={cvUrl} className="flex-1 w-full" title="CV preview" />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-gray-500 p-6 text-center">
                <FileText size={28} className="text-gray-300" />
                <p>Preview isn't available for this file type.</p>
                <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="text-gray-700 underline font-medium">
                  Open {candidate.cv_file_name}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
              <Trash2 size={15} /> Delete
            </button>
            {candidate.stage !== "rejected" && (
              <button
                disabled={rejecting}
                onClick={async () => {
                  if (!confirm("Reject this candidate? They'll get a polite decline email if they have an address on file.")) return;
                  setRejecting(true);
                  const result = await onReject();
                  setRejecting(false);
                  if (result?.error) setRejectError(result.error);
                }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
              >
                <UserX size={15} /> {rejecting ? "Rejecting…" : "Reject"}
              </button>
            )}
            <button
              onClick={async () => { await onSave({ talent_pool: !candidate.talent_pool }); onClose(); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
            >
              <Link2 size={15} /> {candidate.talent_pool ? "Move to Pipeline" : "Move to Talent Pool"}
            </button>
            {rejectError && <p className="text-xs text-red-500">{rejectError}</p>}
          </div>
          <button
            onClick={async () => { await save(); onClose(); }}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: "#232D3E" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
    </div>
  );
}

function AddCandidateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (payload: Record<string, string>) => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", position_applied: "", source: "" });
  const [talentPool, setTalentPool] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add candidate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
            <Field label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
          </div>
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Position applied for" value={form.position_applied} onChange={(v) => setForm({ ...form, position_applied: v })} />
          <Field label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
          <label className="flex items-center gap-2 text-sm text-gray-600 pt-1">
            <input type="checkbox" checked={talentPool} onChange={(e) => setTalentPool(e.target.checked)} />
            Add to Talent Pool instead of the active pipeline
          </label>
        </div>
        <div className="flex justify-end px-5 py-4 border-t border-gray-100">
          <button
            disabled={!form.first_name || saving}
            onClick={async () => {
              setSaving(true);
              await onCreate(talentPool ? { ...form, talent_pool: "true" } : form);
              setSaving(false);
            }}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "#232D3E" }}
          >
            Add candidate
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatesManagerModal({
  templates, onClose, onCreate, onUpdate, onDelete,
}: {
  templates: EmailTemplate[];
  onClose: () => void;
  onCreate: (payload: { name: string; subject: string; body: string }) => Promise<{ error?: string }>;
  onUpdate: (id: string, payload: { name?: string; subject?: string; body?: string }) => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setEditingId(null);
    setForm({ name: "", subject: "", body: "" });
    setError(null);
  }

  function startEdit(t: EmailTemplate) {
    setEditingId(t.id);
    setForm({ name: t.name, subject: t.subject, body: t.body });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = editingId ? await onUpdate(editingId, form) : await onCreate(form);
    setSaving(false);
    if (result.error) setError(result.error);
    else startNew();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">Email templates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-2/5 border-r border-gray-100 overflow-y-auto">
            <button
              onClick={startNew}
              className="w-full flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-50"
            >
              <Plus size={14} /> New template
            </button>
            {templates.length === 0 ? (
              <p className="p-4 text-xs text-gray-400">No templates yet.</p>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => startEdit(t)}
                  className={`px-4 py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${editingId === t.id ? "bg-gray-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${t.name}"?`)) { onDelete(t.id); if (editingId === t.id) startNew(); } }}
                      className="text-gray-300 hover:text-red-500 flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{t.subject}</p>
                </div>
              ))
            )}
          </div>

          <div className="w-3/5 p-4 space-y-3 overflow-y-auto">
            <Field label="Template name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={8}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <p className="text-xs text-gray-400">
              Placeholders: {TEMPLATE_PLACEHOLDERS.map((p) => (
                <code key={p.token} className="bg-gray-100 rounded px-1 py-0.5 mx-0.5" title={p.label}>{p.token}</code>
              ))}
            </p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              disabled={!form.name.trim() || !form.subject.trim() || !form.body.trim() || saving}
              onClick={save}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: "#232D3E" }}
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Create template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
