"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useNavigationProgress } from "@/components/NavigationProgress";
import { ReturnsBarChart } from "@/components/charts/ReturnsBarChart";
import { ReturnsOverview } from "@/components/ReturnsOverview";
import { ReturnsTable } from "@/components/ReturnsTable";
import type {
  ChartPoint,
  DailyReturnRow,
  WeeklyReturnRow,
} from "@/lib/returns";
import { formatDate } from "@/lib/format";

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
  daily: DailyReturnRow[];
  weekly: WeeklyReturnRow[];
  chart: ChartPoint[];
};

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: null },
] as const;

type Period = "daily" | "weekly";

export function ReturnsPageClient({ today, daily, weekly, chart }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { start } = useNavigationProgress();
  const [period, setPeriod] = useState<Period>("daily");

  const currentRange = searchParams.get("range") ?? "3M";

  const setRange = useCallback(
    (label: string) => {
      start();
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", label);
      router.push(`/returns?${params.toString()}`);
    },
    [router, searchParams, start],
  );

  const dailyChartData = daily.map((d) => ({
    date: formatDate(d.date),
    returnPct: d.returnPct,
  }));

  const weeklyChartData = weekly.map((w) => ({
    week: formatDate(w.week),
    returnPct: w.returnPct,
  }));

  const chartData = chart.map((c) => ({
    date: formatDate(c.date),
    totalValueEur: c.totalValueEur,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">Returns</h1>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {RANGES.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setRange(range.label)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                currentRange === range.label
                  ? "bg-zinc-800 text-accent"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <ReturnsOverview today={today} chart={chartData} />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() => setPeriod("daily")}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === "daily"
                  ? "bg-zinc-800 text-accent"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setPeriod("weekly")}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === "weekly"
                  ? "bg-zinc-800 text-accent"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {period === "daily" ? (
          <ReturnsBarChart
            data={dailyChartData}
            indexKey="date"
            title="Daily returns %"
          />
        ) : (
          <ReturnsBarChart
            data={weeklyChartData}
            indexKey="week"
            title="Weekly returns %"
          />
        )}
      </section>

      <section>
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-200">History</h2>
          </div>
          <ReturnsTable rows={daily} embedded />
        </div>
      </section>
    </div>
  );
}
