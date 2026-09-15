"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, UserCheck, Clock, Link2, KeyRound } from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    role: string;
    employee_id: string | null;
    employees: { first_name: string; last_name: string } | null;
  } | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);
  const [linkEmployeeId, setLinkEmployeeId] = useState("");
  const [resetSending, setResetSending] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    employee_id: "",
    role: "employee",
  });

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  async function loadEmployees() {
    const res = await fetch("/api/employees-list");
    const data = await res.json();
    setEmployees(data.employees ?? []);
  }

  useEffect(() => {
    loadUsers();
    loadEmployees();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setShowForm(false);
      setForm({ email: "", password: "", employee_id: "", role: "employee" });
      loadUsers();
    }
    setSaving(false);
  }

  async function linkEmployee(userId: string) {
    await fetch("/api/users/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, employee_id: linkEmployeeId || null }),
    });
    setLinkingUserId(null);
    setLinkEmployeeId("");
    loadUsers();
  }

  async function sendResetLink(userId: string, email: string, name?: string) {
    setResetSending(userId);
    await fetch("/api/users/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    setResetSending(null);
    setResetSent(userId);
    setTimeout(() => setResetSent(null), 3000);
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Remove login for ${email}? This cannot be undone.`)) return;
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    loadUsers();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Logins</h1>
          <p className="text-sm text-gray-500 mt-1">Manage who can log in to the HR portal</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Login
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Create Staff Login</h2>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="staff@company.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Set a temporary password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="label">Link to Employee (optional)</label>
                <select
                  className="input"
                  value={form.employee_id}
                  onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                >
                  <option value="">— Not linked yet —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="employee">Employee — can see own leave & payslip</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <p className="text-xs text-gray-400">
              The staff member will log in at this app with this email and password. Share the credentials with them directly.
            </p>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Creating…" : "Create Login"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Linked To</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Last Login</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : users.map((u) => {
              const emp = u.profile?.employees;
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{u.email}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {emp ? (
                      <span className="flex items-center gap-1">
                        <UserCheck size={14} className="text-green-500" />
                        {emp.first_name} {emp.last_name}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not linked</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`badge ${u.profile?.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                      {u.profile?.role ?? "no profile"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 flex items-center gap-1">
                    <Clock size={13} className="text-gray-300" />
                    {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "Never"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {linkingUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="input text-xs py-1 w-48"
                            value={linkEmployeeId}
                            onChange={e => setLinkEmployeeId(e.target.value)}
                          >
                            <option value="">— Remove link —</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                            ))}
                          </select>
                          <button onClick={() => linkEmployee(u.id)} className="text-xs btn-primary py-1 px-2">Save</button>
                          <button onClick={() => setLinkingUserId(null)} className="text-xs btn-secondary py-1 px-2">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setLinkingUserId(u.id); setLinkEmployeeId(u.profile?.employee_id ?? ""); }}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Link to employee"
                        >
                          <Link2 size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => sendResetLink(u.id, u.email!, emp ? `${emp.first_name}` : undefined)}
                        disabled={resetSending === u.id}
                        className="text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                        title="Send password reset link"
                      >
                        {resetSent === u.id
                          ? <span className="text-xs text-green-600 font-medium">Sent ✓</span>
                          : resetSending === u.id
                          ? <span className="text-xs text-gray-400">Sending…</span>
                          : <KeyRound size={15} />
                        }
                      </button>
                      <button
                        onClick={() => deleteUser(u.id, u.email!)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
