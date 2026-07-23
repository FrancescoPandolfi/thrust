"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePortfolioAction } from "@/lib/actions/portfolios";
import type { PortfolioRole } from "@/lib/schema";

type Props = {
  portfolioName: string;
  portfolioRole: PortfolioRole;
  canDelete: boolean;
};

export function PortfolioDeleteSection({
  portfolioName,
  portfolioRole,
  canDelete,
}: Props) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isOwner = portfolioRole === "owner";
  const nameMatches = confirmName.trim() === portfolioName.trim();

  async function handleDelete() {
    if (!isOwner || !canDelete || !nameMatches) return;

    setPending(true);
    setError(null);

    const result = await deletePortfolioAction();
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!isOwner) {
    return null;
  }

  return (
    <section className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
      <h2 className="text-sm font-semibold text-rose-200">Delete portfolio</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Permanently delete &ldquo;{portfolioName}&rdquo; and all its positions,
        cash balances, flows, and return history.
      </p>

      {!canDelete ? (
        <p className="mt-4 text-sm text-zinc-500">
          You must keep at least one portfolio. Create another portfolio before
          deleting this one.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Type the portfolio name to confirm
            </span>
            <input
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              disabled={pending}
              placeholder={portfolioName}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-rose-400 focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={pending || !nameMatches}
            onClick={handleDelete}
            className="cursor-pointer rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete portfolio"}
          </button>
        </div>
      )}
    </section>
  );
}
