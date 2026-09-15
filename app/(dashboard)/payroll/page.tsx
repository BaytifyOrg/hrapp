import { createClient } from "@/lib/supabase/server";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewPayrollRunButton from "@/components/payroll/NewPayrollRunButton";

export default async function PayrollPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: runs } = await supabase
    .from("payroll_runs")
    .select("*, payroll_items(net_pay)")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly payroll runs and WPS export</p>
        </div>
        <NewPayrollRunButton />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Period</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Employees</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Total Payroll</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {runs?.map((run) => {
              const items = run.payroll_items as { net_pay: number }[];
              const total = items?.reduce((s, i) => s + (i.net_pay ?? 0), 0) ?? 0;
              return (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{getMonthName(run.month)} {run.year}</td>
                  <td className="px-6 py-4 text-gray-600">{items?.length ?? 0}</td>
                  <td className="px-6 py-4 font-semibold">{formatCurrency(total)}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${run.status === "finalized" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/payroll/${run.id}`} className="text-brand-500 hover:underline text-xs font-medium">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!runs?.length && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No payroll runs yet. Click &ldquo;Run Payroll&rdquo; to start.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
