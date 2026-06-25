"use client";

import { MetricCard } from "@/components/MetricCard";
import { formatDate, formatEur, formatPct } from "@/lib/format";

type Props = {
  date: string;
  startValueEur: number | null;
  endValueEur: number | null;
  returnEur: number | null;
  returnPct: number | null;
  inProgress: boolean;
};

export function ReturnsSummary({
  date,
  startValueEur,
  endValueEur,
  returnEur,
  returnPct,
  inProgress,
}: Props) {
  const plColor =
    returnEur != null && returnEur >= 0 ? "text-emerald-400" : "text-rose-400";
  const plPrefix = returnEur != null && returnEur >= 0 ? "+" : "";
  const pctPrefix = returnPct != null && returnPct >= 0 ? "+" : "";

  const returnValue =
    returnEur != null
      ? `${plPrefix}${formatEur(returnEur)}${
          returnPct != null ? ` (${pctPrefix}${formatPct(returnPct)})` : ""
        }`
      : "—";

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard
        label="Date"
        value={formatDate(date)}
        hint={inProgress ? "Day in progress" : undefined}
      />
      <MetricCard
        label="Start value (previous day)"
        value={startValueEur != null ? formatEur(startValueEur) : "—"}
      />
      <MetricCard
        label={inProgress ? "Current value" : "End value"}
        value={endValueEur != null ? formatEur(endValueEur) : "—"}
      />
      <MetricCard
        label="Today's return"
        value={returnValue}
        valueClassName={returnEur != null ? plColor : "text-zinc-100"}
      />
    </div>
  );
}
