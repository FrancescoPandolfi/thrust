"use client";

import { useState } from "react";
import { formatEur, formatNumber, formatDateTime } from "@/lib/format";

type QuoteSnapshot = {
  isin: string | null;
  symbol: string | null;
  micCode: string | null;
  label: string;
  price: number;
  currency: string;
  priceEur: number;
  fetchedAt: string;
  stale: boolean;
};

type PositionRow = {
  id: string;
  isin: string | null;
  symbol: string | null;
  micCode: string | null;
  label: string;
  title: string;
  quote: QuoteSnapshot | null;
  provider: string;
  ok: boolean;
  error?: string;
};

type TestResponse = {
  isin: string | null;
  symbol: string | null;
  micCode: string | null;
  label?: string;
  provider?: string;
  ok: boolean;
  error?: string;
  quote: QuoteSnapshot | null;
};

type Props = {
  positions: PositionRow[];
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


function formatMicCode(micCode: string | null): string {
  return micCode ?? "—";
}

export function TickerDiagnostics({ positions: initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isinInput, setIsinInput] = useState("");
  const [symbolInput, setSymbolInput] = useState("");
  const [micInput, setMicInput] = useState("");
  const [customResult, setCustomResult] = useState<TestResponse | null>(null);
  const [customLoading, setCustomLoading] = useState(false);

  const okCount = rows.filter((r) => r.ok && !r.quote?.stale).length;
  const staleCount = rows.filter((r) => r.ok && r.quote?.stale).length;
  const missingCount = rows.filter((r) => !r.ok).length;

  async function testInstrument(params: {
    isin?: string | null;
    symbol?: string | null;
    micCode?: string | null;
    refresh?: boolean;
  }): Promise<TestResponse> {
    const query = new URLSearchParams();
    if (params.isin) query.set("isin", params.isin);
    if (params.symbol) query.set("symbol", params.symbol);
    if (params.micCode) query.set("mic_code", params.micCode);
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
          isin: result.isin ?? row.isin,
          symbol: result.symbol ?? row.symbol,
          micCode: result.micCode ?? row.micCode,
          label: result.label ?? row.label,
          provider: result.provider ?? row.provider,
          ok: result.ok,
          error: result.error,
          quote: result.quote,
        };
      }),
    );
  }

  async function liveFetch(row: PositionRow) {
    setLoadingId(row.id);
    try {
      const result = await testInstrument({
        isin: row.isin,
        symbol: row.symbol,
        micCode: row.micCode,
        refresh: true,
      });
      applyResultToRow(row.id, result);
    } finally {
      setLoadingId(null);
    }
  }

  async function testCustomInstrument(event: React.FormEvent) {
    event.preventDefault();
    const isin = isinInput.trim();
    const symbol = symbolInput.trim();
    if (!isin && !symbol) return;

    setCustomLoading(true);
    setCustomResult(null);
    try {
      const result = await testInstrument({
        isin: isin || null,
        symbol: symbol || null,
        micCode: micInput.trim() || null,
        refresh: true,
      });
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
        <h2 className="text-sm font-semibold text-zinc-200">Test an instrument</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Enter ISIN + MIC for ETFs (e.g.{" "}
          <code className="text-zinc-300">IE00B4L5Y983</code> +{" "}
          <code className="text-zinc-300">XAMS</code>) or symbol for crypto (
          <code className="text-zinc-300">BTC-EUR</code>).
        </p>
        <form onSubmit={testCustomInstrument} className="mt-4 flex flex-wrap gap-3">
          <input
            value={isinInput}
            onChange={(e) => setIsinInput(e.target.value)}
            placeholder="ISIN"
            className="min-w-[160px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none"
          />
          <input
            value={micInput}
            onChange={(e) => setMicInput(e.target.value)}
            placeholder="MIC (optional)"
            className="min-w-[120px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none"
          />
          <input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            placeholder="Symbol (crypto)"
            className="min-w-[120px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={customLoading || (!isinInput.trim() && !symbolInput.trim())}
            className="btn-primary rounded-lg px-4 py-2 text-sm"
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
            <p>
              <span className="text-zinc-400">Instrument:</span>{" "}
              <span className="font-mono">{customResult.label ?? "—"}</span>
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
                  {formatDateTime(customResult.quote.fetchedAt)}
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
          <h2 className="text-sm font-semibold text-zinc-200">Portfolio instruments</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Cached prices from DB. Use &quot;Fetch live&quot; to hit Yahoo Finance /
            CoinGecko / Frankfurter for a single instrument.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">ISIN / Symbol</th>
                <th className="px-4 py-3">MIC</th>
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
                    {row.symbol ?? row.isin ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
                    {formatMicCode(row.micCode)}
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
                      ? formatDateTime(row.quote.fetchedAt)
                      : (row.error ?? "—")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => liveFetch(row)}
                      disabled={loadingId === row.id}
                      className="btn-primary rounded-md px-2.5 py-1 text-xs"
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
    </div>
  );
}
