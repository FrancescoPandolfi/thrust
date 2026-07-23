"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { renamePortfolioAction } from "@/lib/actions/portfolios";
import type { PortfolioRole } from "@/lib/schema";

type Props = {
  initialName: string;
  portfolioRole: PortfolioRole;
};

export function PortfolioRenameForm({ initialName, portfolioRole }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canEdit = portfolioRole === "owner" || portfolioRole === "admin";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;

    setPending(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("name", name);
    const result = await renamePortfolioAction(formData);

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    setName(result.name);
    setSuccess("Portfolio renamed.");
    setPending(false);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Portfolio name</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Rename the active portfolio. The new name appears in the header switcher.
      </p>

      {canEdit ? (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={pending}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-accent focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={pending || name.trim() === "" || name.trim() === initialName.trim()}
            className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save name"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-zinc-300">{initialName}</p>
      )}

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
