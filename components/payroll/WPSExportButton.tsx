"use client";

import { useState } from "react";
import { generateWPSSIF, downloadSIF } from "@/lib/wps";
import { PayrollItem, PayrollRun } from "@/types";
import { Download } from "lucide-react";

interface Props {
  run: PayrollRun;
  items: PayrollItem[];
}

export default function WPSExportButton({ run, items }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    employerName: "",
    employerMOLId: "",
    agentBankCode: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  function handleExport() {
    const sif = generateWPSSIF(run, items, form);
    downloadSIF(sif, run.month, run.year);
    setShowDialog(false);
  }

  return (
    <>
      <button onClick={() => setShowDialog(true)} className="btn-secondary">
        <Download size={16} /> Export WPS File
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-gray-900 text-lg mb-1">WPS Export</h2>
            <p className="text-sm text-gray-500 mb-5">
              Enter your company&apos;s WPS details. These are provided by your bank / WPS agent.
            </p>
            <div className="space-y-3">
              {[
                ["Company Name (as registered with MOL)", "employerName", "text", "Al Noor Real Estate LLC"],
                ["MOL Employer ID", "employerMOLId", "text", "123456789"],
                ["Agent Bank Code (from your bank)", "agentBankCode", "text", "EBILAEAD"],
                ["Payment Date", "paymentDate", "date", ""],
              ].map(([label, key, type, placeholder]) => (
                <div key={key as string}>
                  <label className="label">{label as string}</label>
                  <input
                    type={type as string}
                    className="input"
                    placeholder={placeholder as string}
                    value={(form as Record<string, string>)[key as string]}
                    onChange={(e) => setForm((f) => ({ ...f, [key as string]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleExport}
                disabled={!form.employerName || !form.employerMOLId || !form.agentBankCode}
                className="btn-primary flex-1 justify-center"
              >
                <Download size={16} /> Download .SIF File
              </button>
              <button onClick={() => setShowDialog(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
