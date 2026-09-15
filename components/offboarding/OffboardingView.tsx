"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckSquare, Square, Plus, UserX, Calculator, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

type Employee = { id: string; first_name: string; last_name: string; job_title: string | null; department: string | null; };
type ChecklistItem = { id: string; employee_id: string; task: string; category: string; completed: boolean; completed_at: string | null; };

const DEFAULT_TASKS = [
  { task: "Collect company laptop / equipment", category: "IT & Assets" },
  { task: "Revoke system access & email account", category: "IT & Assets" },
  { task: "Revoke CRM access", category: "IT & Assets" },
  { task: "Collect access cards / office keys", category: "IT & Assets" },
  { task: "Return mobile phone / SIM (if applicable)", category: "IT & Assets" },
  { task: "Process final payroll & EOS gratuity", category: "Finance" },
  { task: "Settle any outstanding expenses or advances", category: "Finance" },
  { task: "Cancel health insurance / benefits", category: "Finance" },
  { task: "Conduct exit interview", category: "HR" },
  { task: "Obtain signed resignation / termination letter", category: "HR" },
  { task: "Update employee status to Terminated", category: "HR" },
  { task: "Archive employee records", category: "HR" },
  { task: "Brief team on handover", category: "Handover" },
  { task: "Ensure knowledge transfer is complete", category: "Handover" },
  { task: "Update org chart", category: "Handover" },
];

const CATEGORIES = ["IT & Assets", "Finance", "HR", "Handover"];

export default function OffboardingView({ employees }: { employees: Employee[] }) {
  const supabase = createClient();
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  async function startOffboarding(emp: Employee) {
    setSelectedEmp(emp);
    setLoading(true);

    const { data: existing } = await supabase.from("offboarding_tasks").select("*").eq("employee_id", emp.id);

    if (existing && existing.length > 0) {
      setChecklist(existing);
    } else {
      const tasks = DEFAULT_TASKS.map(t => ({ employee_id: emp.id, task: t.task, category: t.category, completed: false, completed_at: null }));
      const { data: inserted } = await supabase.from("offboarding_tasks").insert(tasks).select();
      setChecklist(inserted ?? []);
    }
    setExpandedCat(CATEGORIES[0]);
    setLoading(false);
  }

  async function toggleTask(item: ChecklistItem) {
    const now = new Date().toISOString();
    const updated = { completed: !item.completed, completed_at: !item.completed ? now : null };
    await supabase.from("offboarding_tasks").update(updated).eq("id", item.id);
    setChecklist(prev => prev.map(t => t.id === item.id ? { ...t, ...updated } : t));
  }

  async function addTask() {
    if (!newTask.trim() || !selectedEmp) return;
    const { data } = await supabase.from("offboarding_tasks").insert({ employee_id: selectedEmp.id, task: newTask.trim(), category: "Other", completed: false, completed_at: null }).select().single();
    if (data) setChecklist(prev => [...prev, data]);
    setNewTask("");
  }

  const completedCount = checklist.filter(t => t.completed).length;
  const totalCount = checklist.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!selectedEmp) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Offboarding</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employee departures with a structured checklist</p>
        </div>
        <div className="grid grid-cols-1 gap-3 max-w-2xl">
          {employees.map(emp => (
            <button key={emp.id} onClick={() => startOffboarding(emp)}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors text-left">
              <div>
                <p className="font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                <p className="text-xs text-gray-400">{emp.job_title ?? "—"} · {emp.department ?? "—"}</p>
              </div>
              <span className="text-xs text-gray-400 flex items-center gap-1"><UserX size={14} /> Start Offboarding</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setSelectedEmp(null)} className="btn-secondary text-sm">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offboarding — {selectedEmp.first_name} {selectedEmp.last_name}</h1>
          <p className="text-sm text-gray-500">{selectedEmp.job_title ?? "—"}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-gray-900">{completedCount} / {totalCount} tasks</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {pct === 100 && <p className="text-xs text-green-600 mt-2 font-medium">✓ All offboarding tasks complete</p>}
        <div className="mt-3">
          <Link href="/tools" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
            <Calculator size={12} /> Calculate EOS Gratuity in Useful Tools
          </Link>
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading checklist…</p> : (
        <div className="space-y-3">
          {CATEGORIES.concat(checklist.some(t => t.category === "Other") ? ["Other"] : []).map(cat => {
            const items = checklist.filter(t => t.category === cat);
            if (items.length === 0) return null;
            const catDone = items.filter(t => t.completed).length;
            const isOpen = expandedCat === cat;
            return (
              <div key={cat} className="card p-0 overflow-hidden">
                <button onClick={() => setExpandedCat(isOpen ? null : cat)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-800 text-sm">{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{catDone}/{items.length}</span>
                    {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t divide-y">
                    {items.map(item => (
                      <button key={item.id} onClick={() => toggleTask(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                        {item.completed
                          ? <CheckSquare size={16} className="text-green-500 flex-shrink-0" />
                          : <Square size={16} className="text-gray-300 flex-shrink-0" />}
                        <span className={`text-sm ${item.completed ? "line-through text-gray-400" : "text-gray-700"}`}>{item.task}</span>
                        {item.completed_at && (
                          <span className="ml-auto text-xs text-gray-300 flex-shrink-0">
                            {new Date(item.completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add custom task */}
      <div className="mt-4 flex gap-2">
        <input className="input flex-1" placeholder="Add a custom task…" value={newTask} onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()} />
        <button onClick={addTask} className="btn-secondary flex items-center gap-1.5"><Plus size={14} /> Add</button>
      </div>
    </div>
  );
}
