"use client";

import { PortfolioAreaChart } from "@/components/charts/PortfolioAreaChart";
import { ReturnsSummary } from "@/components/ReturnsSummary";

type TodaySummary = {
  date: string;
  startValueEur: number | null;
  endValueEur: number | null;
  returnEur: number | null;
  returnPct: number | null;
  inProgress: boolean;
};

type Props = {
  today: TodaySummary;
  chart: { date: string; totalValueEur: number }[];
};

export function ReturnsOverview({ today, chart }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_min(100%,360px)] xl:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
      <ReturnsSummary {...today} />
      <PortfolioAreaChart data={chart} compact title="Portfolio value" />
    </div>
  );
}
