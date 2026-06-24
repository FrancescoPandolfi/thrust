"use client";

import { useState } from "react";
import { formatEur, formatNumber } from "@/lib/format";

type QuoteSnapshot = {
  symbol: string;
  price: number;
  currency: string;
  priceEur: number;
  fetchedAt: string;
  stale: boolean;
};

type PositionRow = {
  id: string;
  googleTicker: string;
  yahooSymbol: string;
  title: string;
  quote: QuoteSnapshot | null;
  provider: string;
  ok: boolean;
  error?: string;
};

type TestResponse = {
  googleTicker?: string;
  yahooSymbol: string | null;
  resolved: boolean;
  provider?: string;
  ok: boolean;
  error?: string;
  quote: QuoteSnapshot | null;
};

type Props = {
  positions: PositionRow[];
  tickerMap: Record<string, string>;
};

function statusBadge(ok: boolean, stale?: boolean) {
  if (ok && !stale) {
    return (
      <span className="rounded bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-400">
        OK
      </span>
    );
  }
  if (ok && stale) {
    return (
      <span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-400">
        Stale
      </span>
    );
  }
  return (
    <span className="rounded bg-rose-900/50 px-2 py-0.5 text-xs text-rose-400">
      Missing
    </span>
  );
}

function formatFetchedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-EU", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function TickerDiagnostics({ positions: initial, tickerMap }: Props) {
  const [rows, setRows] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [customResult, setCustomResult] = useState<TestResponse | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const okCount = rows.filter((r) => r.ok && !r.quote?.stale).length;
  const staleCount = rows.filter((r) => r.ok && r.quote?.stale).length;
  const missingCount = rows.filter((r) => !r.ok).length;

  async function testSymbol(params: {
    symbol?: string;
    googleTicker?: string;
    refresh?: boolean;
  }): Promise<TestResponse> {
    const query = new URLSearchParams();
    if (params.symbol) query.set("symbol", params.symbol);
    if (params.googleTicker) query.set("googleTicker", params.googleTicker);
    if (params.refresh) query.set("refresh", "1");

    const response = await fetch(`/api/tickers/test?${query}`);
    return response.json() as Promise<TestResponse>;
  }

  function applyResultToRow(id: string, result: TestResponse) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          yahooSymbol: result.yahooSymbol ?? row.yahooSymbol,
          provider: result.provider ?? row.provider,
          ok: result.ok,
          error: result.error,
          quote: result.quote,
        };
      }),
    );
  }

  async function liveFetch(id: string, yahooSymbol: string) {
    setLoadingId(id);
    try {
      const result = await testSymbol({ symbol: yahooSymbol, refresh: true });
      applyResultToRow(id, result);
    } finally {
      setLoadingId(null);
    }
  }

  async function testCustomTicker(event: React.FormEvent) {
    event.preventDefault();
    const input = customInput.trim();
    if (!input) return;

    setCustomLoading(true);
    setCustomResult(null);
    try {
      const looksLikeGoogle = input.includes(":");
      const result = await testSymbol(
        looksLikeGoogle
          ? { googleTicker: input, refresh: true }
          : { symbol: input, refresh: true },
      );
      setCustomResult(result);
    } finally {
      setCustomLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Fresh</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">{okCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Stale</p>
          <p className="mt-1 text-2xl font-semibold text-amber-400">{staleCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Missing</p>
          <p className="mt-1 text-2xl font-semibold text-rose-400">{missingCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Test a ticker</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Enter a Google ticker (e.g. <code className="text-zinc-300">AMS:IWDA</code>
          ) or a Yahoo symbol (e.g.{" "}
          <code className="text-zinc-300">IWDA.AS</code>). Fetches live from the
          provider.
        </p>
        <form onSubmit={testCustomTicker} className="mt-4 flex flex-wrap gap-3">
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="AMS:IWDA or IWDA.AS"
            className="min-w-[220px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={customLoading || !customInput.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {customLoading ? "Fetching…" : "Fetch live"}
          </button>
        </form>

        {customResult && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              customResult.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                : "border-rose-500/30 bg-rose-500/10 text-rose-100"
            }`}
          >
            {customResult.googleTicker && (
              <p>
                <span className="text-zinc-400">Google:</span>{" "}
                <span className="font-mono">{customResult.googleTicker}</span>
              </p>
            )}
            <p>
              <span className="text-zinc-400">Yahoo:</span>{" "}
              <span className="font-mono">{customResult.yahooSymbol ?? "—"}</span>
              {!customResult.resolved && " (unresolved)"}
            </p>
            {customResult.provider && (
              <p>
                <span className="text-zinc-400">Provider:</span>{" "}
                {customResult.provider}
              </p>
            )}
            {customResult.quote ? (
              <>
                <p className="mt-2 font-mono tabular-nums">
                  {formatEur(customResult.quote.priceEur)}
                </p>
                {customResult.quote.currency !== "EUR" && (
                  <p className="text-xs text-zinc-400">
                    Source: {formatNumber(customResult.quote.price, 4)}{" "}
                    {customResult.quote.currency}
                  </p>
                )}
                <p className="text-xs text-zinc-400">
                  {formatFetchedAt(customResult.quote.fetchedAt)}
                </p>
              </>
            ) : (
              <p className="mt-2">{customResult.error ?? "No quote returned"}</p>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-200">Portfolio tickers</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Cached prices from DB. Use &quot;Fetch live&quot; to hit Yahoo / CoinGecko /
            Frankfurter for a single symbol (bypasses bulk rate limit).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Google ticker</th>
                <th className="px-4 py-3">Yahoo symbol</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Price (EUR)</th>
                <th className="px-4 py-3">Fetched</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-800/60 even:bg-zinc-900/50"
                >
                  <td className="px-4 py-2.5">
                    {statusBadge(row.ok, row.quote?.stale)}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-200">{row.title}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
                    {row.googleTicker}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
                    {row.yahooSymbol}
                  </td>
                  <td className="px-4 py-2.5 text-xs capitalize text-zinc-400">
                    {row.provider}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-200">
                    {row.quote && row.quote.priceEur > 0
                      ? formatEur(row.quote.priceEur)
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {row.quote
                      ? formatFetchedAt(row.quote.fetchedAt)
                      : (row.error ?? "—")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => liveFetch(row.id, row.yahooSymbol)}
                      disabled={loadingId === row.id}
                      className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {loadingId === row.id ? "…" : "Fetch live"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900">
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800/50"
        >
          Ticker map (Google → Yahoo)
          <span className="text-zinc-500">{showMap ? "▲" : "▼"}</span>
        </button>
        {showMap && (
          <div className="overflow-x-auto border-t border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-2">Google ticker</th>
                  <th className="px-4 py-2">Yahoo symbol</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(tickerMap).map(([google, yahoo]) => (
                  <tr key={google} className="border-b border-zinc-800/60">
                    <td className="px-4 py-2 font-mono text-xs text-zinc-300">
                      {google}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-300">
                      {yahoo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
