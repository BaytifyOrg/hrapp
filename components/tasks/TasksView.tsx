"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Trash2, Send, CheckCircle, Clock, AlertCircle, ChevronDown, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee: { id: string; employees: { first_name: string; last_name: string } | null } | null;
  creator: { id: string; employees: { first_name: string; last_name: string } | null } | null;
  task_notes: { count: number }[];
};

type Note = {
  id: string;
  content: string;
  created_at: string;
  author: { id: string; employees: { first_name: string; last_name: string } | null } | null;
};

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "bg-gray-100 text-gray-600", icon: Clock },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  { value: "done", label: "Done", color: "bg-green-100 text-green-700", icon: CheckCircle },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-500" },
  { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-600" },
  { value: "high", label: "High", color: "bg-red-100 text-red-600" },
];

function getName(user: { id: string; employees: { first_name: string; last_name: string } | null } | null) {
  if (!user) return "Unknown";
  return user.employees ? `${user.employees.first_name} ${user.employees.last_name}` : "Unknown";
}

export default function TasksView({ isAdmin, currentUserId, currentUserName, staffUsers }: {
  isAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
  staffUsers: { id: string; name: string }[];
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", priority: "normal", due_date: "" });
  const [saving, setSaving] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTasks(); }, []);

  useEffect(() => {
    if (selectedTask) loadNotes(selectedTask.id);
  }, [selectedTask?.id]);

  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes]);

  async function loadTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadNotes(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/notes`);
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      await loadTasks();
      setShowForm(false);
      setForm({ title: "", description: "", assigned_to: "", priority: "normal", due_date: "" });
    }
  }

  async function updateStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTasks(t => t.map(x => x.id === taskId ? { ...x, status } : x));
    if (selectedTask?.id === taskId) setSelectedTask(t => t ? { ...t, status } : t);
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setTasks(t => t.filter(x => x.id !== taskId));
    if (selectedTask?.id === taskId) setSelectedTask(null);
  }

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !selectedTask) return;
    setSendingNote(true);
    const res = await fetch(`/api/tasks/${selectedTask.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText }),
    });
    const data = await res.json();
    setSendingNote(false);
    if (res.ok) {
      setNotes(n => [...n, data]);
      setNoteText("");
    }
  }

  const filtered = tasks.filter(t => filter === "all" || t.status === filter);
  const todoCnt = tasks.filter(t => t.status === "todo").length;
  const inProgCnt = tasks.filter(t => t.status === "in_progress").length;
  const doneCnt = tasks.filter(t => t.status === "done").length;

  const isOverdue = (task: Task) => task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();

  return (
    <div className="flex gap-6 h-full">
      {/* Left — Task list */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin ? "Assign and track team tasks" : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} assigned to you`}
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} /> New Task
            </button>
          )}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">New Task</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={createTask} className="space-y-4">
              <div>
                <label className="label">Task Title *</label>
                <input className="input" placeholder="e.g. Complete employee onboarding pack" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} placeholder="Add any details or instructions…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Assign To</label>
                  <select className="input" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {staffUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary">{saving ? "Creating…" : "Create Task"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {[
            { key: "all", label: `All (${tasks.length})` },
            { key: "todo", label: `To Do (${todoCnt})` },
            { key: "in_progress", label: `In Progress (${inProgCnt})` },
            { key: "done", label: `Done (${doneCnt})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                filter === key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : !filtered.length ? (
          <div className="card text-center py-12 text-gray-400">
            <CheckCircle size={32} className="mx-auto mb-3 text-gray-300" />
            <p>{filter === "done" ? "No completed tasks yet." : "No tasks here!"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => {
              const statusOpt = STATUS_OPTIONS.find(s => s.value === task.status)!;
              const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority)!;
              const overdue = isOverdue(task);
              const noteCount = task.task_notes?.[0]?.count ?? 0;
              const isSelected = selectedTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(isSelected ? null : task)}
                  className={`card cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-gray-900" : ""} ${overdue ? "border-red-200" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status toggle */}
                    <div className="mt-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={e => updateStatus(task.id, e.target.value)}
                        className={`text-xs rounded-full px-2 py-1 font-medium border-0 cursor-pointer ${statusOpt.color}`}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-gray-900 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {noteCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MessageSquare size={12} /> {noteCount}
                            </span>
                          )}
                          <span className={`badge text-xs ${priorityOpt.color}`}>{priorityOpt.label}</span>
                          {isAdmin && (
                            <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {task.assignee && (
                          <span className="text-xs text-gray-400">→ {getName(task.assignee)}</span>
                        )}
                        {task.due_date && (
                          <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                            {overdue ? "Overdue · " : "Due "}{formatDate(task.due_date)}
                          </span>
                        )}
                        {task.description && (
                          <span className="text-xs text-gray-400 truncate max-w-xs">{task.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right — Task detail + notes */}
      {selectedTask && (
        <div className="w-80 flex-shrink-0">
          <div className="card flex flex-col sticky top-6" style={{ maxHeight: "calc(100vh - 6rem)" }}>
            {/* Task detail header */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-gray-900 leading-snug pr-2">{selectedTask.title}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-gray-300 hover:text-gray-500 flex-shrink-0"><X size={16} /></button>
            </div>

            {/* Meta */}
            <div className="space-y-2 mb-4 text-xs text-gray-500">
              {selectedTask.assignee && <p><span className="font-medium text-gray-700">Assigned to:</span> {getName(selectedTask.assignee)}</p>}
              {selectedTask.creator && <p><span className="font-medium text-gray-700">Created by:</span> {getName(selectedTask.creator)}</p>}
              {selectedTask.due_date && <p><span className="font-medium text-gray-700">Due:</span> {formatDate(selectedTask.due_date)}</p>}
              <p><span className="font-medium text-gray-700">Priority:</span> {PRIORITY_OPTIONS.find(p => p.value === selectedTask.priority)?.label}</p>
            </div>

            {selectedTask.description && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-600 mb-4 leading-relaxed">
                {selectedTask.description}
              </div>
            )}

            {/* Status actions */}
            <div className="flex gap-2 mb-4">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => updateStatus(selectedTask.id, s.value)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-all ${
                    selectedTask.status === s.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Notes */}
            <div className="border-t border-gray-100 pt-4 flex flex-col flex-1 min-h-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</p>
              <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
                {notes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No notes yet — add one below.</p>
                ) : notes.map(note => {
                  const isMe = note.author?.id === currentUserId;
                  const authorName = note.author?.employees
                    ? `${note.author.employees.first_name} ${note.author.employees.last_name}`
                    : isMe ? currentUserName : "Unknown";
                  return (
                    <div key={note.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className={`rounded-2xl px-3 py-2 max-w-[90%] ${isMe ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}>
                        <p className="text-xs leading-relaxed">{note.content}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 px-1">{isMe ? "You" : authorName} · {new Date(note.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  );
                })}
                <div ref={notesEndRef} />
              </div>

              {/* Note input */}
              <form onSubmit={sendNote} className="flex gap-2">
                <input
                  className="input text-sm flex-1 py-2"
                  placeholder="Add a note…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
                <button type="submit" disabled={sendingNote || !noteText.trim()} className="btn-primary px-3 py-2 disabled:opacity-50">
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
