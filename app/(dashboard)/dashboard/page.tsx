import { createClient } from "@/lib/supabase/server";
import { formatCurrency, getMonthName } from "@/lib/utils";
import {
  Users, CalendarCheck, AlertCircle, DollarSign, Bell, CheckCircle,
  Clock, TrendingUp, FileText, ShieldAlert, ArrowRight,
  UserPlus, CalendarDays, Banknote, BookOpen, Megaphone, Shield, UserX, Briefcase, Video,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(email: string | undefined) {
  if (!email) return "there";
  const part = email.split("@")[0].split(".")[0].split("_")[0];
  return part.charAt(0).toUpperCase() + part.slice(1);
}

const quickLinks = [
  { href: "/employees/new", label: "Add Employee", icon: UserPlus, color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
  { href: "/recruitment", label: "Recruitment", icon: Briefcase, color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" },
  { href: "/leave", label: "Leave", icon: CalendarDays, color: "bg-amber-50 text-amber-600 hover:bg-amber-100" },
  { href: "/payroll", label: "Payroll", icon: Banknote, color: "bg-green-50 text-green-600 hover:bg-green-100" },
  { href: "/offboarding", label: "Offboarding", icon: UserX, color: "bg-red-50 text-red-600 hover:bg-red-100" },
  { href: "/benefits", label: "Benefits", icon: Shield, color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
  { href: "/documents", label: "HR Documents", icon: BookOpen, color: "bg-orange-50 text-orange-600 hover:bg-orange-100" },
  { href: "/marketing", label: "Marketing", icon: Megaphone, color: "bg-pink-50 text-pink-600 hover:bg-pink-100" },
  { href: "/training", label: "Training", icon: FileText, color: "bg-teal-50 text-teal-600 hover:bg-teal-100" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, employee_id")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.role === "admin";

  let firstName = "";
  if (profile?.employee_id) {
    const { data: emp } = await supabase.from("employees").select("first_name").eq("id", profile.employee_id).single();
    firstName = emp?.first_name ?? "";
  }
  if (!firstName && user?.email) {
    const { data: empByEmail } = await supabase.from("employees").select("first_name").eq("email", user.email).single();
    firstName = empByEmail?.first_name ?? "";
  }
  if (!firstName) firstName = getFirstName(user?.email);

  const greeting = getGreeting();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const today = now.toISOString().split("T")[0];
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Dubai is fixed UTC+4 (no DST) — compute "today" as a Dubai calendar day for interview lookups.
  const dubaiNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const dubaiY = dubaiNow.getUTCFullYear(), dubaiM = dubaiNow.getUTCMonth(), dubaiD = dubaiNow.getUTCDate();
  const dubaiTodayStart = new Date(Date.UTC(dubaiY, dubaiM, dubaiD, -4, 0, 0)).toISOString();
  const dubaiTodayEnd = new Date(Date.UTC(dubaiY, dubaiM, dubaiD + 1, -4, 0, 0)).toISOString();

  // ── ADMIN DASHBOARD ──────────────────────────────────────────────────────
  if (isAdmin) {
    const [
      { count: activeCount },
      { count: pendingLeave },
      { data: payrollRun },
      { count: pendingDeals },
      { count: pendingOnboarding },
      { count: overdueTasks },
      { count: myTasks },
      { data: visaExpiries },
      { data: upcomingLeave },
      { data: recentLeaveRequests },
      { data: recentTaskNotes },
      { count: candidatesInPipeline },
      { count: newApplicants },
      { data: interviewsToday },
    ] = await Promise.all([
      supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("payroll_runs").select("status").eq("month", month).eq("year", year).single(),
      supabase.from("deals").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("onboarding_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("tasks").select("*", { count: "exact", head: true }).in("status", ["todo", "in_progress"]).lt("due_date", today),
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("assigned_to", user!.id).eq("status", "todo"),
      supabase.from("employees").select("first_name, last_name, visa_expiry").eq("status", "active").not("visa_expiry", "is", null).lte("visa_expiry", in60Days).gte("visa_expiry", today).order("visa_expiry"),
      supabase.from("leave_requests").select("*, employees(first_name, last_name), leave_types(name)").eq("status", "approved").gte("start_date", today).lte("start_date", in7Days).order("start_date"),
      supabase.from("leave_requests").select("*, employees(first_name, last_name), leave_types(name)").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
      supabase.from("task_notes").select("*, tasks!inner(title, created_by)").neq("user_id", user!.id).eq("tasks.created_by", user!.id).gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(5),
      supabase.from("candidates").select("*", { count: "exact", head: true }).eq("talent_pool", false),
      supabase.from("candidates").select("*", { count: "exact", head: true }).eq("talent_pool", false).eq("stage", "new"),
      supabase.from("candidates").select("first_name, last_name, interview_at").not("interview_at", "is", null).gte("interview_at", dubaiTodayStart).lt("interview_at", dubaiTodayEnd).order("interview_at"),
    ]);

    let totalPayroll = 0;
    if (payrollRun?.status === "finalized") {
      const { data } = await supabase.from("payroll_items").select("net_pay, payroll_runs!inner(month, year)").eq("payroll_runs.month", month).eq("payroll_runs.year", year);
      totalPayroll = data?.reduce((s, i) => s + (i.net_pay ?? 0), 0) ?? 0;
    }

    const stats = [
      { label: "Active Employees", value: activeCount ?? 0, icon: Users, color: "from-blue-500 to-blue-600", href: "/employees" },
      { label: "Pending Leave", value: pendingLeave ?? 0, icon: CalendarCheck, color: pendingLeave ? "from-amber-500 to-amber-600" : "from-gray-400 to-gray-500", href: "/leave" },
      { label: `${getMonthName(month)} Payroll`, value: payrollRun?.status === "finalized" ? formatCurrency(totalPayroll) : "Not run yet", icon: DollarSign, color: "from-green-500 to-green-600", href: "/payroll" },
      { label: "Payroll Status", value: payrollRun?.status === "finalized" ? "Finalized ✓" : payrollRun?.status === "draft" ? "Draft" : "Pending", icon: CalendarCheck, color: "from-purple-500 to-purple-600", href: "/payroll" },
      { label: "In Recruitment Pipeline", value: candidatesInPipeline ?? 0, icon: Briefcase, color: "from-indigo-500 to-indigo-600", href: "/recruitment" },
    ];

    type Alert = { type: "warning" | "info" | "success" | "danger"; icon: React.ElementType; message: string; href: string; };
    const alerts: Alert[] = [];

    if ((pendingLeave ?? 0) > 0) alerts.push({ type: "warning", icon: CalendarCheck, message: `${pendingLeave} leave request${pendingLeave === 1 ? "" : "s"} waiting for approval`, href: "/leave" });
    if ((pendingDeals ?? 0) > 0) alerts.push({ type: "info", icon: TrendingUp, message: `${pendingDeals} deal${pendingDeals === 1 ? "" : "s"} pending your approval`, href: "/commissions" });
    if ((pendingOnboarding ?? 0) > 0) alerts.push({ type: "info", icon: FileText, message: `${pendingOnboarding} new onboarding submission${pendingOnboarding === 1 ? "" : "s"} to review`, href: "/onboarding" });
    if ((newApplicants ?? 0) > 0) alerts.push({ type: "info", icon: Briefcase, message: `${newApplicants} new candidate${newApplicants === 1 ? "" : "s"} to review`, href: "/recruitment" });
    if ((interviewsToday ?? []).length > 0) {
      const names = (interviewsToday ?? []).map((c) => `${c.first_name} ${c.last_name}`.trim());
      alerts.push({ type: "success", icon: Video, message: `Interview${names.length > 1 ? "s" : ""} today: ${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2} more` : ""}`, href: "/recruitment" });
    }
    if ((overdueTasks ?? 0) > 0) alerts.push({ type: "danger", icon: AlertCircle, message: `${overdueTasks} task${overdueTasks === 1 ? " is" : "s are"} overdue`, href: "/tasks" });
    if ((myTasks ?? 0) > 0) alerts.push({ type: "info", icon: CheckCircle, message: `You have ${myTasks} task${myTasks === 1 ? "" : "s"} assigned to you`, href: "/tasks" });
    if ((recentTaskNotes ?? []).length > 0) {
      const uniqueTasks = [...new Set((recentTaskNotes ?? []).map(n => (n.tasks as { title: string }).title))];
      alerts.push({ type: "info", icon: Bell, message: `New note${(recentTaskNotes ?? []).length > 1 ? "s" : ""} on: ${uniqueTasks.slice(0, 2).join(", ")}${uniqueTasks.length > 2 ? ` +${uniqueTasks.length - 2} more` : ""}`, href: "/tasks" });
    }
    (visaExpiries ?? []).forEach(emp => {
      const days = Math.ceil((new Date(emp.visa_expiry!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({ type: days <= 14 ? "danger" : "warning", icon: ShieldAlert, message: `${emp.first_name} ${emp.last_name}'s visa expires in ${days} day${days === 1 ? "" : "s"}`, href: "/employees" });
    });
    (upcomingLeave ?? []).forEach(req => {
      const emp = req.employees as { first_name: string; last_name: string } | null;
      const lt = req.leave_types as { name: string } | null;
      alerts.push({ type: "success", icon: CalendarCheck, message: `${emp?.first_name} ${emp?.last_name} is on ${lt?.name ?? "leave"} starting ${req.start_date}`, href: "/leave" });
    });

    const alertColors = {
      warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", text: "text-amber-800" },
      info:    { bg: "bg-blue-50",  border: "border-blue-200",  icon: "text-blue-500",  text: "text-blue-800"  },
      success: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600", text: "text-green-800" },
      danger:  { bg: "bg-red-50",   border: "border-red-200",   icon: "text-red-500",   text: "text-red-800"   },
    };

    return (
      <div className="space-y-6">

        {/* Hero banner */}
        <div className="rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #232D3E 0%, #2d3f56 60%, #3a5068 100%)" }}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #C2B08B 0%, transparent 60%)" }} />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "#ffffff" }}>{greeting}, {firstName} 👋</h1>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Welcome to the Baytify HR Portal</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Baytify</p>
              <p className="font-semibold text-lg" style={{ color: "#C2B08B" }}>Real Estate</p>
              <p className="text-white/40 text-xs">Dubai & Global</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href} className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-white relative overflow-hidden hover:scale-[1.02] transition-transform`}>
              <div className="absolute top-3 right-3 opacity-20"><Icon size={32} /></div>
              <p className="text-2xl font-bold mb-1">{value}</p>
              <p className="text-white/80 text-xs font-medium">{label}</p>
            </Link>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 ? (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Needs your attention</h2>
            </div>
            <div className="space-y-2">
              {alerts.map((alert, i) => {
                const c = alertColors[alert.type];
                const Icon = alert.icon;
                return (
                  <Link key={i} href={alert.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.bg} ${c.border} hover:shadow-sm transition-shadow`}>
                    <Icon size={16} className={c.icon} />
                    <span className={`text-sm font-medium ${c.text}`}>{alert.message}</span>
                    <ArrowRight size={14} className="ml-auto text-gray-300" />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-green-50 border-green-200">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm font-medium text-green-800">All clear — nothing needs your attention right now.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick access */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${color}`}>
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Pending leave */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Pending Leave Requests</h2>
              <Link href="/leave" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
            </div>
            {!recentLeaveRequests?.length ? (
              <div className="text-center py-6">
                <CalendarCheck size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No pending leave requests</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentLeaveRequests.map((req) => {
                  const emp = req.employees as { first_name: string; last_name: string } | null;
                  const lt = req.leave_types as { name: string } | null;
                  const initials = `${emp?.first_name?.[0] ?? ""}${emp?.last_name?.[0] ?? ""}`;
                  return (
                    <div key={req.id} className="flex items-center gap-3 py-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: "#C2B08B" }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{emp?.first_name} {emp?.last_name}</p>
                        <p className="text-xs text-gray-400">{lt?.name} · {req.days_count} days · from {req.start_date}</p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── EMPLOYEE DASHBOARD ────────────────────────────────────────────────────
  const employeeId = profile?.employee_id;

  const [{ data: employee }, { data: leaveRequests }, { data: recentDeals }, { count: pendingTasks }, { data: myTaskNotes }] = await Promise.all([
    supabase.from("employees").select("first_name, last_name, job_title, department").eq("id", employeeId).single(),
    supabase.from("leave_requests").select("*, leave_types(name, color)").eq("employee_id", employeeId).order("created_at", { ascending: false }).limit(5),
    supabase.from("deals").select("*").eq("employee_id", employeeId).order("created_at", { ascending: false }).limit(3),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("assigned_to", user!.id).eq("status", "todo"),
    supabase.from("task_notes").select("*, tasks!inner(title, assigned_to)").neq("user_id", user!.id).eq("tasks.assigned_to", user!.id).gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(5),
  ]);

  type EmpAlert = { type: "success" | "warning" | "info"; message: string; href: string; };
  const empAlerts: EmpAlert[] = [];

  if ((pendingTasks ?? 0) > 0) empAlerts.push({ type: "info", message: `You have ${pendingTasks} task${pendingTasks === 1 ? "" : "s"} to do`, href: "/tasks" });
  if ((myTaskNotes ?? []).length > 0) {
    const uniqueTasks = [...new Set((myTaskNotes ?? []).map(n => (n.tasks as { title: string }).title))];
    empAlerts.push({ type: "info", message: `New note${(myTaskNotes ?? []).length > 1 ? "s" : ""} on your task: ${uniqueTasks.slice(0, 2).join(", ")}`, href: "/tasks" });
  }
  (leaveRequests ?? []).forEach(req => {
    const lt = req.leave_types as { name: string } | null;
    const updatedAt = new Date(req.updated_at ?? req.created_at);
    const daysSince = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (req.status === "approved" && daysSince <= 3) empAlerts.push({ type: "success", message: `Your ${lt?.name ?? "leave"} request (${req.start_date}) has been approved`, href: "/leave" });
    if (req.status === "rejected" && daysSince <= 3) empAlerts.push({ type: "warning", message: `Your ${lt?.name ?? "leave"} request (${req.start_date}) was not approved`, href: "/leave" });
  });
  (recentDeals ?? []).forEach((deal: Record<string, unknown>) => {
    const updatedAt = new Date((deal.updated_at ?? deal.created_at) as string);
    const daysSince = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (deal.status === "approved" && daysSince <= 3) empAlerts.push({ type: "info", message: `Your deal at ${deal.property_address} has been approved`, href: "/commissions" });
    if (deal.status === "paid" && daysSince <= 3) empAlerts.push({ type: "success", message: `Commission paid for ${deal.property_address}!`, href: "/commissions" });
  });

  const empAlertColors = {
    success: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600", text: "text-green-800" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", text: "text-amber-800" },
    info:    { bg: "bg-blue-50",  border: "border-blue-200",  icon: "text-blue-500",  text: "text-blue-800"  },
  };

  const empQuickLinks = [
    { href: "/leave", label: "My Leave", icon: CalendarDays, color: "bg-amber-50 text-amber-600 hover:bg-amber-100" },
    { href: "/commissions", label: "Commissions", icon: TrendingUp, color: "bg-green-50 text-green-600 hover:bg-green-100" },
    { href: "/benefits", label: "My Benefits", icon: Shield, color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
    { href: "/documents", label: "HR Documents", icon: BookOpen, color: "bg-orange-50 text-orange-600 hover:bg-orange-100" },
    { href: "/training", label: "Training", icon: FileText, color: "bg-teal-50 text-teal-600 hover:bg-teal-100" },
    { href: "/tasks", label: "My Tasks", icon: CheckCircle, color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #232D3E 0%, #2d3f56 60%, #3a5068 100%)" }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #C2B08B 0%, transparent 60%)" }} />
        <div className="relative">
          <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "#ffffff" }}>{greeting}, {employee?.first_name ?? firstName} 👋</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{employee?.job_title}{employee?.department ? ` · ${employee.department}` : ""}</p>
        </div>
      </div>

      {/* Alerts */}
      {empAlerts.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Updates for you</h2>
          </div>
          <div className="space-y-2">
            {empAlerts.map((alert, i) => {
              const c = empAlertColors[alert.type];
              const Icon = alert.type === "success" ? CheckCircle : alert.type === "warning" ? AlertCircle : Clock;
              return (
                <Link key={i} href={alert.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.bg} ${c.border} hover:shadow-sm transition-shadow`}>
                  <Icon size={16} className={c.icon} />
                  <span className={`text-sm font-medium ${c.text}`}>{alert.message}</span>
                  <ArrowRight size={14} className="ml-auto text-gray-300" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick access */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 gap-2">
            {empQuickLinks.map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${color}`}>
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Leave history */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">My Leave Requests</h2>
            <Link href="/leave" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          {!leaveRequests?.length ? (
            <div className="text-center py-6">
              <CalendarCheck size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No leave requests yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {leaveRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{(req.leave_types as { name: string })?.name}</p>
                    <p className="text-xs text-gray-400">{req.start_date} → {req.end_date} · {req.days_count} days</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "badge bg-amber-100 text-amber-700",
    approved:  "badge bg-green-100 text-green-700",
    rejected:  "badge bg-red-100 text-red-700",
    draft:     "badge bg-gray-100 text-gray-700",
    finalized: "badge bg-blue-100 text-blue-700",
  };
  return <span className={map[status] ?? "badge bg-gray-100 text-gray-700"}>{status}</span>;
}
