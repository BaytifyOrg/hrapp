import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { formatCurrency, getMonthName } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FinalizeButton from "@/components/payroll/FinalizeButton";
import WPSExportButton from "@/components/payroll/WPSExportButton";

export default async function PayrollRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: run } = await supabase.from("payroll_runs").select("*").eq("id", runId).single();
  if (!run) notFound();

  const { data: items } = await supabase
    .from("payroll_items")
    .select("*, employees(first_name, last_name, job_title, bank_name, iban, bank_routing_code, nationality)")
    .eq("payroll_run_id", runId)
    .order("employees(first_name)");

  const totalGross = items?.reduce((s, i) => s + i.gross_pay, 0) ?? 0;
  const totalNet = items?.reduce((s, i) => s + i.net_pay, 0) ?? 0;
  const totalDeductions = items?.reduce((s, i) => s + i.unpaid_deduction + i.other_deductions, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/payroll" className="btn-secondary">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getMonthName(run.month)} {run.year} Payroll
          </h1>
          <p className="text-sm text-gray-500 mt-1">{items?.length ?? 0} employees</p>
        </div>
        <div className="ml-auto flex gap-3">
          {run.status === "finalized" && items && (
            <WPSExportButton run={run} items={items} />
          )}
          {run.status === "draft" && (
            <FinalizeButton runId={run.id} />
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalGross)}</p>
          <p className="text-sm text-gray-500 mt-1">Gross Payroll</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">- {formatCurrency(totalDeductions)}</p>
          <p className="text-sm text-gray-500 mt-1">Deductions</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNet)}</p>
          <p className="text-sm text-gray-500 mt-1">Net Payroll (WPS Total)</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Employee</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Basic</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Allowances</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Gross</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Deductions</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Net Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items?.map((item) => {
              const emp = item.employees as { first_name: string; last_name: string; job_title: string } | null;
              const allowances = item.housing_allowance + item.transport_allowance + item.other_allowances;
              const deductions = item.unpaid_deduction + item.other_deductions;
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium">{emp?.first_name} {emp?.last_name}</p>
                    <p className="text-xs text-gray-400">{emp?.job_title}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.basic_salary)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(allowances)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.gross_pay)}</td>
                  <td className="px-4 py-3 text-right text-red-500">
                    {deductions > 0 ? `- ${formatCurrency(deductions)}` : "—"}
                    {item.unpaid_days > 0 && <span className="text-xs text-gray-400 ml-1">({item.unpaid_days}d)</span>}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-green-700">{formatCurrency(item.net_pay)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-gray-50 font-semibold">
              <td className="px-6 py-3">Total</td>
              <td className="px-4 py-3 text-right">{formatCurrency(items?.reduce((s, i) => s + i.basic_salary, 0) ?? 0)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(items?.reduce((s, i) => s + i.housing_allowance + i.transport_allowance + i.other_allowances, 0) ?? 0)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totalGross)}</td>
              <td className="px-4 py-3 text-right text-red-500">{totalDeductions > 0 ? `- ${formatCurrency(totalDeductions)}` : "—"}</td>
              <td className="px-6 py-3 text-right text-green-700">{formatCurrency(totalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
