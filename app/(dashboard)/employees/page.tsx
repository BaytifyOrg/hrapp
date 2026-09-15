import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { Employee } from "@/types";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status = "active" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("employees")
    .select("id, first_name, last_name, email, job_title, department, status, start_date, nationality")
    .order("first_name");

  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: employees } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">{employees?.length ?? 0} records</p>
        </div>
        <Link href="/employees/new" className="btn-primary">
          <Plus size={16} /> Add Employee
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <form className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={q} className="input pl-9" placeholder="Search by name or email…" />
          <input type="hidden" name="status" value={status} />
        </form>
        <div className="flex gap-1 rounded-lg border border-gray-300 bg-white p-1">
          {["active", "onboarding", "all", "terminated"].map((s) => (
            <Link
              key={s}
              href={`/employees?status=${s}${q ? `&q=${q}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                status === s ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Role / Department</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Start Date</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees?.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  <p>{emp.job_title ?? "—"}</p>
                  <p className="text-xs text-gray-400">{emp.department ?? "—"}</p>
                </td>
                <td className="px-6 py-4 text-gray-600">{formatDate(emp.start_date)}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={emp.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/employees/${emp.id}`} className="text-brand-500 hover:underline text-xs font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!employees?.length && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Employee["status"] }) {
  const map = {
    onboarding: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    terminated: "bg-red-100 text-red-600",
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}
