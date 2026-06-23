"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@tremor/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { PortfolioAreaChart } from "@/components/charts/PortfolioAreaChart";
import { ReturnsBarChart } from "@/components/charts/ReturnsBarChart";
import { ReturnsSummary } from "@/components/ReturnsSummary";
import { ReturnsTable } from "@/components/ReturnsTable";
import type {
  ChartPoint,
  DailyReturnRow,
  WeeklyReturnRow,
} from "@/lib/returns";

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

export function ReturnsPageClient({ today, daily, weekly, chart }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(0);

  const currentRange = searchParams.get("range") ?? "3M";

  const setRange = useCallback(
    (label: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", label);
      router.push(`/returns?${params.toString()}`);
    },
    [router, searchParams],
  );

  const dailyChartData = daily.map((d) => ({
    date: d.date,
    returnPct: d.returnPct,
  }));

  const weeklyChartData = weekly.map((w) => ({
    week: w.week,
    returnPct: w.returnPct,
  }));

  return (
    <div className="space-y-6">
      <ReturnsSummary {...today} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-400">Range:</span>
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(r.label)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              currentRange === r.label
                ? "bg-zinc-800 text-blue-400"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <TabGroup index={tab} onIndexChange={setTab}>
        <TabList>
          <Tab>Daily</Tab>
          <Tab>Weekly</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ReturnsBarChart
                data={dailyChartData}
                indexKey="date"
                title="Daily returns %"
              />
              <PortfolioAreaChart data={chart} />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <ReturnsBarChart
                data={weeklyChartData}
                indexKey="week"
                title="Weekly returns %"
              />
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">History</h2>
        <ReturnsTable rows={daily} />
      </div>
    </div>
  );
}
