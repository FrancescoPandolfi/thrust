"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  resetAllPortfolioReturnsAction,
  resetPortfolioReturnsAction,
} from "@/lib/actions/portfolios";
import type { PortfolioRole } from "@/lib/schema";

type Props = {
  portfolioName: string;
  portfolioRole: PortfolioRole;
  showResetAll?: boolean;
};

export function PortfolioReturnsResetSection({
  portfolioName,
  portfolioRole,
  showResetAll = false,
}: Props) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isOwner = portfolioRole === "owner";
  const nameMatches = confirmName.trim() === portfolioName.trim();

  async function handleResetCurrent() {
    if (!isOwner || !nameMatches) return;
    setPending(true);
    setError(null);
    setSuccess(null);

    const result = await resetPortfolioReturnsAction(true);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    setSuccess(
      `Removed ${result.snapshotsDeleted} snapshots and ${result.flowsDeleted} capital flows.` +
        (result.baselineCaptured ? " Today's baseline snapshot was captured." : ""),
    );
    setConfirmName("");
    setPending(false);
    router.refresh();
  }

  async function handleResetAll() {
    if (!isOwner) return;
    setPending(true);
    setError(null);
    setSuccess(null);

    const result = await resetAllPortfolioReturnsAction(true);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    setSuccess(
      `Reset ${result.portfolios.length} portfolios (${result.totalSnapshots} snapshots, ${result.totalFlows} flows removed).`,
    );
    setPending(false);
    router.refresh();
  }

  if (!isOwner) {
    return null;
  }

  return (
    <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <h2 className="text-sm font-semibold text-amber-200">Reset return history</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Delete daily snapshots and capital flows for this portfolio. Positions and
        cash stay unchanged. Use this after restructuring portfolios so returns
        start clean. A baseline snapshot for today is captured automatically.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Type &ldquo;{portfolioName}&rdquo; to reset this portfolio
          </span>
          <input
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            disabled={pending}
            placeholder={portfolioName}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
          />
        </label>

        <button
          type="button"
          disabled={pending || !nameMatches}
          onClick={handleResetCurrent}
          className="cursor-pointer rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Resetting…" : "Reset this portfolio"}
        </button>

        {showResetAll && (
          <button
            type="button"
            disabled={pending}
            onClick={handleResetAll}
            className="ml-0 block cursor-pointer text-sm text-amber-200/80 underline-offset-2 hover:underline disabled:opacity-50 sm:ml-2 sm:inline"
          >
            Reset all portfolios
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </p>
      )}
    </section>
  );
}
