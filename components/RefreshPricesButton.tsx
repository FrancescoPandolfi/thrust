"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshPricesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/quotes?refresh=1");
      const data = (await response.json()) as {
        error?: string;
        rateLimited?: boolean;
      };

      if (!response.ok) {
        setMessage(data.error ?? "Refresh failed. Try again in 15 minutes.");
        return;
      }

      router.refresh();
      setMessage("Prices updated.");
    } catch {
      setMessage("Refresh failed. Try again in 15 minutes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50"
      >
        {loading ? "Refreshing…" : "Refresh prices"}
      </button>
      {message && (
        <p
          className={`text-xs ${message.includes("updated") ? "text-emerald-400" : "text-amber-400"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
