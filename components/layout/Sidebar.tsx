"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  DollarSign,
  LogOut,
  User,
  KeyRound,
  ClipboardList,
  BarChart2,
  TrendingUp,
  Wrench,
  GraduationCap,
  Activity,
  CheckSquare,
  Menu,
  X,
  UserX,
  Shield,
  BookOpen,
  Megaphone,
  Briefcase,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types";
import { useState } from "react";

const adminNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/onboarding", label: "Onboarding", icon: ClipboardList },
  { href: "/recruitment", label: "Recruitment", icon: Briefcase },
  { href: "/users", label: "Staff Logins", icon: KeyRound },
  { href: "/assets", label: "Asset Passwords", icon: Lock },
  { href: "/leave", label: "Leave", icon: CalendarDays },
  { href: "/commissions", label: "Commissions", icon: TrendingUp },
  { href: "/payroll", label: "Payroll", icon: DollarSign },
  { href: "/offboarding", label: "Offboarding", icon: UserX },
  { href: "/benefits", label: "Benefits", icon: Shield },
  { href: "/documents", label: "HR Documents", icon: BookOpen },
  { href: "/marketing", label: "Marketing Requests", icon: Megaphone },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/tools", label: "Useful Tools", icon: Wrench },
  { href: "/insights", label: "Insights", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

const employeeNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leave", label: "My Leave", icon: CalendarDays },
  { href: "/commissions", label: "My Commissions", icon: TrendingUp },
  { href: "/benefits", label: "My Benefits", icon: Shield },
  { href: "/documents", label: "HR Documents", icon: BookOpen },
  { href: "/marketing", label: "Marketing Requests", icon: Megaphone },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/tools", label: "Useful Tools", icon: Wrench },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/profile", label: "My Profile", icon: User },
];

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const nav = role === "admin" ? adminNav : employeeNav;
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/baytify-b-white.svg" alt="Baytify" width={36} height={36} className="flex-shrink-0" />
          <div>
            <p className="text-white text-base font-semibold leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Baytify</p>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#C2B08B", fontSize: "9px" }}>HR Portal</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/50 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "text-white" : "text-white/50 hover:text-white hover:bg-white/5"
              )}
              style={active ? { backgroundColor: "#C2B08B", color: "#232D3E" } : {}}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ backgroundColor: "#232D3E" }}>
        <div className="flex items-center gap-2.5">
          <Image src="/baytify-b-white.svg" alt="Baytify" width={30} height={30} className="flex-shrink-0" />
          <div>
            <p className="text-white text-base font-semibold leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Baytify</p>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#C2B08B", fontSize: "9px" }}>HR Portal</p>
          </div>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-white/70 hover:text-white p-1">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 flex flex-col min-h-screen" style={{ backgroundColor: "#232D3E" }}>
            <NavContent />
          </div>
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col min-h-screen" style={{ backgroundColor: "#232D3E" }}>
        <NavContent />
      </aside>
    </>
  );
}
