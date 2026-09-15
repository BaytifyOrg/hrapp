"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const INTERVAL = 30_000; // refresh every 30 seconds

export default function AutoRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh());
      setLastRefreshed(new Date());
      setSecondsAgo(0);
    }, INTERVAL);
    return () => clearInterval(interval);
  }, [router]);

  // Count up seconds since last refresh
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(s => s + 1);
    }, 1000);
    return () => clearInterval(tick);
  }, [lastRefreshed]);

  function handleManualRefresh() {
    startTransition(() => router.refresh());
    setLastRefreshed(new Date());
    setSecondsAgo(0);
  }

  return (
    <button
      onClick={handleManualRefresh}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      title="Refresh leave requests"
    >
      <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
      {isPending ? "Refreshing…" : `Updated ${secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}`}
    </button>
  );
}
