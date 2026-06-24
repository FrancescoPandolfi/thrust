"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearProductionErrorsAction } from "@/lib/actions/errors";
import { formatDateTime } from "@/lib/format";

type ErrorRow = {
  id: string;
  source: string;
  message: string;
  stack: string | null;
  context: string | null;
  createdAt: string;
};

type Stats = {
  total: number;
  last24h: number;
  last7d: number;
  latestAt: string | null;
};

type Props = {
  errors: ErrorRow[];
  stats: Stats;
};

function formatWhen(iso: string): string {
  return formatDateTime(iso);
}

function parseContext(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function ErrorDashboard({ errors, stats }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(errors);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    if (!confirm("Clear all logged production errors?")) return;

    setClearing(true);
    try {
      await clearProductionErrorsAction();
      setRows([]);
      setExpandedId(null);
      router.refresh();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Last 24h</p>
          <p className="mt-1 text-2xl font-semibold text-rose-400">{stats.last24h}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Last 7 days</p>
          <p className="mt-1 text-2xl font-semibold text-amber-400">{stats.last7d}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total logged</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Latest error</p>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            {stats.latestAt ? formatWhen(stats.latestAt) : "None"}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Recent errors</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Captured from API routes, cron jobs, market data fetches, and unhandled server
              failures. Not logged in local development.
            </p>
          </div>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {clearing ? "Clearing…" : "Clear all"}
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            No production errors logged yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const expanded = expandedId === row.id;
                  const context = parseContext(row.context);

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-800/60 align-top even:bg-zinc-900/50"
                    >
                      <td className="px-4 py-2.5 text-xs text-zinc-500">
                        {formatWhen(row.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
                        {row.source}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-200">
                        <p className="break-words">{row.message}</p>
                        {expanded && (
                          <div className="mt-3 space-y-3">
                            {context && (
                              <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                                {JSON.stringify(context, null, 2)}
                              </pre>
                            )}
                            {row.stack && (
                              <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
                                {row.stack}
                              </pre>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {(row.stack || row.context) && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? null : row.id)
                            }
                            className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                          >
                            {expanded ? "Hide" : "Details"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
