"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Download } from "lucide-react";

interface Props {
  submissionId: string;
  hasPassport: boolean;
  hasEmiratesId: boolean;
  hasVisa: boolean;
}

export default function DocLinks({ submissionId, hasPassport, hasEmiratesId, hasVisa }: Props) {
  const supabase = createClient();

  const docs = [
    { label: "Passport", has: hasPassport, field: "doc_passport" },
    { label: "Emirates ID", has: hasEmiratesId, field: "doc_emirates_id" },
    { label: "Visa", has: hasVisa, field: "doc_visa" },
  ];

  const available = docs.filter(d => d.has);
  if (!available.length) return <p className="text-xs text-gray-400">No documents uploaded yet.</p>;

  async function download(field: string) {
    const { data: sub } = await supabase
      .from("onboarding_submissions")
      .select(field)
      .eq("id", submissionId)
      .single();

    const path = (sub as Record<string, string> | null)?.[field];
    if (!path) return;

    const { data } = await supabase.storage.from("onboarding-docs").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <p className="w-full text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Documents</p>
      {available.map(({ label, field }) => (
        <button
          key={field}
          onClick={() => download(field)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          style={{ color: "#232D3E" }}
        >
          <FileText size={13} />
          {label}
          <Download size={12} className="text-gray-400" />
        </button>
      ))}
    </div>
  );
}
