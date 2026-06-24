"use client";

import { BarChart, Card, Title } from "@tremor/react";
import { formatPct } from "@/lib/format";

type Props = {
  data: { date: string; returnPct: number }[] | { week: string; returnPct: number }[];
  indexKey: "date" | "week";
  title: string;
};

export function ReturnsBarChart({ data, indexKey, title }: Props) {
  return (
    <Card>
      <Title>{title}</Title>
      <BarChart
        className="mt-4 h-72"
        data={data}
        index={indexKey}
        categories={["returnPct"]}
        colors={["emerald"]}
        valueFormatter={(v) => formatPct(v)}
        yAxisWidth={56}
      />
    </Card>
  );
}
