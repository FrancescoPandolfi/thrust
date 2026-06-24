"use client";

import { MetricCard } from "@/components/MetricCard";
import { formatEur, formatPct } from "@/lib/format";

type Props = {
  totalValueEur: number;
  totalPlEur: number;
  totalPlPct: number;
  cashValueEur?: number;
  includeCashMetric?: boolean;
  includeTodayReturn?: boolean;
  todayReturnEur?: number | null;
  todayReturnPct?: number | null;
};

export function PortfolioMetrics({
  totalValueEur,
  totalPlEur,
  totalPlPct,
  cashValueEur,
  includeCashMetric = true,
  includeTodayReturn = false,
  todayReturnEur = null,
  todayReturnPct = null,
}: Props) {
  const plColor = totalPlEur >= 0 ? "text-emerald-400" : "text-rose-400";
  const plPrefix = totalPlEur >= 0 ? "+" : "";
  const plPctPrefix = totalPlPct >= 0 ? "+" : "";
  const todayColor =
    todayReturnEur != null && todayReturnEur >= 0
      ? "text-emerald-400"
      : "text-rose-400";
  const todayPrefix = todayReturnEur != null && todayReturnEur >= 0 ? "+" : "";
  const todayPctPrefix =
    todayReturnPct != null && todayReturnPct >= 0 ? "+" : "";
  const todayValue =
    todayReturnEur != null
      ? `${todayPrefix}${formatEur(todayReturnEur)}${
          todayReturnPct != null
            ? ` (${todayPctPrefix}${formatPct(todayReturnPct)})`
            : ""
        }`
      : "—";
  const fourthMetric = {
    label: "Cash",
    value: formatEur(cashValueEur ?? 0),
  };

  if (includeTodayReturn) {
    return (
      <div className="grid h-[250px] grid-cols-2 grid-rows-2 gap-3">
        <MetricCard
          className="flex flex-col justify-center"
          label="Total portfolio"
          value={formatEur(totalValueEur)}
        />
        <MetricCard
          className="flex flex-col justify-center"
          label="Today's return"
          value={todayValue}
          valueClassName={todayReturnEur != null ? todayColor : "text-zinc-100"}
        />
        <MetricCard
          className="flex flex-col justify-center"
          label="Total P/L"
          value={`${plPrefix}${formatEur(totalPlEur)}`}
          valueClassName={plColor}
        />
        <MetricCard
          className="flex flex-col justify-center"
          label="Total P/L %"
          value={`${plPctPrefix}${formatPct(totalPlPct)}`}
          valueClassName={plColor}
        />
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 ${
        includeCashMetric
          ? "h-[250px] grid-cols-2 grid-rows-2"
          : "grid-cols-1 sm:grid-cols-3"
      }`}
    >
      <MetricCard
        className="flex flex-col justify-center"
        label="Total portfolio"
        value={formatEur(totalValueEur)}
      />
      <MetricCard
        className="flex flex-col justify-center"
        label="Total P/L"
        value={`${plPrefix}${formatEur(totalPlEur)}`}
        valueClassName={plColor}
      />
      <MetricCard
        className="flex flex-col justify-center"
        label="Total P/L %"
        value={`${plPctPrefix}${formatPct(totalPlPct)}`}
        valueClassName={plColor}
      />
      {includeCashMetric && (
        <MetricCard
          className="flex flex-col justify-center"
          label={fourthMetric.label}
          value={fourthMetric.value}
        />
      )}
    </div>
  );
}
