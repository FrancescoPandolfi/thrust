import Link from "next/link";
import { InstrumentValueChart } from "@/components/charts/InstrumentValueChart";
import { MetricCard } from "@/components/MetricCard";
import { CATEGORY_LABELS } from "@/lib/calculations";
import type { InstrumentDetail } from "@/lib/instrument-detail";
import {
  formatEur,
  formatNumber,
  formatPct,
  formatUsd,
} from "@/lib/format";
import { formatInstrumentLabel, positionToInstrument } from "@/lib/instruments";
import { periodReturnPct, type PriceHistoryRange } from "@/lib/price-history";

const RANGE_OPTIONS: { id: PriceHistoryRange; label: string }[] = [
  { id: "3M", label: "3M" },
  { id: "6M", label: "6M" },
  { id: "1Y", label: "1Y" },
  { id: "All", label: "All" },
];

type Props = {
  detail: InstrumentDetail;
  symbol: string;
  range: PriceHistoryRange;
};

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm text-zinc-200">{value}</p>
    </div>
  );
}

export function InstrumentDetailView({ detail, symbol, range }: Props) {
  const { position, flows, metadata, priceHistory, provider } = detail;
  const plPositive = position.plEur >= 0;
  const plColor = plPositive ? "text-emerald-400" : "text-rose-400";
  const plPrefix = plPositive ? "+" : "";
  const periodReturn = periodReturnPct(priceHistory);
  const periodPositive = periodReturn != null && periodReturn >= 0;
  const loadValueEur = Number.parseFloat(position.loadValueEur);
  const shares = Number.parseFloat(position.shares);
  const avgCostEur = shares > 0 ? loadValueEur / shares : 0;
  const instrumentLabel = formatInstrumentLabel(positionToInstrument(position));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          ← Back to portfolio
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-300">
                {CATEGORY_LABELS[position.category] ?? position.category}
              </span>
              <span className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-xs text-zinc-500">
                {provider}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-100">
              {position.title}
            </h1>
            <p className="mt-1 font-mono text-sm text-zinc-400">{instrumentLabel}</p>
            {metadata?.longName && metadata.longName !== position.title && (
              <p className="mt-1 text-sm text-zinc-500">{metadata.longName}</p>
            )}
          </div>
          {position.stale && (
            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200">
              Price may be stale
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current value"
          value={formatEur(position.valueEur)}
          className="border-accent/20 bg-zinc-900"
        />
        <MetricCard
          label="Your gain / loss"
          value={`${plPrefix}${formatEur(position.plEur)}`}
          valueClassName={plColor}
        />
        <MetricCard
          label="Your return"
          value={`${plPrefix}${formatPct(position.plPct)}`}
          valueClassName={plColor}
        />
        <MetricCard
          label="Portfolio weight"
          value={`${formatNumber(position.weightPct, 1)}%`}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option.id}
              href={`/instruments/${encodeURIComponent(symbol)}?range=${option.id}`}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                range === option.id
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
        <InstrumentValueChart
          data={priceHistory}
          loadValueEur={loadValueEur}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-medium text-zinc-100">Your position</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Shares</dt>
              <dd className="mt-1 font-mono tabular-nums text-zinc-100">
                {formatNumber(shares, 2)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Load value</dt>
              <dd className="mt-1 font-mono tabular-nums text-zinc-100">
                {formatEur(loadValueEur)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Avg cost</dt>
              <dd className="mt-1 font-mono tabular-nums text-zinc-100">
                {formatEur(avgCostEur)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Current price</dt>
              <dd className="mt-1 font-mono tabular-nums text-zinc-100">
                {formatEur(position.priceEur)}
                {position.priceUsd > 0 && (
                  <span className="ml-2 text-xs text-zinc-500">
                    ({formatUsd(position.priceUsd)})
                  </span>
                )}
              </dd>
            </div>
            {periodReturn != null && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">
                  Price change (period)
                </dt>
                <dd
                  className={`mt-1 font-mono tabular-nums ${
                    periodPositive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {periodPositive ? "+" : ""}
                  {formatPct(periodReturn)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Status</dt>
              <dd className="mt-1 text-sm text-zinc-300">
                {position.stale ? "Stale quote" : "Live quote"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-medium text-zinc-100">Market data</h2>
          {metadata ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetadataRow label="Exchange" value={metadata.exchange} />
              <MetadataRow label="Currency" value={metadata.currency} />
              <MetadataRow
                label="52-week high"
                value={
                  metadata.fiftyTwoWeekHigh != null
                    ? formatNumber(metadata.fiftyTwoWeekHigh, 2)
                    : null
                }
              />
              <MetadataRow
                label="52-week low"
                value={
                  metadata.fiftyTwoWeekLow != null
                    ? formatNumber(metadata.fiftyTwoWeekLow, 2)
                    : null
                }
              />
              <MetadataRow label="Fund category" value={metadata.category} />
              <MetadataRow label="Fund family" value={metadata.fundFamily} />
              <MetadataRow
                label="Expense ratio"
                value={
                  metadata.expenseRatio != null
                    ? formatPct(metadata.expenseRatio)
                    : null
                }
              />
              <MetadataRow
                label="Dividend yield"
                value={
                  metadata.dividendYield != null
                    ? formatPct(metadata.dividendYield)
                    : null
                }
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">
              Extra market metadata is not available for this instrument.
            </p>
          )}
        </section>
      </div>

      {flows.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-100">Capital flows</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Shares Δ</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((flow) => {
                  const positive = flow.amountEur >= 0;
                  return (
                    <tr
                      key={flow.id}
                      className="border-b border-zinc-800/60 even:bg-zinc-900/50"
                    >
                      <td className="px-4 py-2.5 text-zinc-300">{flow.date}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                          positive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {formatEur(flow.amountEur)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-300">
                        {flow.sharesDelta != null
                          ? formatNumber(flow.sharesDelta, 2)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
