"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

type ReasonType = "terminated" | "resigned";

function calcEOS(
  basicSalary: number,
  startDate: Date,
  endDate: Date,
  reason: ReasonType
): { years: number; months: number; days: number; gratuity: number; breakdown: string[] } {
  const breakdown: string[] = [];

  const totalMs = endDate.getTime() - startDate.getTime();
  const totalDays = totalMs / (1000 * 60 * 60 * 24);
  const totalYears = totalDays / 365.25;

  const years = Math.floor(totalYears);
  const remainingDays = totalDays - years * 365.25;
  const months = Math.floor(remainingDays / 30.44);
  const days = Math.floor(remainingDays - months * 30.44);

  if (totalYears < 1) {
    breakdown.push("Less than 1 year of service — no gratuity applicable under UAE Labour Law.");
    return { years, months, days, gratuity: 0, breakdown };
  }

  const dailyRate = basicSalary / 30;

  let gratuity = 0;

  if (reason === "terminated") {
    // Full gratuity for all years
    if (totalYears <= 5) {
      gratuity = dailyRate * 21 * totalYears;
      breakdown.push(`21 days basic salary × ${totalYears.toFixed(2)} years = AED ${gratuity.toFixed(2)}`);
    } else {
      const first5 = dailyRate * 21 * 5;
      const beyond5 = dailyRate * 30 * (totalYears - 5);
      gratuity = first5 + beyond5;
      breakdown.push(`First 5 years: 21 days × 5 = AED ${first5.toFixed(2)}`);
      breakdown.push(`Beyond 5 years: 30 days × ${(totalYears - 5).toFixed(2)} years = AED ${beyond5.toFixed(2)}`);
    }
  } else {
    // Resigned — reduced gratuity
    if (totalYears < 1) {
      gratuity = 0;
    } else if (totalYears < 3) {
      const full = dailyRate * 21 * totalYears;
      gratuity = full / 3;
      breakdown.push(`1–3 years resigned: 1/3 of full gratuity (AED ${full.toFixed(2)}) = AED ${gratuity.toFixed(2)}`);
    } else if (totalYears < 5) {
      const full = dailyRate * 21 * totalYears;
      gratuity = (full * 2) / 3;
      breakdown.push(`3–5 years resigned: 2/3 of full gratuity (AED ${full.toFixed(2)}) = AED ${gratuity.toFixed(2)}`);
    } else if (totalYears <= 5) {
      gratuity = dailyRate * 21 * totalYears;
      breakdown.push(`5+ years resigned: full gratuity — 21 days × ${totalYears.toFixed(2)} years = AED ${gratuity.toFixed(2)}`);
    } else {
      const first5 = dailyRate * 21 * 5;
      const beyond5 = dailyRate * 30 * (totalYears - 5);
      gratuity = first5 + beyond5;
      breakdown.push(`First 5 years: 21 days × 5 = AED ${first5.toFixed(2)}`);
      breakdown.push(`Beyond 5 years: 30 days × ${(totalYears - 5).toFixed(2)} years = AED ${beyond5.toFixed(2)}`);
    }
  }

  // Cap at 2 years' basic salary
  const cap = basicSalary * 24;
  if (gratuity > cap) {
    breakdown.push(`Capped at 2 years' salary (AED ${cap.toFixed(2)})`);
    gratuity = cap;
  }

  return { years, months, days, gratuity, breakdown };
}

export default function EOSCalculator() {
  const [basicSalary, setBasicSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState<ReasonType>("terminated");
  const [result, setResult] = useState<ReturnType<typeof calcEOS> | null>(null);

  function calculate() {
    const salary = parseFloat(basicSalary);
    if (!salary || !startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return;
    setResult(calcEOS(salary, start, end, reason));
  }

  return (
    <section className="card">
      <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Calculator size={16} /> End of Service (EOS) Calculator
      </h2>
      <p className="text-xs text-gray-400 mb-5">Based on UAE Federal Decree Law No. 33 of 2021</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Basic Salary (AED/month)</label>
          <input
            className="input"
            type="number"
            placeholder="e.g. 10000"
            value={basicSalary}
            onChange={(e) => setBasicSalary(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Basic salary only — excludes allowances</p>
        </div>

        <div>
          <label className="label">Reason for Leaving</label>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value as ReasonType)}>
            <option value="terminated">Terminated by Company</option>
            <option value="resigned">Resigned</option>
          </select>
        </div>

        <div>
          <label className="label">Start Date</label>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Last Working Day</label>
          <input
            className="input"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <button className="btn-primary w-full" onClick={calculate}>
        Calculate Gratuity
      </button>

      {result && (
        <div className="mt-6 border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">
              Service Period: {result.years} yr{result.years !== 1 ? "s" : ""} {result.months} mo{result.months !== 1 ? "s" : ""} {result.days} day{result.days !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="px-4 py-4">
            {result.breakdown.length > 0 && (
              <ul className="text-sm text-gray-500 space-y-1 mb-4">
                {result.breakdown.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-300 mt-0.5">•</span>
                    {line}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-gray-700">Total Gratuity</span>
              <span className="text-xl font-bold text-green-600">
                AED {result.gratuity.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {result.gratuity === 0 && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                No gratuity is payable for service under 1 year.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
