"use client";

import { AreaChart, Card, Title } from "@tremor/react";
import { formatEur } from "@/lib/format";

type Props = {
  data: { date: string; totalValueEur: number }[];
};

export function PortfolioAreaChart({ data }: Props) {
  return (
    <Card>
      <Title>Portfolio value over time</Title>
      <AreaChart
        className="mt-4 h-72"
        data={data}
        index="date"
        categories={["totalValueEur"]}
        colors={["blue"]}
        valueFormatter={(v) => formatEur(v)}
        yAxisWidth={80}
      />
    </Card>
  );
}
