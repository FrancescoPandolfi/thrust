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
      const response = await fetch("/api/quotes", { method: "POST" });
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
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {message && (
        <p
          className={`max-w-[min(16rem,calc(100vw-3rem))] rounded-lg border border-zinc-800 bg-zinc-900/95 px-3 py-2 text-xs shadow-lg backdrop-blur ${message.includes("updated") ? "text-emerald-400" : "text-amber-400"}`}
          role="status"
        >
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="btn-primary rounded-lg px-4 py-2.5 text-sm shadow-[0_4px_24px_-4px_rgb(0_0_0/0.5),0_0_20px_-4px_rgb(223_255_0/0.35)]"
      >
        {loading ? "Refreshing…" : "Refresh prices"}
      </button>
    </div>
  );
}
