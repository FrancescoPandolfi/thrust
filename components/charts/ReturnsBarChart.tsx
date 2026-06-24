"use client";

import { BarChart } from "@tremor/react";
import { formatPct } from "@/lib/format";

type Props = {
  data:
    | { date: string; returnPct: number }[]
    | { week: string; returnPct: number }[];
  indexKey: "date" | "week";
  title: string;
};

export function ReturnsBarChart({ data, indexKey, title }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      <BarChart
        className="mt-4 h-64"
        data={data}
        index={indexKey}
        categories={["returnPct"]}
        colors={["emerald"]}
        valueFormatter={(v) => formatPct(v)}
        yAxisWidth={56}
        showAnimation={false}
      />
    </div>
  );
}
