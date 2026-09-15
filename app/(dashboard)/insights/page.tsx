import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Users, Clock, BookOpen, CheckCircle, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

function formatSeconds(s: number | null) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();

  // Fetch all auth users (for last login)
  const { data: authData } = await admin.auth.admin.listUsers();
  const authUsers = authData?.users ?? [];

  // Fetch profiles + employees
  const [{ data: profiles }, { data: employees }, { data: guides }, { data: allProgress }] = await Promise.all([
    supabase.from("profiles").select("id, role, employee_id"),
    supabase.from("employees").select("id, first_name, last_name, job_title"),
    supabase.from("training_guides").select("id, title, category"),
    admin.from("training_progress").select("user_id, guide_id, completed_at, time_spent_seconds, employee_id"),
  ]);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
  const employeeMap = Object.fromEntries((employees ?? []).map(e => [e.id, e]));
  const totalGuides = guides?.length ?? 0;

  // Build user activity rows
  const userRows = authUsers.map(u => {
    const prof = profileMap[u.id];
    const emp = prof?.employee_id ? employeeMap[prof.employee_id] : null;
    const userProgress = (allProgress ?? []).filter(p => p.user_id === u.id);
    const completedCount = userProgress.length;
    const totalTime = userProgress.reduce((s, p) => s + (p.time_spent_seconds ?? 0), 0);
    const pct = totalGuides > 0 ? Math.round((completedCount / totalGuides) * 100) : 0;

    return {
      id: u.id,
      email: u.email ?? "—",
      name: emp ? `${emp.first_name} ${emp.last_name}` : null,
      jobTitle: emp?.job_title ?? null,
      role: prof?.role ?? "—",
      lastLogin: u.last_sign_in_at ?? null,
      completedGuides: completedCount,
      totalTime,
      trainingPct: pct,
    };
  }).sort((a, b) => (b.lastLogin ?? "").localeCompare(a.lastLogin ?? ""));

  // Training progress per guide
  const guideProgress = (guides ?? []).map(g => {
    const completions = (allProgress ?? []).filter(p => p.guide_id === g.id);
    const avgTime = completions.length > 0
      ? Math.round(completions.reduce((s, p) => s + (p.time_spent_seconds ?? 0), 0) / completions.length)
      : null;
    return { ...g, completions: completions.length, avgTime };
  }).sort((a, b) => b.completions - a.completions);

  const totalCompletions = (allProgress ?? []).length;
  const activeUsers = userRows.filter(u => u.lastLogin).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Staff activity and training progress</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Staff Logins", value: userRows.length, icon: Users, color: "bg-blue-500" },
          { label: "Active Users", value: activeUsers, icon: Activity, color: "bg-green-500" },
          { label: "Training Guides", value: totalGuides, icon: BookOpen, color: "bg-purple-500" },
          { label: "Total Completions", value: totalCompletions, icon: CheckCircle, color: "bg-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`${color} rounded-xl p-3 text-white flex-shrink-0`}><Icon size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Activity */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
          <Activity size={15} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Staff Activity</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Staff Member</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Last Login</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Training</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Time Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {userRows.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  {u.name ? (
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      {u.jobTitle && <p className="text-xs text-gray-400">{u.jobTitle}</p>}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-xs">Not linked</span>
                  )}
                </td>
                <td className="px-6 py-3 text-gray-600">{u.email}</td>
                <td className="px-6 py-3">
                  <span className={`badge ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{u.role}</span>
                </td>
                <td className="px-6 py-3 text-gray-500 flex items-center gap-1.5">
                  <Clock size={13} className="text-gray-300" />
                  {u.lastLogin ? formatDate(u.lastLogin) : <span className="text-gray-300">Never</span>}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${u.trainingPct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{u.completedGuides}/{totalGuides}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-gray-500">{formatSeconds(u.totalTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Training guide breakdown */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
          <BookOpen size={15} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Training Guide Completion</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Guide</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Category</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Completed By</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Avg. Time Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {guideProgress.map(g => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{g.title}</td>
                <td className="px-6 py-3 text-gray-500">{g.category}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${activeUsers > 0 ? Math.round((g.completions / activeUsers) * 100) : 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{g.completions} staff</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-gray-500">{formatSeconds(g.avgTime)}</td>
              </tr>
            ))}
            {!guideProgress.length && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No training guides yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
