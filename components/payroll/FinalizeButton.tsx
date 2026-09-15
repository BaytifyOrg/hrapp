"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function FinalizeButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function finalize() {
    if (!confirm("Finalize this payroll run? This cannot be undone.")) return;
    setLoading(true);
    await fetch(`/api/payroll/${runId}/finalize`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={finalize} disabled={loading} className="btn-primary bg-green-600 hover:bg-green-700">
      <CheckCircle size={16} /> {loading ? "Finalizing…" : "Finalize Payroll"}
    </button>
  );
}
