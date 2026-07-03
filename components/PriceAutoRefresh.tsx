"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { QUOTE_REFRESH_INTERVAL_MS } from "@/lib/quote-refresh";
import type { UserRole } from "@/lib/schema";

type PriceAutoRefreshProps = {
  role: UserRole;
};

export function PriceAutoRefresh({ role }: PriceAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    async function refreshPrices() {
      if (role === "admin") {
        try {
          await fetch("/api/quotes", { method: "POST" });
        } catch {
          // Ignore — cron or manual refresh may have already updated cache.
        }
      }
      router.refresh();
    }

    const id = window.setInterval(refreshPrices, QUOTE_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [role, router]);

  return null;
}
