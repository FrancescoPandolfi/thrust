"use client";

import { BarChart, Card, Title } from "@tremor/react";

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
        valueFormatter={(v) => `${(v * 100).toFixed(2)}%`}
        yAxisWidth={56}
      />
    </Card>
  );
}
