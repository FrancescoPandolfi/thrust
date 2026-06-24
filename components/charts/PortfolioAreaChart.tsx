"use client";

import { AreaChart } from "@tremor/react";
import { formatEur } from "@/lib/format";

type Props = {
  data: { date: string; totalValueEur: number }[];
  compact?: boolean;
  title?: string;
};

export function PortfolioAreaChart({
  data,
  compact = false,
  title = "Portfolio value over time",
}: Props) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 ${
        compact ? "flex h-full flex-col p-4" : "p-4"
      }`}
    >
      <h2
        className={
          compact
            ? "text-xs font-medium uppercase tracking-wide text-zinc-400"
            : "text-sm font-medium text-zinc-100"
        }
      >
        {title}
      </h2>
      <div className={compact ? "mt-3 min-h-0 flex-1" : "mt-4"}>
        <AreaChart
          className={compact ? "h-full min-h-[10rem]" : "h-72"}
          data={data}
          index="date"
          categories={["totalValueEur"]}
          colors={["#DFFF00"]}
          valueFormatter={(v) => formatEur(v)}
          yAxisWidth={compact ? 64 : 80}
          showAnimation={false}
        />
      </div>
    </div>
  );
}
