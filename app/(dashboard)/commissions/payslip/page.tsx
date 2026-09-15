import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, getSlabRate, COMMISSION_SLABS, getPayrollPeriod } from "@/lib/utils";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function PayslipPage({ searchParams }: { searchParams: Promise<{ employeeId?: string; month?: string; year?: string }> }) {
  const { employeeId, month, year } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/commissions");

  if (!employeeId || !month || !year) redirect("/commissions");

  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  const [{ data: employee }, { data: deals }] = await Promise.all([
    supabase.from("employees").select("id, first_name, last_name, job_title, email, commission_split, commission_type").eq("id", employeeId).single(),
    supabase.from("deals").select("*").eq("employee_id", employeeId).eq("status", "paid"),
  ]);

  if (!employee) redirect("/commissions");

  // Payroll period: 25th of previous month → 24th of current month
  const { start: periodStart, end: periodEnd, label: periodLabel } = getPayrollPeriod(monthNum, yearNum);

  const monthDeals = (deals ?? []).filter(d => {
    const dd = new Date(d.deal_date);
    return dd >= periodStart && dd <= periodEnd;
  });

  const isSlabEmployee = (employee as Record<string, unknown>).commission_type === "slab";
  const fixedSplit = (employee as Record<string, unknown>).commission_split as number ?? 50;

  const totalGross = monthDeals.reduce((s, d) => s + (d.commission_amount ?? 0), 0);
  const slabRate = isSlabEmployee ? getSlabRate(totalGross) : null;

  const dealsWithAgent = monthDeals.map(d => {
    let rate: number;
    if (d.lead_source === "property_finder" || d.lead_source === "bayut") {
      rate = 50;
    } else if (isSlabEmployee) {
      rate = slabRate ?? 55;
    } else {
      rate = fixedSplit;
    }
    const agentAmt = d.agent_commission ?? ((d.commission_amount ?? 0) * rate / 100);
    return { ...d, effectiveRate: rate, agentAmt };
  });

  const totalAgent = dealsWithAgent.reduce((s, d) => s + d.agentAmt, 0);
  const totalAgency = totalGross - totalAgent;

  const pfBayutDeals = dealsWithAgent.filter(d => d.lead_source === "property_finder" || d.lead_source === "bayut");

  const monthName = new Date(yearNum, monthNum - 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
  const generatedDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  function sourceLabel(src: string | null) {
    if (src === "property_finder") return "Property Finder";
    if (src === "bayut") return "Bayut";
    return "Direct";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <a href="/commissions" className="text-sm text-gray-500 hover:text-gray-700">← Back to Commissions</a>
        <PrintButton />
      </div>

      <div id="payslip" className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-3xl mx-auto print:shadow-none print:border-none print:rounded-none">

        {/* Header */}
        <div className="px-10 py-8 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #232D3E 0%, #2d3a4f 100%)" }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Baytify</h1>
              <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: "#C2B08B" }}>Real Estate · HR Portal</p>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold text-lg">Payslip</p>
              <p style={{ color: "#C2B08B" }} className="text-sm">{monthName}</p>
            </div>
          </div>
        </div>

        <div className="px-10 py-8">
          {/* Agent info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Agent</p>
              <p className="text-xl font-semibold text-gray-900">{employee.first_name} {employee.last_name}</p>
              {employee.job_title && <p className="text-sm text-gray-500">{employee.job_title}</p>}
              {employee.email && <p className="text-sm text-gray-500">{employee.email}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Statement Details</p>
              <div className="space-y-1 text-sm">
                <div className="flex gap-2"><span className="text-gray-400 w-36">Pay Period:</span><span className="font-medium">{periodLabel}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-36">Payroll Month:</span><span className="font-medium">{monthName}</span></div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-36">Commission Type:</span>
                  <span className="font-medium">{isSlabEmployee ? "Performance Slab" : `Fixed ${fixedSplit}/${100 - fixedSplit}`}</span>
                </div>
                {isSlabEmployee && slabRate !== null && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-36">Tier Achieved:</span>
                    <span className="font-semibold text-purple-700">{slabRate}% (on {formatCurrency(totalGross)} gross)</span>
                  </div>
                )}
                <div className="flex gap-2"><span className="text-gray-400 w-36">Generated:</span><span className="font-medium">{generatedDate}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-36">Total Deals:</span><span className="font-medium">{monthDeals.length}</span></div>
              </div>
            </div>
          </div>

          {/* Slab tier chart */}
          {isSlabEmployee && (
            <div className="mb-6 border border-purple-200 rounded-xl overflow-hidden">
              <div className="bg-purple-50 px-5 py-2.5 border-b border-purple-200">
                <p className="text-xs text-purple-600 uppercase tracking-wide font-medium">Commission Slab — {periodLabel}</p>
              </div>
              <div className="flex divide-x divide-purple-100">
                {[...COMMISSION_SLABS].reverse().map(slab => {
                  const isActive = slabRate === slab.rate;
                  const nextSlab = COMMISSION_SLABS.find(s => s.min > slab.min);
                  const rangeLabel = nextSlab ? `AED ${slab.min.toLocaleString()}–${(nextSlab.min - 1).toLocaleString()}` : `AED ${slab.min.toLocaleString()}+`;
                  return (
                    <div key={slab.rate} className={`flex-1 px-3 py-3 text-center ${isActive ? "bg-purple-100" : ""}`}>
                      <p className={`text-lg font-bold ${isActive ? "text-purple-800" : "text-gray-400"}`}>{slab.rate}%</p>
                      <p className={`text-xs mt-0.5 ${isActive ? "text-purple-600" : "text-gray-400"}`}>{rangeLabel}</p>
                      {isActive && <p className="text-xs font-semibold text-purple-700 mt-1">✓ This period</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deals table */}
          {dealsWithAgent.length > 0 ? (
            <div className="mb-8">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Deal Breakdown</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Property</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Source</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Total Comm.</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Rate</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Agent Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dealsWithAgent.map(deal => (
                      <tr key={deal.id}>
                        <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{deal.property_address}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{deal.deal_type}</td>
                        <td className="px-4 py-3 text-gray-500">{sourceLabel(deal.lead_source)}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(deal.deal_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(deal.commission_amount ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{deal.effectiveRate}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(deal.agentAmt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mb-8 bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
              No paid deals in this period ({periodLabel}).
            </div>
          )}

          {/* Summary */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Summary</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex justify-between px-6 py-3 text-sm">
                <span className="text-gray-500">Gross Commission ({periodLabel})</span>
                <span className="font-medium">{formatCurrency(totalGross)}</span>
              </div>
              {pfBayutDeals.length > 0 && (
                <div className="flex justify-between px-6 py-3 text-sm">
                  <span className="text-gray-500">PF / Bayut deals — capped at 50%</span>
                  <span className="text-gray-500">{pfBayutDeals.length} deal{pfBayutDeals.length > 1 ? "s" : ""}</span>
                </div>
              )}
              {isSlabEmployee && slabRate !== null && (
                <div className="flex justify-between px-6 py-3 text-sm">
                  <span className="text-gray-500">Slab tier applied on direct deals</span>
                  <span className="font-medium text-purple-700">{slabRate}%</span>
                </div>
              )}
              <div className="flex justify-between px-6 py-3 text-sm">
                <span className="text-gray-500">Agency Portion</span>
                <span className="font-medium text-gray-700">{formatCurrency(totalAgency)}</span>
              </div>
              <div className="flex justify-between px-6 py-4" style={{ backgroundColor: "#f8fdf9" }}>
                <span className="font-semibold text-gray-900">Agent Payout</span>
                <span className="text-xl font-bold text-green-700">{formatCurrency(totalAgent)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            This statement was generated by Baytify HR Portal · {generatedDate} · Confidential
          </p>
        </div>
      </div>
    </div>
  );
}
