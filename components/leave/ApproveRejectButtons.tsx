"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export default function ApproveRejectButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  async function handle(action: "approved" | "rejected") {
    setLoading(action === "approved" ? "approve" : "reject");
    await fetch(`/api/leave/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, review_note: note || null }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2 flex-shrink-0">
      <div className="flex gap-2">
        <button
          onClick={() => handle("approved")}
          disabled={loading !== null}
          className="btn-primary py-1.5 px-3 text-xs bg-green-600 hover:bg-green-700"
        >
          <Check size={14} /> Approve
        </button>
        <button
          onClick={() => setShowNote((v) => !v)}
          disabled={loading !== null}
          className="btn-danger py-1.5 px-3 text-xs"
        >
          <X size={14} /> Reject
        </button>
      </div>
      {showNote && (
        <div className="flex gap-2 w-full">
          <input
            className="input text-xs flex-1"
            placeholder="Reason (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button onClick={() => handle("rejected")} disabled={loading !== null} className="btn-danger text-xs py-1 px-3">
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
