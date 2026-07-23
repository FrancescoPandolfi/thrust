"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPortfolioAction,
  setAggregateViewAction,
  switchPortfolioAction,
} from "@/lib/actions/portfolios";
import type { PortfolioSummary, PortfolioViewContext } from "@/lib/portfolios";

type Props = {
  portfolios: PortfolioSummary[];
  context: PortfolioViewContext | null;
};

export function PortfolioSwitcher({ portfolios, context }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [showAggregate, setShowAggregate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedAggregate, setSelectedAggregate] = useState<Set<string>>(
    () =>
      new Set(
        context?.viewMode === "aggregate"
          ? context.aggregatePortfolioIds
          : portfolios.map((p) => p.id),
      ),
  );

  const activeLabel =
    context?.viewMode === "aggregate"
      ? `Combined (${context.aggregatePortfolioIds.length})`
      : (context?.name ?? "Portfolio");

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSwitch(portfolioId: string) {
    const result = await switchPortfolioAction(portfolioId);
    if (result.ok) refresh();
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    const formData = new FormData();
    formData.set("name", createName);
    const result = await createPortfolioAction(formData);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    setCreateName("");
    setShowCreate(false);
    refresh();
  }

  async function handleAggregate() {
    const ids = [...selectedAggregate];
    const result = await setAggregateViewAction(ids);
    if (result.ok) {
      setShowAggregate(false);
      refresh();
    }
  }

  function toggleAggregateId(id: string) {
    setSelectedAggregate((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (portfolios.length === 0) return null;

  return (
    <div className="relative">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
          <span className="max-w-[140px] truncate font-medium">{activeLabel}</span>
          <span className="text-zinc-500">▾</span>
        </summary>
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your portfolios
          </div>
          {portfolios.map((portfolio) => {
            const active =
              context?.viewMode === "single" && context.id === portfolio.id;
            return (
              <button
                key={portfolio.id}
                type="button"
                disabled={pending}
                onClick={() => handleSwitch(portfolio.id)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800 disabled:opacity-60 ${
                  active ? "text-accent" : "text-zinc-200"
                }`}
              >
                <span className="truncate">{portfolio.name}</span>
                {active && <span className="text-xs">✓</span>}
              </button>
            );
          })}

          <div className="my-1 border-t border-zinc-800" />

          <button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v);
              setShowAggregate(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
          >
            + New portfolio
          </button>

          {portfolios.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setShowAggregate((v) => !v);
                setShowCreate(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Combined view…
            </button>
          )}

          {showCreate && (
            <form onSubmit={handleCreate} className="space-y-2 border-t border-zinc-800 p-3">
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Portfolio name"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-accent focus:outline-none"
              />
              {createError && (
                <p className="text-xs text-rose-300">{createError}</p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="btn-primary w-full rounded-md px-2 py-1.5 text-sm disabled:opacity-60"
              >
                Create
              </button>
            </form>
          )}

          {showAggregate && (
            <div className="space-y-2 border-t border-zinc-800 p-3">
              <p className="text-xs text-zinc-400">
                Select portfolios to combine (read-only).
              </p>
              {portfolios.map((portfolio) => (
                <label
                  key={portfolio.id}
                  className="flex items-center gap-2 text-sm text-zinc-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedAggregate.has(portfolio.id)}
                    onChange={() => toggleAggregateId(portfolio.id)}
                    className="rounded border-zinc-600"
                  />
                  {portfolio.name}
                </label>
              ))}
              <button
                type="button"
                disabled={pending || selectedAggregate.size < 2}
                onClick={handleAggregate}
                className="btn-primary w-full rounded-md px-2 py-1.5 text-sm disabled:opacity-60"
              >
                Show combined
              </button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
